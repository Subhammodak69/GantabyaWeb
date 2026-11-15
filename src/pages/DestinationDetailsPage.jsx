import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import Seo from "../components/Seo";
import PackageCard from "../components/PackageCard";
import { fetchAllDestinations, fetchPackages } from "../api";

export default function DestinationDetailsPage() {
  const { slug } = useParams();
  const [destination, setDestination] = useState(null);
  const [loadingDestination, setLoadingDestination] = useState(true);
  const [packages, setPackages] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [relatedError, setRelatedError] = useState("");

  useEffect(() => {
    let active = true;
    setDestination(null);
    setLoadingDestination(true);
    fetchAllDestinations()
      .then((items) => {
        const match = items.find((item) => item.slug === slug || item.id === slug);
        if (active) setDestination(match || null);
      })
      .catch((error) => { if (active) setRelatedError(error.message || "Destination could not be loaded."); })
      .finally(() => { if (active) setLoadingDestination(false); });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!destination) return undefined;
    let active = true;
    setLoadingRelated(true);
    setRelatedError("");
    Promise.allSettled([
      fetchPackages({ page: 1, page_size: 100, destination: destination.name }),
    ])
      .then(([packageResult]) => {
        if (!active) return;
        setPackages(packageResult.status === "fulfilled" ? packageResult.value.items || [] : []);
        if (packageResult.status === "rejected") {
          setRelatedError("Tour packages could not be loaded. Refresh to try again.");
        }
      })
      .finally(() => { if (active) setLoadingRelated(false); });
    return () => { active = false; };
  }, [destination]);

  if (loadingDestination) {
    return <div className="grid min-h-[50vh] place-items-center text-sm font-semibold text-slate-500">Loading destination…</div>;
  }

  if (!destination) {
    return <main className="mx-auto min-h-[50vh] max-w-7xl px-4 py-16 text-center"><p className="font-display text-2xl font-bold text-navy">Destination not found</p><Link to="/destinations" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft size={15} /> All destinations</Link></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Seo
        title={`${destination.name} Travel Guide | Gantabyaa`}
        description={destination.description || `Explore curated tour packages in ${destination.name} with Gantabyaa.`}
        path={`/destinations/${destination.slug || destination.id}`}
      />
      <section className="relative flex min-h-[250px] items-end overflow-hidden bg-navy px-4 pb-8 pt-16 text-white sm:min-h-[250px] sm:px-6 sm:pb-12">
        {destination.image_url && <img src={destination.image_url} alt={destination.name} className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/60 to-navy/25" />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <Link to="/destinations" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-white/85 hover:text-white"><ArrowLeft size={16} /> All destinations</Link>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-white/80"><MapPin size={14} />{destination.country || (destination.is_domestic ? "India" : "International")}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-5xl">{destination.name}</h1>
          {destination.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">{destination.description}</p>}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:py-12">
        {relatedError && <p role="alert" className="mb-6 rounded-lg border border-rose-200 bg-white px-4 py-3 text-sm text-rose-700">{relatedError}</p>}
        <div className="mb-5 flex items-end justify-between gap-3">
          <div><p className="eyebrow">Curated itineraries</p><h2 className="section-title">Packages in {destination.name}</h2></div>
          <span className="text-sm font-semibold text-slate-500">{loadingRelated ? "Loading…" : `${packages.length} packages`}</span>
        </div>
        {loadingRelated ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-xl bg-slate-200" />)}</div> : packages.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{packages.map((pack, index) => <PackageCard key={pack.id || pack.slug} pack={pack} index={index} />)}</div> : <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No packages are listed for this destination yet.</p>}
      </section>
    </main>
  );
}