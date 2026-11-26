import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchEnquiries } from "../api";
import { MessageSquareText } from "lucide-react";

function formatDate(value) {
  if (!value) return "Date not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

const STATUS_THEMES = {
  NEW: "bg-primary-50 text-primary border-primary-200",
  IN_PROGRESS: "bg-amber-50 text-amber-800 border-amber-200",
  QUOTED: "bg-purple-50 text-purple-800 border-purple-200",
  CONVERTED: "bg-green-50 text-success border-green-200",
  CANCELLED: "bg-rose-50 text-rose-800 border-rose-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function EnquiriesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchEnquiries()
      .then((response) => {
        const data = response?.data;
        setItems(Array.isArray(data) ? data : data?.items || data?.results || []);
      })
      .catch((err) => setError(err.message || "Could not load your enquiries."))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = activeFilter === "ALL"
    ? items
    : items.filter((item) => (item.status || "NEW") === activeFilter);

  const statuses = ["ALL", ...Array.from(new Set(items.map((i) => i.status || "NEW")))];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hero Header Banner */}
      <section className="relative flex min-h-[220px] items-center overflow-hidden bg-navy px-4 pb-8 pt-8 text-white sm:px-6 lg:px-12">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">
            Travel Dashboard
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            My <span className="text-primary-300">Enquiries</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-white/80 max-w-xl">
            Track your holiday requests, customized itinerary quotes, and communicate directly with your tour planner.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Actions Bar & Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setActiveFilter(status)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  activeFilter === status
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {status.replace(/_/g, " ")} {status !== "ALL" && `(${items.filter((i) => (i.status || "NEW") === status).length})`}
              </button>
            ))}
          </div>

          <Link
            to="/custom-tour-enquiry"
            className="btn-accent rounded-xl text-xs font-bold"
          >
            New Custom Enquiry →
          </Link>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-600" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card mt-6 flex flex-col items-center justify-center p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-slate-600">Loading your enquiries…</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="card mt-6 flex flex-col items-center justify-center p-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-2xl text-primary">
              <MessageSquareText size={28} />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-navy">
              {activeFilter === "ALL" ? "No enquiries found" : `No enquiries with status "${activeFilter.replace(/_/g, " ")}"`}
            </h3>
            <p className="mt-1.5 max-w-md text-xs text-slate-500">
              {activeFilter === "ALL"
                ? "You haven't requested any custom tours or package quotes yet. Start exploring your next trip!"
                : "Try switching filters to view other enquiries."}
            </p>
            {activeFilter === "ALL" && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/tours" className="btn-outline rounded-xl text-xs font-bold">
                  Browse Packages
                </Link>
                <Link to="/custom-tour-enquiry" className="btn-primary rounded-xl text-xs font-bold">
                  Request Custom Itinerary
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-2.5">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(125px,1fr)_minmax(145px,1.1fr)_minmax(110px,auto)_minmax(100px,auto)] gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 md:grid">
              <span>Enquiry</span>
              <span>Travel</span>
              <span>Travelers</span>
              <span>Status</span>
              <span>Submitted</span>
            </div>
            {filteredItems.map((item) => {
              const status = item.status || "NEW";
              const themeCls = STATUS_THEMES[status] || "bg-slate-100 text-slate-700 border-slate-200";

              return (
                <article
                  key={item.id || item.enquiry_code}
                  role="link"
                  tabIndex={0}
                  aria-label={`View details for enquiry ${item.enquiry_code || ""}`}
                  onClick={(event) => {
                    if (event.target instanceof Element && event.target.closest("a, button")) return;
                    navigate(`/my-enquiries/${encodeURIComponent(item.id)}`);
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/my-enquiries/${encodeURIComponent(item.id)}`);
                    }
                  }}
                  className="grid cursor-pointer gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-primary/40 hover:bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-primary/40 sm:px-5 md:grid-cols-[minmax(0,2fr)_minmax(125px,1fr)_minmax(145px,1.1fr)_minmax(110px,auto)_minmax(100px,auto)] md:items-center md:gap-5"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{item.enquiry_code || "ENQUIRY"}</span>
                    <h2 className="truncate font-display text-sm font-bold leading-tight text-navy">
                      {item.subject || item.destination_name || item.destination || "Custom Itinerary"}
                    </h2>
                    {item.message && <p className="mt-1 truncate text-[11px] text-slate-500">{item.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs md:block">
                    <div><span className="block text-[9px] font-medium uppercase text-slate-400 md:hidden">Type</span><span className="font-semibold text-slate-700">{item.enquiry_type?.replace(/_/g, " ") || "TOUR"}</span></div>
                    <div><span className="block text-[9px] font-medium uppercase text-slate-400 md:hidden">Travel date</span><span className="font-semibold text-slate-700">{formatDate(item.travel_date)}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs md:block">
                    <div><span className="block text-[9px] font-medium uppercase text-slate-400 md:hidden">Travelers / rooms</span><span className="font-semibold text-slate-700">{item.adult_count ?? item.pax_no ?? 0} Adults · {item.room_count ?? item.no_room ?? 0} Rm</span></div>
                    <div><span className="block text-[9px] font-medium uppercase text-slate-400 md:hidden">Channel</span><span className="font-semibold text-slate-500">{item.channel || "WEBSITE"}</span></div>
                  </div>
                  <div className="flex items-center justify-between gap-2 md:flex-col md:items-start md:justify-center">
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${themeCls}`}>
                      {status.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400 md:hidden">Submitted {formatDate(item.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 md:border-0 md:pt-0">
                    <span className="hidden md:inline">{formatDate(item.created_at)}</span>
                    <Link to={`/my-enquiries/${encodeURIComponent(item.id)}`} className="font-bold text-primary hover:underline">View details</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
