import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const status = item.status || "NEW";
              const themeCls = STATUS_THEMES[status] || "bg-slate-100 text-slate-700 border-slate-200";

              return (
                <article
                  key={item.id || item.enquiry_code}
                  className="card p-5 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Code & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          {item.enquiry_code || "ENQUIRY"}
                        </span>
                        <h2 className="mt-0.5 truncate font-display text-base font-bold leading-tight text-navy">
                          {item.subject || item.destination_name || item.destination || "Custom Itinerary"}
                        </h2>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${themeCls}`}>
                        {status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                      <div>
                        <span className="block text-[10px] font-medium text-slate-400">Type</span>
                        <b className="text-navy">{item.enquiry_type?.replace(/_/g, " ") || "TOUR"}</b>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-400">Travel Date</span>
                        <b className="text-navy">{formatDate(item.travel_date)}</b>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-400">Travellers / Rooms</span>
                        <b className="text-navy">{item.adult_count ?? item.pax_no ?? 0} Adults · {item.room_count ?? item.no_room ?? 0} Rm</b>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-400">Channel</span>
                        <b className="text-navy">{item.channel || "WEBSITE"}</b>
                      </div>
                    </div>

                    {/* Message / Special Request */}
                    {item.message && (
                      <p className="mt-3 rounded-lg border border-slate-100 bg-white p-2.5 text-xs italic leading-relaxed text-slate-600">
                        "{item.message}"
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                    <span>Submitted {formatDate(item.created_at)}</span>
                    <div className="flex items-center gap-3">
                      <Link to={`/my-enquiries/${encodeURIComponent(item.id)}`} className="font-bold text-primary hover:underline">View details</Link>
                    </div>
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
