export const BASE_API = "https://api.gantabyaa.in";
const VISITOR = "@cobtravels/visitor_id";
const VISITOR_SERVER_ID = "@cobtravels/visitor_server_id";
const VISITOR_SESSION_ID = "@cobtravels/visitor_session_id";
const REFRESH_TOKEN = "@cobtravels/refresh_token";
const REFERRAL_CODE = "@cobtravels/referral_code";
const storage = window.localStorage;

let accessToken = null;
let refreshPromise = null;
let onUnauthorizedCallback = null;

export function setOnUnauthorized(cb) {
  onUnauthorizedCallback = cb;
}

export function getAccessToken() {
  return accessToken;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isValidUUID(str) {
  return typeof str === "string" && UUID_REGEX.test(str.trim());
}

function referralCode() { return storage.getItem(REFERRAL_CODE) || ""; }
function toBase64Url(value) { return btoa(unescape(encodeURIComponent(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function fromBase64Url(value) { return decodeURIComponent(escape(atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4)))); }

export function encodeReferralCode(code) { return toBase64Url(code); }

export function decodeReferralToken(token) {
  if (!token || typeof token !== "string") return "";
  const cleaned = token.trim();
  try {
    const raw = fromBase64Url(cleaned).trim();
    if (raw) return raw;
  } catch {}
  try {
    const decoded = atob(cleaned.replace(/-/g, "+").replace(/_/g, "/")).trim();
    if (decoded) return decoded;
  } catch {}
  return cleaned;
}

export function getReferralLink(code) { 
  return `${window.location.origin}/invite?r=${encodeURIComponent(toBase64Url(code))}`; 
}

export function getReferralShareMessage(code) {
  return `Join me on Gantabyaa and plan your next journey: ${getReferralLink(code)}`;
}

export function getStoredReferralCode() { return referralCode(); }

export function clearReferralCode() {
  storage.removeItem(REFERRAL_CODE);
}

export async function validateInviteToken(tokenOrCode) {
  if (!tokenOrCode) {
    throw new Error("No referral code provided.");
  }
  const code = decodeReferralToken(tokenOrCode);
  if (!code || code.length > 128) {
    throw new Error("Invalid referral code format.");
  }
  const response = await request(`/api/v1/referrals/invite/${encodeURIComponent(code)}`);
  if (response?.success !== false && response?.data?.referral_code) {
    storage.setItem(REFERRAL_CODE, response.data.referral_code);
    return response.data;
  }
  throw new Error(response?.message || "Invalid or expired referral code.");
}

export async function captureReferralFromUrl(value) {
  if (!value) return null;
  try {
    return await validateInviteToken(value);
  } catch {}
  return null;
}

export function clearTokens() {
  accessToken = null;
  storage.removeItem(REFRESH_TOKEN);
}

const VISITOR_COOKIE = "gantabyaa_visitor_id";

function cookieVisitorId() {
  const entry = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${VISITOR_COOKIE}=`));
  let id = entry ? entry.slice(VISITOR_COOKIE.length + 1) : "";
  try {
    id = decodeURIComponent(id);
  } catch {
    return "";
  }
  return isValidUUID(id) ? id : "";
}

function persistVisitorId(id) {
  if (!isValidUUID(id)) return;
  storage.setItem(VISITOR_SERVER_ID, id);
  document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(id)}; Max-Age=31536000; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
}

export function visitorId() {
  const cookieId = cookieVisitorId();
  if (cookieId) {
    if (storage.getItem(VISITOR_SERVER_ID) !== cookieId) storage.setItem(VISITOR_SERVER_ID, cookieId);
    return cookieId;
  }
  const serverId = storage.getItem(VISITOR_SERVER_ID);
  if (serverId && isValidUUID(serverId)) {
    persistVisitorId(serverId);
    return serverId;
  }
  const stored = storage.getItem(VISITOR);
  if (stored && isValidUUID(stored)) return stored;
  return "";
}

export function visitorSessionId() {
  return storage.getItem(VISITOR_SESSION_ID) || "";
}

async function authVisitorId() {
  let id = cookieVisitorId() || storage.getItem(VISITOR_SERVER_ID);
  if (!id || !isValidUUID(id)) id = await identifyVisitor();
  return (id && isValidUUID(id)) ? id : "";
}


function extractToken(x) {
  return (
    x?.data?.access_token ||
    x?.access_token ||
    x?.data?.token ||
    x?.token ||
    x?.data?.accessToken ||
    x?.accessToken ||
    null
  );
}

function extractRefreshToken(x) {
  return (
    x?.data?.refresh_token ||
    x?.refresh_token ||
    x?.data?.refreshToken ||
    x?.refreshToken ||
    null
  );
}

export function saveTokens(x) {
  const token = extractToken(x);
  const refreshToken = extractRefreshToken(x);
  if (token) {
    accessToken = token;
  }
  if (refreshToken) {
    storage.setItem(REFRESH_TOKEN, refreshToken);
  }
  return { access: accessToken, refresh: refreshToken };
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = storage.getItem(REFRESH_TOKEN);
    refreshPromise = fetch(`${BASE_API}/api/v1/sessions/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken || "" }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.message || "AUTH_SESSION_INVALID");
        }
        const token = extractToken(body);
        if (!token) {
          throw new Error(body.message || "AUTH_TOKEN_MISSING");
        }
        accessToken = token;
        const nextRefreshToken = extractRefreshToken(body);
        if (nextRefreshToken) {
          storage.setItem(REFRESH_TOKEN, nextRefreshToken);
        }
        return token;
      })
      .catch((err) => {
        clearTokens();
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function refreshSession() {
  try {
    const token = await refreshAccessToken();
    return Boolean(token);
  } catch {
    return false;
  }
}

async function requestWithRetry(path, options = {}, isRetry = false) {
  const isAuthSessionReq =
    path.includes("/sessions/refresh") ||
    path.includes("/sessions/logout") ||
    path.includes("/auth/otp") ||
    path.includes("/auth/google");
  const isPublicReferralReq = path.includes("/referrals/invite/");

  const isFormData = options.body instanceof FormData;
  let res = await fetch(BASE_API + path, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  // Handle 401 unauthorized once with single serialized refresh promise
  if (res.status === 401 && !isAuthSessionReq && !isPublicReferralReq && !isRetry) {
    try {
      await refreshAccessToken();
      return await requestWithRetry(path, options, true);
    } catch {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Unauthorized");
    }
  }

  if (res.status === 401 && !isAuthSessionReq && isRetry) {
    clearTokens();
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `Request failed (${res.status})`);
  return body;
}

function request(path, options = {}) {
  return requestWithRetry(path, options);
}

export async function requestOtp(identifier, purpose = "LOGIN") {
  return request("/api/v1/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ identifier, purpose, visitor_id: await authVisitorId() }),
  });
}

export async function verifyOtp(identifier, otp, name = "", purpose = "LOGIN") {
  const code = purpose === "SIGNUP" ? referralCode() : "";
  const r = await request("/api/v1/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({
      identifier,
      otp,
      name,
      purpose,
      visitor_id: await authVisitorId(),
      ...(code ? { referral_code: code } : {}),
    }),
  });
  saveTokens(r);
  if (code) clearReferralCode();
  return r;
}

export async function loginGoogle(id_token) {
  const code = referralCode();
  const r = await request("/api/v1/auth/google", {
    method: "POST",
    body: JSON.stringify({
      id_token,
      visitor_id: await authVisitorId(),
      ...(code ? { referral_code: code } : {}),
    }),
  });
  saveTokens(r);
  if (code) clearReferralCode();
  return r;
}

export async function logout(all = false) {
  const endpoint = `/api/v1/sessions/${all ? "logout-all" : "logout"}`;
  try {
    await fetch(BASE_API + endpoint, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
  } catch (err) {
    console.warn("Logout request error:", err);
  } finally {
    clearTokens();
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }
}
export function fetchMe(){return request("/api/v1/auth/me",{},true);}
export function updateMe(data){return request("/api/v1/account/me",{method:"PATCH",body:JSON.stringify(data)},true);}
export async function deleteAccount({ identifier, otp, name = "", purpose = "LOGIN", visitor_id = "", referral_code = "" } = {}) {
  const visitorId = visitor_id || await authVisitorId();
  return request("/api/v1/account/me", {
    method: "DELETE",
    body: JSON.stringify({ identifier, otp, name, purpose, ...(visitorId ? { visitor_id: visitorId } : {}), referral_code }),
  }, true);
}
export function fetchSessions(){return request("/api/v1/sessions/",{},true);}
export function deleteSession(id){return request(`/api/v1/sessions/${encodeURIComponent(id)}`,{method:"DELETE"},true);}
export function fetchEnums(group = "", search = "") {
  const query = new URLSearchParams();
  if (group) query.set("group", group);
  if (search) query.set("search", search);
  return request(`/api/v1/enums${query.toString() ? `?${query.toString()}` : ""}`, {}, true);
}
export function fetchNotifications(limit = 50) { return request(`/api/v1/notifications?limit=${limit}`, {}, true); }
export function markNotificationRead(id) { return request(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" }, true); }
export function markAllNotificationsRead() { return request("/api/v1/notifications/read-all", { method: "POST" }, true); }
export async function fetchInvoices(page = 1, pageSize = 100) {
  const response = await request(`/api/v1/transactions?page=${page}&page_size=${pageSize}`, {}, true);
  const data = response?.data;
  const transactions = Array.isArray(data)
    ? data
    : data?.items || data?.results || response?.items || response?.results || [];
  return transactions.map((transaction) => ({
    ...transaction,
    id: transaction.id,
    invoice_code: transaction.reference || transaction.booking_code || transaction.id,
    destination: transaction.description || "Travel booking",
    amount: Number(transaction.amount || 0),
    currency: transaction.currency || "INR",
    booking_date: transaction.created_at || transaction.transaction_date || undefined,
    travel_date: transaction.transaction_date || undefined,
    status: transaction.status || "PENDING",
  }));
}
export function fetchDocuments(page = 1, pageSize = 50) { return request(`/api/v1/documents?page=${page}&page_size=${pageSize}`, {}, true); }
export function fetchBookingDocuments(bookingId, page = 1, pageSize = 100) {
  const query = new URLSearchParams({
    booking_id: String(bookingId),
    page: String(page),
    page_size: String(pageSize),
  });
  return request(`/api/v1/documents/booking?${query.toString()}`, {}, true);
}
export async function uploadDocument({ file, fileUrl, documentType, title, description }) {
  let uploadedUrl = fileUrl;
  if (!uploadedUrl && file) {
    const uploaded = await uploadFile(file);
    uploadedUrl = uploaded?.data?.url || uploaded?.url;
  }
  if (!uploadedUrl) throw new Error("Please choose a file to upload");
  return request("/api/v1/documents", {
    method: "POST",
    body: JSON.stringify({
      file: uploadedUrl,
      file_name: file?.name || "document",
      document_type: documentType || "OTHER",
      title: title || file?.name || "Document",
      description: description || null,
    }),
  }, true);
}
export async function fetchDocumentFile(fileUrl, { fileName = "document", mimeType = "" } = {}) {
  if (!fileUrl) throw new Error("Document view link unavailable.");
  const isExternalUrl = /^https?:\/\//i.test(fileUrl);
  const targetUrl = isExternalUrl ? fileUrl : `${BASE_API}${fileUrl}`;

  const fetchFile = () => fetch(
    targetUrl,
    {
      // Cloudinary is a public third-party asset host. Sending credentials or
      // our API bearer token makes the browser's CORS preflight fail.
      credentials: isExternalUrl ? "omit" : "include",
      headers: {
        Accept: "application/octet-stream",
        ...(!isExternalUrl && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    }
  );

  let fileResponse = await fetchFile();
  if (fileResponse.status === 401) {
    await refreshAccessToken();
    fileResponse = await fetchFile();
  }
  if (!fileResponse.ok) {
    const body = await fileResponse.json().catch(() => ({}));
    throw new Error(body.message || `Download failed (${fileResponse.status})`);
  }

  return {
    blob: await fileResponse.blob(),
    fileName,
    mimeType: fileResponse.headers.get("content-type") || mimeType || "application/octet-stream",
  };
}
export async function downloadDocumentFile(id, { fileName = "document", mimeType = "" } = {}) {
  return fetchDocumentFile(`/api/v1/documents/${encodeURIComponent(id)}/download`, {
    fileName,
    mimeType,
  });
}
export function deleteDocument(id) { return request(`/api/v1/documents/${encodeURIComponent(id)}`, { method: "DELETE" }, true); }
export function fetchReferralCode() { return request("/api/v1/referrals/code", {}, true); }
export function fetchReferrals(page = 1, pageSize = 20) { return request(`/api/v1/referrals?page=${page}&page_size=${pageSize}`, {}, true); }
export function fetchWishlist(page = 1, pageSize = 50, filters = {}) {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return request(`/api/v1/wishlist?${query.toString()}`, {}, true);
}
export async function addToWishlist(packageSlug) {
  const result = await request(`/api/v1/wishlist/${encodeURIComponent(packageSlug)}`, { method: "POST" }, true);
  trackVisitorEvent("wishlist_add", window.location.pathname, { package_id: packageSlug });
  return result;
}
export function removeFromWishlist(packageSlug) { return request(`/api/v1/wishlist/${encodeURIComponent(packageSlug)}`, { method: "DELETE" }, true); }
export async function uploadFile(file){
  if(!file) throw new Error("Please choose a file to upload");
  const token=getAccessToken();
  const form=new FormData();
  form.append("file",file);
  const res=await fetch(`${BASE_API}/api/v1/public/files/upload`,{method:"POST",body:form,credentials:"include",headers:{Accept:"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}});
  const body=await res.json().catch(()=>({}));
  if(!res.ok||body?.success===false) throw new Error(body.message||`File upload failed (${res.status})`);
  return body;
}
function clientFingerprint(){let value=storage.getItem("@cobtravels/fingerprint");if(!value){value=`web-${Date.now()}-${Math.random().toString(36).slice(2,14)}`;storage.setItem("@cobtravels/fingerprint",value)}return value;}
function clientDetails(){const ua=navigator.userAgent||"";const browser=/Edg\//.test(ua)?"Edge":/Chrome\//.test(ua)?"Chrome":/Firefox\//.test(ua)?"Firefox":/Safari\//.test(ua)?"Safari":"Other";const os=/Windows/.test(ua)?"Windows":/Mac OS/.test(ua)?"macOS":/Android/.test(ua)?"Android":/iPhone|iPad/.test(ua)?"iOS":"Other";return {browser,os,device:/Mobi|Android|iPhone|iPad/.test(ua)?"mobile":"desktop"};}
export async function identifyVisitor(customerId = "") {
  const existingId = cookieVisitorId() || storage.getItem(VISITOR_SERVER_ID);
  const details = clientDetails();
  const payload = {
    fingerprint: clientFingerprint(),
    ip_address: "",
    country: "",
    state: "",
    city: "",
    browser: details.browser,
    os: details.os,
    device: details.device,
  };
  if (customerId) payload.customer_id = customerId;

  try {
    const response = await request("/api/v1/visitors/identify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const id = response?.data?.id || response?.data?.visitor?.id || response?.data?.visitor?.visitor_id || response?.data?.visitor_id;
    if (id && isValidUUID(id)) {
      persistVisitorId(id);
      return id;
    }
  } catch {}

  return existingId && isValidUUID(existingId) ? existingId : visitorId() || null;
}
export async function startVisitorSession(landingPage=window.location.pathname){const visitor=visitorId();if(!visitor)return null;try{const r=await request("/api/v1/visitors/sessions/start",{method:"POST",body:JSON.stringify({visitor_id:visitor,landing_page:landingPage,referrer:document.referrer||"",utm_source:"",utm_medium:"",utm_campaign:"",utm_term:""})});const id=r?.data?.id;if(id)storage.setItem(VISITOR_SESSION_ID,id);return id||null;}catch{return null;}}
export async function heartbeatVisitorSession(currentPage=window.location.pathname,pageViewsDelta=1){const id=storage.getItem(VISITOR_SESSION_ID);if(!id)return null;try{const r=await request(`/api/v1/visitors/sessions/${encodeURIComponent(id)}/heartbeat`,{method:"POST",body:JSON.stringify({current_page:currentPage,page_views_delta:pageViewsDelta})});return r?.data||null;}catch{return null;}}
export async function endVisitorSession(exitPage=window.location.pathname){const id=storage.getItem(VISITOR_SESSION_ID);if(!id)return null;storage.removeItem(VISITOR_SESSION_ID);try{const r=await request(`/api/v1/visitors/sessions/${encodeURIComponent(id)}/end`,{method:"POST",body:JSON.stringify({exit_page:exitPage}),keepalive:true});return r?.data||null;}catch{return null;}}
export async function trackVisitorEvent(eventName,page=window.location.pathname,eventMetadata={}){const visitor=visitorId();const session=storage.getItem(VISITOR_SESSION_ID);if(!visitor||!session)return null;try{const r=await request("/api/v1/visitors/events",{method:"POST",body:JSON.stringify({visitor_id:visitor,session_id:session,event_name:eventName,page,event_metadata:eventMetadata}),keepalive:true});return r?.data||null;}catch{return null;}}
export async function trackVisitorEventsBatch(events=[]){if(!events.length)return null;try{const r=await request("/api/v1/visitors/events/batch",{method:"POST",body:JSON.stringify({events}),keepalive:true});return r?.data||null;}catch{return null;}}

function displayText(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join("\n");
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value.items)) return value.items.map(displayText).filter(Boolean).join("\n");
  for (const key of ["text", "title", "name", "label", "description", "value", "city", "place"]) {
    const text = displayText(value[key]);
    if (text) return text;
  }
  return "";
}

function listItems(value) {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.items) ? value.items : [];
}

function variant(v, i = 0) {
  const realId = v.variant_id || v.id;
  const price = v.selling_price ?? v.price ?? v.starting_price ?? v.list_price ?? 0;
  return {
    ...v,
    id: realId || `variant-${i}`,
    variant_id: isValidUUID(realId) ? realId : undefined,
    slug: v.slug || `variant-${i}`,
    name: displayText(v.name || v.season_name),
    season_name: displayText(v.season_name),
    badge: displayText(v.badge),
    cover_image: v.banner?.image || v.cover_image || "",
    duration: `${v.duration_nights || 0}N | ${v.duration_days || 0}D`,
    starting_price: Number(price || 0),
    price: Number(price || 0),
    list_price: v.list_price == null ? null : Number(v.list_price),
    selling_price: v.selling_price == null ? null : Number(v.selling_price),
    dates: listItems(v.departure_dates || v.dates).map((date) => ({ ...date, date: date.departure_date || date.date || "", departure_date: date.departure_date || date.date || "", return_date: date.return_date || "", total_seats: date.total_seats != null ? Number(date.total_seats) : undefined, available_seats: date.available_seats != null ? Number(date.available_seats) : undefined })),
    gallery: listItems(v.gallery).filter((x) => x?.url).map((x) => ({ ...x, url: x.url })),
    route: listItems(v.route).map((stop) => ({ ...stop, city: displayText(stop?.city), place: displayText(stop?.place) || displayText(stop?.city) })),
    highlights: listItems(v.highlights).map((highlight) => typeof highlight === "string" ? highlight : { ...highlight, text: displayText(highlight?.text || highlight?.title || highlight) }),
    itinerary: listItems(v.itinerary).map((day) => ({ ...day, title: displayText(day?.title), description: displayText(day?.description) })),
    inclusions: listItems(v.inclusions).map(displayText).filter(Boolean),
    exclusions: listItems(v.exclusions).map(displayText).filter(Boolean),
    is_default: Boolean(v.is_default ?? i === 0),
  };
}

function summary(x) {
  return {
    ...x,
    package_id: x.id,
    id: x.slug || x.id,
    slug: x.slug || x.id,
    code: x.tour_code,
    title: displayText(x.title),
    description: displayText(x.description),
    is_wishlist: Boolean(x.is_wishlist),
    image: x.banner?.image || "",
    video: x.banner?.video || "",
    season_name: displayText(x.season_name),
    badge: displayText(x.badge),
    destination: displayText(x.destination_name) || displayText(x.destination),
    price: x.selling_price == null ? (x.price == null ? null : Number(x.price)) : Number(x.selling_price),
    duration: displayText(x.duration),
    route: listItems(x.route).map((stop) => ({ ...stop, city: displayText(stop?.city), place: displayText(stop?.place) || displayText(stop?.city) })),
    accent: "#f2c14e",
    default_variant_id: x.default_variant?.id || x.default_variant_id || undefined,
  };
}

export async function fetchPackages(filters = {}) {
  const query = new URLSearchParams();
  if (filters.page == null) query.set("page", "1");
  if (filters.page_size == null) query.set("page_size", "10");
  if (filters.sort_by == null) query.set("sort_by", "created_at");
  if (filters.sort_order == null) query.set("sort_order", "desc");
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const r = await request("/api/v1/tour-packages" + (query.toString() ? "?" + query.toString() : ""));
  const raw = r.data;
  const items = Array.isArray(raw) ? raw : (raw?.items || raw?.results || raw?.packages || []);
  const pageInfo = r.pagination || raw?.pagination || {};
  const total = Number(pageInfo.total_items ?? raw?.total ?? raw?.count ?? items.length);
  const pageSize = Number(pageInfo.page_size ?? filters.page_size ?? 10);
  const page = Number(pageInfo.current_page ?? filters.page ?? 1);
  return {
    items: items.map(summary),
    total,
    page,
    page_size: pageSize,
    pages: Number(pageInfo.total_pages ?? Math.ceil(total / pageSize)) || 1,
    has_next: Boolean(pageInfo.has_next),
    has_previous: Boolean(pageInfo.has_previous),
  };
}

export async function fetchDestinations(page = 1, pageSize = 20) {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const response = await request(`/api/v1/destinations?${query.toString()}`);
  return {
    items: Array.isArray(response.data) ? response.data : [],
    pagination: response.pagination || {},
  };
}

export async function fetchAllDestinations(pageSize = 100) {
  const destinations = [];
  let page = 1;
  while (true) {
    const response = await fetchDestinations(page, pageSize);
    if (!response.items.length) break;
    destinations.push(...response.items);

    const pagination = response.pagination || {};
    const totalPages = Number(pagination.total_pages || 0);
    if (totalPages ? page >= totalPages : pagination.has_next === false || response.items.length < pageSize) break;
    page += 1;
  }
  return destinations;
}

export async function fetchPackageVariants(packageIdOrSlug, page = 1, pageSize = 10) {
  const r = await request(`/api/v1/tour-packages/${encodeURIComponent(packageIdOrSlug)}/variants?page=${page}&page_size=${pageSize}`);
  return {
    items: (Array.isArray(r.data) ? r.data : []).map(variant),
    pagination: r.pagination || {},
  };
}

async function fetchPackageSummaryBySlug(slug) {
  const pageSize = 100;
  let page = 1;

  // The API search filter does not include package slugs, so resolve the
  // route parameter from the unfiltered package list instead.
  while (true) {
    const result = await fetchPackages({ page, page_size: pageSize });
    const match = result.items.find((item) =>
      item.slug === slug || item.id === slug || item.package_id === slug
    );
    if (match) return match;
    if (!result.has_next && page >= result.pages) return null;
    page += 1;
  }
}

export async function fetchHotels(page = 1, pageSize = 20, destinationId = "", category = "") {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (destinationId) query.set("destination_id", destinationId);
  if (category) query.set("category", category);
  return request(`/api/v1/hotels?${query.toString()}`);
}

export async function fetchVehicles(page = 1, pageSize = 20, vehicleType = "", search = "") {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (vehicleType) query.set("vehicle_type", vehicleType);
  if (search) query.set("search", search);
  return request(`/api/v1/vehicles?${query.toString()}`);
}

export async function fetchRulesRegulations(type) {
  const tourType = String(type).toUpperCase() === "DOMESTIC" ? "dom" : "int";
  const query = new URLSearchParams({ type: tourType });
  const response = await request(`/api/v1/rules-regulations?${query.toString()}`);
  return listItems(response?.data)
    .filter((rule) => rule?.is_active !== false)
    .map((rule) => ({
      ...rule,
      rule_title: displayText(rule?.rule_title),
      regulations: Array.isArray(rule?.regulations)
        ? rule.regulations.map(displayText).filter(Boolean)
        : Array.isArray(rule?.regulations?.items)
          ? rule.regulations.items.map(displayText).filter(Boolean)
          : displayText(rule?.regulations),
    }));
}

export async function fetchPackage(slug, summaryData = null) {
  let d;
  if (summaryData?.package_id || summaryData?.id) {
    d = {
      ...summaryData,
      id: summaryData.package_id || summaryData.id,
      package_id: summaryData.package_id || summaryData.id,
      slug: summaryData.slug || slug,
    };
  } else {
    // The end-user API exposes package lists and variant details, not a
    // singular /tour-packages/{slug} endpoint. Resolve the summary by exact
    // slug so a browser reload works without the in-memory package object.
    d = await fetchPackageSummaryBySlug(slug);
  }
  if (!d) throw new Error("Tour package was not found");
  const packageSlug = d.slug || slug;
  const listed = await fetchPackageVariants(packageSlug).catch(() => ({ items: [] }));
  let seasons = listed.items.length
    ? listed.items
    : [d.default_variant, ...(d.other_variants || [])].filter(Boolean).map(variant);
  if (listed.items.length) {
    const defaultVariant = listed.items.find((item) => item.is_default) || listed.items[0];
    const detailedDefault = await fetchVariant(packageSlug, defaultVariant.slug || defaultVariant.id, listed.items).catch(() => null);
    if (detailedDefault) {
      seasons = [detailedDefault, ...listed.items.filter((item) => item.id !== defaultVariant.id)];
    }
  }
  return {
    ...d,
    package_id: d.id,
    id: d.id,
    slug: d.slug,
    is_wishlist: Boolean(d.is_wishlist),
    code: d.tour_code,
    title: displayText(d.title),
    description: displayText(d.description),
    destination: displayText(d.destination_name) || displayText(d.destination),
    image: d.default_variant?.banner?.image || d.banner?.image || d.image || "",
    price: Number(d.default_variant?.selling_price ?? d.default_variant?.price ?? d.price ?? 0),
    duration: d.duration || `${d.default_variant?.duration_nights || 0}N | ${d.default_variant?.duration_days || 0}D`,
    seasons,
    gallery: listItems(d.default_variant?.gallery).filter((x) => x?.url),
    route: listItems(d.default_variant?.route).map((stop) => ({ ...stop, city: displayText(stop?.city), place: displayText(stop?.place) || displayText(stop?.city) })),
    default_variant_id: d.default_variant?.id || undefined,
  };
}

export async function fetchVariant(slug, variantSlug, listedItems = null) {
  const listed = listedItems ? { items: listedItems } : await fetchPackageVariants(slug).catch(() => ({ items: [] }));
  const listedVariant = listed.items.find((item) => item.id === variantSlug || item.slug === variantSlug || item.variant_id === variantSlug);
  const r = await request(`/api/v1/tour-packages/${encodeURIComponent(slug)}/variants/${encodeURIComponent(listedVariant?.slug || variantSlug)}/details`);
  const detail = r?.data?.variant || r?.data;
  if (!detail) throw new Error("Tour variant was not found");
  return variant({ ...listedVariant, ...detail });
}

export async function submitEnquiry({
  enquiry_type = "FIXED_TOUR",
  package_id = "",
  variant_id = "",
  destination_id = "",
  channel = "WEBSITE",
  subject = "",
  message = "",
  name = "",
  mobile = "",
  phone = "",
  email = "",
  travel_date = "",
  travel_duration_day = 0,
  travel_duration_night = 0,
  adult_count = 1,
  child_count = 0,
  senior_count = 0,
  hotel_id = "",
  vehicle_id = "",
  room_count = 0,
  vehicle_count = 0,
  budget_min = 0,
  budget_max = 0,
  special_requirements = "",
  meal_plan = "ANY",
  customer_id = "",
} = {}) {
  const enquiryMessage = [subject, message].filter(Boolean).join("\n\n");
  const payload = {
    enquiry_type,
    visitor_id: isValidUUID(visitorId()) ? visitorId() : "",
    customer_id: isValidUUID(customer_id) ? customer_id : "",
    package_id: isValidUUID(package_id) ? package_id : "",
    variant_id: isValidUUID(variant_id) ? variant_id : "",
    destination_id: isValidUUID(destination_id) ? destination_id : "",
    channel,
    message: enquiryMessage.trim(),
    name: name.trim(),
    phone: (phone || mobile).trim(),
    email: email.trim(),
    travel_date: travel_date ? travel_date.trim() : "",
    travel_duration_day: Number(travel_duration_day) || 0,
    travel_duration_night: Number(travel_duration_night) || 0,
    adult_count: Number(adult_count) || 0,
    child_count: Number(child_count) || 0,
    senior_count: Number(senior_count) || 0,
    hotel_id: isValidUUID(hotel_id) ? hotel_id : "",
    vehicle_id: isValidUUID(vehicle_id) ? vehicle_id : "",
    room_count: Number(room_count) || 0,
    vehicle_count: Number(vehicle_count) || 0,
    budget_min: Number(budget_min) || 0,
    budget_max: Number(budget_max) || 0,
    special_requirements: special_requirements ? special_requirements.trim() : "",
    meal_plan,
  };

  const response = await request("/api/v1/enquiries", {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
  await trackVisitorEvent("enquiry_submit", window.location.pathname, { enquiry_type });
  return response;
}

export async function submitCustomEnquiry({
  name = "",
  mobile = "",
  destination = "",
  message = "",
  notes = "",
  travel_date = "",
  travel_duration_day = 0,
  travel_duration_night = 0,
  adult_count,
  child_count = 0,
  senior_count = 0,
  pax_no = 1,
  room_count,
  no_room = 1,
  vehicle_count,
  vehicle_type = "ANY",
  budget_min = 0,
  budget_max = 0,
  meal_plan = "ANY",
  special_requirements = "",
  enquiry_type = "CUSTOM_TOUR",
  customer_id = "",
  package_id = "",
  destination_id = "",
  hotel_id = "",
  vehicle_id = "",
  email = "",
} = {}) {
  return submitEnquiry({
    enquiry_type: enquiry_type && enquiry_type.trim() ? enquiry_type.trim() : "CUSTOM_TOUR",
    package_id,
    variant_id: "",
    destination_id,
    channel: "WEBSITE",
    message: [`Destination: ${destination.trim()}`, message.trim(), notes.trim()].filter(Boolean).join("\n\n"),
    name,
    mobile,
    email,
    travel_date,
    travel_duration_day,
    travel_duration_night,
    adult_count: adult_count === undefined ? Number(pax_no) || 1 : Number(adult_count) || 0,
    child_count,
    senior_count,
    room_count: room_count === undefined ? Number(no_room) || 1 : Number(room_count) || 0,
    hotel_id,
    vehicle_id,
    vehicle_count: Number(vehicle_count) || ((vehicle_id || (vehicle_type && vehicle_type !== "ANY")) ? 1 : 0),
    budget_min,
    budget_max,
    special_requirements,
    meal_plan: meal_plan && meal_plan.trim() ? meal_plan.trim() : "ANY",
    customer_id,
  });
}

export async function fetchEnquiries(skip = 0, limit = 50) {
  return request(`/api/v1/enquiries?skip=${skip}&limit=${limit}`, {}, true);
}

export async function updateEnquiry(id, payload) {
  return request(`/api/v1/enquiries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, true);
}

export async function deleteEnquiry(id) {
  return request(`/api/v1/enquiries/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }, true);
}

export async function fetchCustomerTours(page = 1, pageSize = 20, filters = {}) {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return request(`/api/v1/customer-tours?${query.toString()}`, {}, true);
}

export async function fetchCustomerTour(bookingId) {
  return request(`/api/v1/customer-tours/${encodeURIComponent(bookingId)}`, {}, true);
}

export async function addCustomerTourTraveller(bookingId, payload) {
  return request(`/api/v1/customer-tours/${encodeURIComponent(bookingId)}/travellers`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
}

export async function updateCustomerTourTraveller(bookingId, travellerId, payload) {
  return request(`/api/v1/customer-tours/${encodeURIComponent(bookingId)}/travellers/${encodeURIComponent(travellerId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, true);
}

export async function deleteCustomerTourTraveller(bookingId, travellerId) {
  return request(`/api/v1/customer-tours/${encodeURIComponent(bookingId)}/travellers/${encodeURIComponent(travellerId)}`, {
    method: "DELETE",
  }, true);
}

export async function fetchReviews(slugOrId, page = 1, pageSize = 10) {
  return request(`/api/v1/reviews/package/${encodeURIComponent(slugOrId)}?page=${page}&page_size=${pageSize}`);
}

export async function checkReviewEligibility(slugOrId) {
  return request(`/api/v1/reviews/eligibility/${encodeURIComponent(slugOrId)}`, {}, true);
}

export async function submitReview({ package_id = "", rating = 5, review = "", review_gallery = [] } = {}) {
  return request("/api/v1/reviews", {
    method: "POST",
    body: JSON.stringify({ package_id, rating: Number(rating), review, review_gallery }),
  });
}

export async function updateReview(reviewId, { rating = 5, review = "", review_gallery = [] } = {}) {
  return request(`/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: "PATCH",
    body: JSON.stringify({ rating: Number(rating), review, review_gallery }),
  });
}

export async function deleteReview(reviewId) {
  return request(`/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: "DELETE",
  });
}

// ── Quotations ───────────────────────────────────────────────────────
export async function fetchEnquiryQuotations(enquiryId) {
  return request(`/api/v1/quotations/enquiry/${encodeURIComponent(enquiryId)}`, {}, true);
}

export async function acceptQuotation(quotationId, travellers = []) {
  return request(`/api/v1/quotations/${encodeURIComponent(quotationId)}/accept`, {
    method: "POST",
    body: JSON.stringify({ travellers }),
  }, true);
}

export async function rejectQuotation(quotationId, reason) {
  return request(`/api/v1/quotations/${encodeURIComponent(quotationId)}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }, true);
}

// ── Wallet and transactions ─────────────────────────────────────────
export async function fetchWalletBalance() {
  return request("/api/v1/transactions/balance", {}, true);
}

export async function fetchTransactions(page = 1, pageSize = 20) {
  return request(`/api/v1/transactions?page=${page}&page_size=${pageSize}`, {}, true);
}

export async function fetchAccountPoints(page = 1, pageSize = 20) {
  return request(`/api/v1/account/points?page=${page}&page_size=${pageSize}`, {}, true);
}

export async function fetchPublicRanking(page = 1, pageSize = 10) {
  return request(`/api/v1/public/ranking?page=${page}&page_size=${pageSize}`);
}
