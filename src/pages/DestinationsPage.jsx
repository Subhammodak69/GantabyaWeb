import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, RefreshCw } from "lucide-react";
import Seo from "../components/Seo";
import { fetchAllDestinations } from "../api";

const HERO_BG = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2000&q=90";

function destinationPath(destination) {
  return `/destinations/${encodeURIComponent(destination.slug || destination.id)}`;
}

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchAllDestinations()
      .then((items) => { if (active) setDestinations(items); })
      .catch((err) => { if (active) setError(err.message || "Destinations could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <Seo
        title="Explore Destinations | Gantabyaa"
        description="Explore Gantabyaa destinations and discover curated tour packages for your next trip."
        path="/destinations"
      />
      <section className="relative flex min-h-[280px] items-center overflow-hidden bg-navy px-4 py-12 text-white sm:px-6 lg:px-12">
        <img className="absolute inset-0 h-full w-full object-cover object-center opacity-30 brightness-75" src={HERO_BG} alt="Mountain travel landscape" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark via-navy/85 to-primary-950/70" />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">Find your next escape</p>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">Explore <span className="text-primary-300">destinations</span></h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80">Browse places across India and around the world.</p>
            </div>
            {!loading && <p className="text-sm font-semibold text-white/75">{destinations.length} places</p>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div key={item} className="aspect-[4/3] animate-pulse rounded-xl bg-slate-200" />)}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary" onClick={() => window.location.reload()}>
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        ) : destinations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No destinations are available right now.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {destinations.map((destination) => (
              <Link
                key={destination.id}
                to={destinationPath(destination)}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-navy shadow-card focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {destination.image_url ? (
                  <img src={destination.image_url} alt={destination.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-navy" />}
                <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-white/80"><MapPin size={12} />{destination.country || (destination.is_domestic ? "India" : "International")}</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <h2 className="min-w-0 truncate font-display text-lg font-bold text-white sm:text-xl">{destination.name}</h2>
                    <ArrowRight size={17} className="shrink-0 text-white transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}