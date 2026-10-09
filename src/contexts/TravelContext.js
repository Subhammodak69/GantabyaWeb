import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchMe, getAccessToken, refreshSession, logout, setOnUnauthorized, identifyVisitor, visitorSessionId } from "../api";
import { createNotificationSocket, createVisitorSocket } from "../realtime/socket";

const TravelContext = createContext(null);

export function TravelProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [status, setStatus] = useState("unknown"); // "unknown" | "authenticated" | "anonymous"
  const [isMember, setIsMember] = useState(false);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const authBootstrapRef = useRef(false);
  const realtimeRef = useRef(null);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      setIsMember(false);
      setStatus("anonymous");
    });
  }, []);

  useEffect(() => {
    if (!authReady) return undefined;

    let disposed = false;
    let notificationSocket = null;

    const connectRealtime = async () => {
      const resolvedVisitorId = await identifyVisitor(user?.id || "");
      if (disposed) return;

      const socket = createVisitorSocket({
        customerId: user?.id || "",
        page: window.location.pathname,
      });
      const trackingParams = new URLSearchParams(window.location.search);
      realtimeRef.current = socket;
      socket.on("connect", () => {
        socket.emit("visitor_identify", {
          visitor_id: resolvedVisitorId || undefined,
          session_id: visitorSessionId() || undefined,
          customer_id: user?.id || undefined,
          page: window.location.pathname,
          current_url: window.location.href,
          referrer: document.referrer || undefined,
          utm_source: trackingParams.get("utm_source") || undefined,
          utm_medium: trackingParams.get("utm_medium") || undefined,
          utm_campaign: trackingParams.get("utm_campaign") || undefined,
          utm_term: trackingParams.get("utm_term") || undefined,
          utm_content: trackingParams.get("utm_content") || undefined,
        });
        socket.emit("page_view", {
          path: window.location.pathname,
          current_url: window.location.href,
          session_id: visitorSessionId() || undefined,
        });
        window.dispatchEvent(new CustomEvent("cobtravels:realtime", {
          detail: { status: "connected" },
        }));
      });
      socket.on("disconnect", () => {
        window.dispatchEvent(new CustomEvent("cobtravels:realtime", {
          detail: { status: "disconnected" },
        }));
      });
      socket.on("connect_error", (error) => {
        window.dispatchEvent(new CustomEvent("cobtravels:realtime", {
          detail: { status: "error", error: error?.message || "Realtime connection failed" },
        }));
      });
      socket.onAny((event, payload) => {
        window.dispatchEvent(new CustomEvent("cobtravels:realtime:event", {
          detail: { event, payload },
        }));
      });
      socket.on("notification.created", (payload) => {
        window.dispatchEvent(new CustomEvent("cobtravels:notification", {
          detail: { event: "notification.created", data: payload },
        }));
      });
      socket.connect();

      const token = getAccessToken();
      notificationSocket = createNotificationSocket(token, (message) => {
        window.dispatchEvent(new CustomEvent("cobtravels:notification", { detail: message }));
      });
    };

    connectRealtime();
    return () => {
      disposed = true;
      realtimeRef.current?.disconnect();
      realtimeRef.current = null;
      notificationSocket?.close();
    };
  }, [authReady, user?.id]);

  useEffect(() => {
    const socket = realtimeRef.current;
    if (socket?.connected) {
      socket.emit("page_view", {
        path: location.pathname,
        current_url: window.location.href,
        session_id: visitorSessionId() || undefined,
      });
    }
  }, [location.pathname]);

  const refreshUser = async () => {
    try {
      let token = getAccessToken();
      if (!token) {
        const ok = await refreshSession();
        if (ok) token = getAccessToken();
      }
      if (token) {
        try {
          const r = await fetchMe();
          const userData = r?.data?.user || r?.data || null;
          setUser(userData);
          setIsMember(true);
          setStatus("authenticated");
          return userData;
        } catch {
          setUser(null);
          setIsMember(false);
          setStatus("anonymous");
          return null;
        }
      } else {
        setUser(null);
        setIsMember(false);
        setStatus("anonymous");
        return null;
      }
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    if (authBootstrapRef.current) return;
    authBootstrapRef.current = true;
    refreshUser();
  }, []);

  const loginSuccess = async (authResponse) => {
    const rawUser = authResponse?.data?.user || authResponse?.user || authResponse?.data || null;
    setIsMember(true);
    setStatus("authenticated");
    if (rawUser && (rawUser.name || rawUser.email || rawUser.id)) {
      setUser(rawUser);
    }
    // Fetch full fresh profile
    try {
      const meRes = await fetchMe();
      const userData = meRes?.data?.user || meRes?.data || rawUser;
      if (userData) setUser(userData);
    } catch {
      // Keep existing rawUser if fetchMe fails
    }
  };

  const handleLogout = async (all = false) => {
    try {
      await logout(all);
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setUser(null);
      setIsMember(false);
      setStatus("anonymous");
      navigate("/login");
    }
  };

  const goHome = () => { setSelectedPackageId(null); setSelectedPackage(null); navigate("/"); };
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };
  const goProfile = () => navigate("/profile");

  const selectPackage = (id, packageData = null) => { setSelectedPackageId(id); setSelectedPackage(packageData); navigate(`/${id}`); };
  const returnToJourneys = () => { setSelectedPackageId(null); setSelectedPackage(null); navigate("/"); };

  return (
    <TravelContext.Provider value={{
      goHome, goBack, goProfile,
      selectedPackageId, setSelectedPackageId, selectedPackage, setSelectedPackage, selectPackage, returnToJourneys,
      status, isMember, user, setUser, setIsMember, authReady,
      refreshUser, loginSuccess, handleLogout,
      toggleMember: () => (isMember ? handleLogout() : navigate("/login")),
    }}>
      {children}
    </TravelContext.Provider>
  );
}

export function useTravel() {
  const context = useContext(TravelContext);
  if (!context) throw new Error("useTravel must be used inside TravelProvider");
  return context;
}
