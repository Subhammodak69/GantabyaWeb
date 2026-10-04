import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";

export default function Reviews({ reviews = [] }) {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const score = reviews.length
    ? (reviews.reduce((sum, item) => {
        const review = Array.isArray(item) ? { rating: item[1] } : item;
        return sum + Number(review.rating || 0);
      }, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Guest Testimonials</p>
          <h2 className="section-title text-xl sm:text-2xl">Traveller Reviews</h2>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <p className="text-sm">No reviews yet for this package. Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((item, index) => {
            const r = Array.isArray(item) ? { name: item[0], rating: item[1], review: item[2] } : item;
            return (
              <article
                className="card p-5 flex flex-col justify-between"
                key={r.id || r.name || index}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      {r.reviewer_pic ? (
                        <img className="h-9 w-9 rounded-full object-cover border border-primary-200" src={r.reviewer_pic} alt={r.name} />
                      ) : (
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-100 font-display text-sm font-bold text-primary">
                          {(r.name || r.reviewer_by || "T")[0]}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-navy truncate max-w-[150px]">{r.name || r.reviewer_by || "Verified Traveller"}</h4>
                        <p className="text-[10px] text-slate-400">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Verified Guest"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center text-accent text-xs">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} aria-hidden="true">{i < Number(r.rating || 0) ? "★" : "☆"}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 italic">
                    "{r.review}"
                  </p>
                </div>

                {r.review_gallery?.length > 0 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pt-2 border-t border-slate-100">
                    {r.review_gallery.filter((media) => media.url).map((media, i) => {
                      const items = r.review_gallery.filter((item) => item.url);
                      const isVideo = media.type === "video" || /\.(mp4|webm|mov)(?:$|[?#])/i.test(media.url);
                      return (
                        <button
                          type="button"
                          className="relative h-12 w-16 flex-none overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                          onClick={() => setSelectedMedia({ items, index: i })}
                          aria-label={isVideo ? "View review video" : "View review photo"}
                          key={media.id || i}
                        >
                          {isVideo ? (
                            <span className="grid h-full place-items-center text-[10px] font-bold text-primary">▶ Video</span>
                          ) : (
                            <img className="h-full w-full object-cover" src={media.url} alt={media.alt || "Review photo"} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      {selectedMedia && (() => {
        const { items, index } = selectedMedia;
        const current = items[index];
        const isVideo = current.type === "video" || /\.(mp4|webm|mov)(?:$|[?#])/i.test(current.url);
        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Review media viewer"
            onClick={() => setSelectedMedia(null)}
          >
            <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => setSelectedMedia(null)} aria-label="Close media viewer">
              <X size={22} />
            </button>
            {index > 0 && (
              <button type="button" className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-6" onClick={(event) => { event.stopPropagation(); setSelectedMedia((state) => ({ ...state, index: state.index - 1 })); }} aria-label="Previous media">
                <ChevronLeft size={24} />
              </button>
            )}
            <div className="flex max-h-[90vh] max-w-[90vw] items-center justify-center" onClick={(event) => event.stopPropagation()}>
              {isVideo ? (
                <video className="max-h-[85vh] max-w-[88vw]" src={current.url} controls autoPlay />
              ) : (
                <img className="max-h-[85vh] max-w-[88vw] object-contain" src={current.url} alt={current.alt || "Review media"} />
              )}
            </div>
            {index < items.length - 1 && (
              <button type="button" className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6" onClick={(event) => { event.stopPropagation(); setSelectedMedia((state) => ({ ...state, index: state.index + 1 })); }} aria-label="Next media">
                <ChevronRight size={24} />
              </button>
            )}
          </div>
        );
      })()}
    </section>
  );
}
