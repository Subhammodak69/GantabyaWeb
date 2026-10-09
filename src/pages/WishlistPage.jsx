import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, LoaderCircle } from "lucide-react";
import { fetchWishlist, removeFromWishlist } from "../api";

function WishlistCard({ item, onRemove }) {
  const [removing, setRemoving] = useState(false);
  
  const remove = async () => {
    setRemoving(true);
    try {
      await onRemove(item);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <article className="card flex flex-col justify-between overflow-hidden">
      <div className="relative h-44 overflow-hidden bg-slate-100">
        <img 
          className="h-full w-full object-cover transition duration-700 hover:scale-105" 
          src={item.banner?.image || item.image || "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=900&q=85"} 
          alt={item.title || item.destination || "Saved journey"} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-dark/70 via-transparent to-transparent" />
        <span className="absolute bottom-2.5 left-3 rounded-md bg-white/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">
          {item.type === "DOMESTIC" ? "India" : "International"}
        </span>
        <button 
          onClick={remove} 
          disabled={removing}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm text-rose-500 transition hover:bg-rose-50 hover:scale-110 disabled:opacity-50"
          title="Remove from wishlist"
        >
          {removing ? <LoaderCircle size={14} className="animate-spin text-rose-500" /> : <Heart size={15} fill="currentColor" />}
        </button>
      </div>
      
      <div className="p-4 flex flex-1 flex-col justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
            {item.tour_code || item.season_name || item.destination}
          </p>
          <h3 className="font-display text-sm font-bold text-navy line-clamp-1">
            {item.title || "Saved journey"}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed">
            {item.description || `A handcrafted journey through ${item.destination || "wonderful places"}.`}
          </p>
        </div>
        
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span className="text-[10px] text-slate-400">
            Saved {item.wishlisted_at ? new Date(item.wishlisted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "recently"}
          </span>
          <Link 
            to={`/${item.slug || item.package_id || item.id}`} 
            className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary transition hover:bg-primary hover:text-white"
          >
            <span>View</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWishlist = () => {
    setLoading(true);
    fetchWishlist()
      .then((response) => {
        const data = response?.data;
        setItems(Array.isArray(data) ? data : data?.items || data?.results || []);
      })
      .catch((err) => setError(err.message || "Could not load your wishlist."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const remove = async (item) => {
    try {
      const identifier = item.slug || item.package_id || item.id;
      await removeFromWishlist(identifier);
      setItems((current) => current.filter((saved) => saved.id !== item.id));
    } catch (err) {
      setError(err.message || "Could not remove this journey.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
          <div>
            <p className="eyebrow">Saved For Later</p>
            <h1 className="section-title text-2xl sm:text-3xl">
              My <span className="text-primary">Wishlist</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1">
              Holiday packages and tours you saved to explore and plan later.
            </p>
          </div>
          <div className="flex items-center gap-2 text-rose-500 font-bold text-sm bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 w-fit">
            <Heart size={16} fill="currentColor" />
            <span>{items.length} Saved</span>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-600">✕</button>
          </div>
        )}

        {/* WISHLIST GRID */}
        {loading ? (
          <div className="card flex items-center justify-center p-12 text-slate-400">
            <LoaderCircle className="animate-spin text-primary" size={26} />
          </div>
        ) : items.length ? (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <WishlistCard key={item.id} item={item} onRemove={remove} />
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Heart className="mx-auto text-slate-300" size={36} />
            <h2 className="mt-3 font-display text-lg font-bold text-navy">Your Wishlist is Empty</h2>
            <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
              Save your favourite destinations and packages by clicking the heart icon on any tour card.
            </p>
            <Link 
              to="/tours" 
              className="btn-primary mt-6 text-xs font-bold"
            >
              Explore Tour Packages →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}