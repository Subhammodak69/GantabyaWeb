import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCustomerTours } from "../api";
import { Calendar, ChevronRight, LoaderCircle, Plane, Users } from "lucide-react";

function formatDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Date to be confirmed";
}

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadTrips = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetchCustomerTours(1, 20);
        const data = response?.data;
        if (active) setTrips(Array.isArray(data) ? data : data?.items || []);
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load your bookings.");
          setTrips([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadTrips();
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <section className="relative flex min-h-[220px] items-center overflow-hidden bg-navy px-4 pb-8 pt-8 text-white sm:px-6 lg:px-12">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">Bookings &amp; Itineraries</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            My <span className="text-primary-300">Trips</span>
          </h1>
          <p className="mt-1 max-w-xl text-xs text-white/80 sm:text-sm">
            Track bookings, payment status, and travellers for every journey.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
        {loading ? (
          <div className="card flex items-center justify-center p-12 text-slate-400">
            <LoaderCircle className="animate-spin text-primary" size={26} />
          </div>
        ) : trips.length ? (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {trips.map((trip) => {
              const travellerCount = trip.travellers?.length || 1;
              return (
                <Link
                  key={trip.id}
                  to={`/my-trips/${encodeURIComponent(trip.id)}`}
                  className="group grid gap-3 p-4 transition-colors hover:bg-primary-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:grid-cols-[minmax(0,1.5fr)_minmax(130px,0.8fr)_minmax(120px,0.7fr)_auto] sm:items-center sm:gap-5 sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="truncate text-[10px] font-bold uppercase tracking-wider text-primary">
                        {trip.booking_code || "PLANNED TRIP"}
                      </span>
                      <span className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-[9px] font-bold uppercase text-primary sm:hidden">
                        {trip.status || "TENTATIVE"}
                      </span>
                    </div>
                    <h2 className="truncate font-display text-lg font-bold text-navy">
                      {trip.destination_name || trip.package?.name || "Custom Journey"}
                    </h2>
                    {(trip.package?.name || trip.variant?.name) && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {trip.package?.name || ""}{trip.variant?.name ? ` · ${trip.variant.name}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar size={15} className="shrink-0 text-primary" />
                    <span>{formatDate(trip.departure_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users size={15} className="shrink-0 text-primary" />
                    <span>{travellerCount} Traveller{travellerCount === 1 ? "" : "s"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="hidden rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[10px] font-bold uppercase text-primary sm:inline-flex">
                      {trip.status || "TENTATIVE"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:underline">
                      View details <ChevronRight size={15} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Plane className="mx-auto text-primary-300" size={36} />
            <h2 className="mt-3 font-display text-lg font-bold text-navy">No Trips Scheduled Yet</h2>
            <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
              Your customer-tour bookings will appear here once they are created.
            </p>
            <Link to="/tours" className="btn-primary mt-6 text-xs font-bold">Explore Available Tours →</Link>
          </div>
        )}
      </section>
    </main>
  );
}
