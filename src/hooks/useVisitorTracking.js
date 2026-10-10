import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { endVisitorSession, heartbeatVisitorSession, identifyVisitor, startVisitorSession, trackVisitorEvent } from "../api";

function startPageTracking(path) {
  trackVisitorEvent("page_view", path, { title: document.title });

  const reportedDepths = new Set();
  const reportScrollDepth = () => {
    const documentHeight = document.documentElement.scrollHeight;
    if (!documentHeight) return;
    const depth = Math.round(((window.scrollY + window.innerHeight) / documentHeight) * 100);
    [50, 75, 100].forEach((threshold) => {
      if (depth >= threshold && !reportedDepths.has(threshold)) {
        reportedDepths.add(threshold);
        trackVisitorEvent(`scroll_depth_${threshold}`, path, { depth: threshold });
      }
    });
  };

  let activeSeconds = 0;
  const reportedDurations = new Set();
  const durationTimer = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    activeSeconds += 5;
    [30, 60].forEach((threshold) => {
      if (activeSeconds >= threshold && !reportedDurations.has(threshold)) {
        reportedDurations.add(threshold);
        trackVisitorEvent(`time_on_page_${threshold}s`, path, { duration_seconds: threshold });
      }
    });
  }, 5000);

  window.addEventListener("scroll", reportScrollDepth, { passive: true });
  return () => {
    window.clearInterval(durationTimer);
    window.removeEventListener("scroll", reportScrollDepth);
  };
}

export default function useVisitorTracking({ customerId = "", ready = false } = {}) {
  const location = useLocation();
  const bootstrapRef = useRef(false);
  const sessionRef = useRef(false);
  const pageCleanupRef = useRef(null);
  const customerIdRef = useRef(customerId);
  const identifiedCustomerRef = useRef("");
  customerIdRef.current = customerId;

  useEffect(() => {
    if (!ready || bootstrapRef.current) return;
    bootstrapRef.current = true;
    let active = true;
    (async () => {
      const initialCustomerId = customerIdRef.current;
      identifiedCustomerRef.current = initialCustomerId;
      await identifyVisitor(initialCustomerId);
      if (!active) return;
      const session = await startVisitorSession(window.location.pathname);
      if (active && session) {
        sessionRef.current = true;
        trackVisitorEvent("session_started", window.location.pathname);
        heartbeatVisitorSession(window.location.pathname, 1);
        pageCleanupRef.current = startPageTracking(window.location.pathname);
        const latestCustomerId = customerIdRef.current;
        if (latestCustomerId && latestCustomerId !== identifiedCustomerRef.current) {
          identifiedCustomerRef.current = latestCustomerId;
          await identifyVisitor(latestCustomerId);
        }
      }
    })();
    const heartbeat = window.setInterval(() => { if (sessionRef.current) heartbeatVisitorSession(window.location.pathname, 0); }, 30000);
    const onVisibility = () => { if (document.visibilityState === "visible" && sessionRef.current) heartbeatVisitorSession(window.location.pathname, 0); };
    const onUnload = () => { if (sessionRef.current) endVisitorSession(window.location.pathname); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      active = false;
      window.clearInterval(heartbeat);
      pageCleanupRef.current?.();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !sessionRef.current || !customerId || customerId === identifiedCustomerRef.current) return;
    identifiedCustomerRef.current = customerId;
    identifyVisitor(customerId);
  }, [customerId, ready]);

  useEffect(() => {
    if (sessionRef.current) {
      pageCleanupRef.current?.();
      heartbeatVisitorSession(location.pathname, 1);
      pageCleanupRef.current = startPageTracking(location.pathname);
    }
  }, [location.pathname]);
}
