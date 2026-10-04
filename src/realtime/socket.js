import { io } from "socket.io-client";
import { BASE_API, getAccessToken, visitorId, visitorSessionId } from "../api";

const REALTIME_BASE = BASE_API || "https://api.gantabyaa.in";

export function createVisitorSocket({ customerId = "", page = "" } = {}) {
  const query = new URLSearchParams(window.location.search);
  const clientDetails = () => {
    const userAgent = window.navigator.userAgent || "";
    return {
      browser: /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Other",
      os: /Windows/.test(userAgent) ? "Windows" : /Mac OS/.test(userAgent) ? "macOS" : /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : "Other",
      device: /Mobi|Android|iPhone|iPad/.test(userAgent) ? "mobile" : "desktop",
    };
  };
  const details = clientDetails();
  const socket = io(REALTIME_BASE, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    auth: {
      token: getAccessToken() || undefined,
      visitor_id: visitorId() || undefined,
      session_id: visitorSessionId() || undefined,
      customer_id: customerId || undefined,
      current_url: page || window.location.pathname,
      referrer: document.referrer || undefined,
      utm_source: query.get("utm_source") || undefined,
      utm_medium: query.get("utm_medium") || undefined,
      utm_campaign: query.get("utm_campaign") || undefined,
      utm_term: query.get("utm_term") || undefined,
      utm_content: query.get("utm_content") || undefined,
      ...details,
    },
  });

  return socket;
}

export function createNotificationSocket(token, onMessage) {
  if (!token || typeof WebSocket === "undefined") return null;

  const base = REALTIME_BASE.replace(/^http/, "ws");
  const socket = new WebSocket(`${base}/api/v1/notifications/ws?token=${encodeURIComponent(token)}`);

  socket.onmessage = (event) => {
    try {
      onMessage?.(JSON.parse(event.data));
    } catch {
      // Ignore malformed messages so one server event cannot break the app.
    }
  };

  return socket;
}
