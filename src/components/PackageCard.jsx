import { useEffect, useRef, useState } from "react";
import { useTravel } from "../contexts/TravelContext";
import EnquiryModal from "./EnquiryModal";
import { addToWishlist, removeFromWishlist } from "../api";
import { Heart, LoaderCircle, MapPin, Clock, ArrowRight } from "lucide-react";

export default function PackageCard({ pack, index }) {
  const { selectPackage, isMember } = useTravel();
  const videoRef = useRef(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [wishlistState, setWishlistState] = useState(pack.is_wishlist ? "added" : "idle");

  useEffect(() => {
    setWishlistState(pack.is_wishlist ? "added" : "idle");
  }, [pack.is_wishlist]);

  const playVideo = () => {
    if (videoRef.current) videoRef.current.play().catch(() => {});
  };
  const stopVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const toggleWishlist = async (event) => {
    event.stopPropagation();
    if (!isMember) return window.location.assign("/login");
    setWishlistState("loading");
    try {
      if (wishlistState === "added") {
        await removeFromWishlist(pack.slug || pack.id);
        setWishlistState("idle");
      } else {
        await addToWishlist(pack.slug || pack.id);
        setWishlistState("added");
      }
    } catch {
      setWishlistState("error");
    }
  };

  return (
    <>
      <article
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-primary-300 hover:shadow-card-hover cursor-pointer"
        onClick={() => selectPackage(pack.slug || pack.id, pack)}
        onMouseEnter={playVideo}
        onMouseLeave={stopVideo}
      >
        {/* Image Container */}
        <div className="relative h-48 w-full overflow-hidden bg-slate-100 sm:h-52">
          <img
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-108"
            src={pack.image || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80"}
            alt={pack.title}
            loading="lazy"
          />
          {pack.video && (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              src={pack.video}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden="true"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          {/* Top badges */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 flex-wrap">
            {pack.badge && (
              <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                {pack.badge}
              </span>
            )}
            {pack.type && (
              <span className="rounded-md bg-white/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy shadow-sm">
                {pack.type === "DOMESTIC" ? "India" : "Global"}
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full backdrop-blur-md shadow-sm transition-all duration-200 hover:scale-110 ${
              wishlistState === "added"
                ? "bg-rose-500 text-white"
                : "bg-white/85 text-slate-700 hover:bg-white hover:text-rose-500"
            }`}
            onClick={toggleWishlist}
            disabled={wishlistState === "loading"}
            aria-label={wishlistState === "added" ? `Remove ${pack.title} from wishlist` : `Add ${pack.title} to wishlist`}
            title={wishlistState === "added" ? "Remove from wishlist" : "Add to wishlist"}
          >
            {wishlistState === "loading" ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <Heart size={15} fill={wishlistState === "added" ? "currentColor" : "none"} />
            )}
          </button>

          {/* Bottom Overlay on Image: Duration & Destination */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
            <span className="flex items-center gap-1 font-medium drop-shadow-sm text-[11px] truncate">
              <MapPin size={12} className="text-primary-300 flex-shrink-0" />
              <span className="truncate">{pack.destination || pack.season_name || "Featured Route"}</span>
            </span>
            {pack.duration && (
              <span className="flex items-center gap-1 rounded bg-black/40 backdrop-blur px-1.5 py-0.5 text-[10px] font-semibold text-white/90 flex-shrink-0">
                <Clock size={10} />
                {pack.duration}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary-600 mb-1">
              {pack.code || "TOUR"} {pack.season_name ? `· ${pack.season_name}` : ""}
            </p>
            <h3 className="font-display text-sm font-bold text-navy group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {pack.title}
            </h3>
          </div>

          {/* Enquiry CTA */}
          <div className="mt-3.5 flex items-center justify-end border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5">
              <button
                id={`enquire-btn-${pack.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEnquiryOpen(true);
                }}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-accent-600 active:scale-95"
                aria-label={`Enquire about ${pack.title}`}
              >
                Enquire
              </button>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary transition group-hover:bg-primary group-hover:text-white">
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </div>
      </article>

      <EnquiryModal
        open={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        packageId={pack.package_id || pack.id}
        packageSlug={pack.slug || pack.id}
        variantId={pack.default_variant_id || ""}
        packageTitle={pack.title}
        packageDestination={pack.destination || ""}
        variantName={pack.season_name || ""}
        variantPrice={pack.starting_price || pack.price || 0}
        durationDays={pack.duration_days || 0}
        durationNights={pack.duration_nights || 0}
        packageImage={pack.image || pack.cover_image || ""}
        destinationId={pack.destination_id || ""}
      />
    </>
  );
}
