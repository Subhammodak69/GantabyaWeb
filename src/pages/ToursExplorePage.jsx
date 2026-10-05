import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search, Compass, Sparkles, MapPin, Globe, Tag,
  Sparkle, X, RefreshCw
} from "lucide-react";
import Seo from "../components/Seo";
import PackageCard from "../components/PackageCard";
import CustomSelect from "../components/CustomSelect";
import usePackages from "../hooks/usePackages";
import useScrollReveal from "../hooks/useScrollReveal";

const HERO_BG = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2000&q=90";

const QUICK_FILTERS = [
  { label: "All Tours", icon: Compass, match: (params) => !params.get("type") && !params.get("is_featured") && !params.get("badge"), getQuery: () => ({}) },
  { label: "Domestic", icon: MapPin, match: (params) => params.get("type") === "DOMESTIC", getQuery: () => ({ type: "DOMESTIC" }) },
  { label: "International", icon: Globe, match: (params) => params.get("type") === "INTERNATIONAL", getQuery: () => ({ type: "INTERNATIONAL" }) },
  { label: "Featured", icon: Sparkles, match: (params) => params.get("is_featured") === "true", getQuery: () => ({ is_featured: "true" }) },
  { label: "Special Offers", icon: Tag, match: (params) => params.get("badge") === "SPECIAL_OFFER" || Boolean(params.get("badge")), getQuery: () => ({ badge: "SPECIAL_OFFER" }) },
];

export default function ToursExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const revealRef = useScrollReveal();

  const searchParam = searchParams.get("search") || "";
  const typeParam = searchParams.get("type") || "";
  const destinationParam = searchParams.get("destination") || "";
  const seasonParam = searchParams.get("season") || "";
  const isFeaturedParam = searchParams.get("is_featured") || "";
  const badgeParam = searchParams.get("badge") || "";
  const sortByParam = searchParams.get("sort_by") || "created_at";
  const sortOrderParam = searchParams.get("sort_order") || "desc";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const [searchInput, setSearchInput] = useState(searchParam);

  // Sync state with URL params
  const activeFilters = useMemo(() => ({
    page: pageParam,
    page_size: 12,
    search: searchParam,
    destination: destinationParam,
    type: typeParam,
    season: seasonParam,
    is_featured: isFeaturedParam,
    badge: badgeParam,
    sort_by: sortByParam,
    sort_order: sortOrderParam,
  }), [pageParam, searchParam, destinationParam, typeParam, seasonParam, isFeaturedParam, badgeParam, sortByParam, sortOrderParam]);

  const { packages, pagination, loading, error } = usePackages(undefined, activeFilters);

  // Debounced search sync to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParam) {
        const current = new URLSearchParams(searchParams);
        if (searchInput) {
          current.set("search", searchInput);
        } else {
          current.delete("search");
        }
        current.set("page", "1");
        setSearchParams(current);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, searchParam, searchParams, setSearchParams]);

  // Keep searchInput aligned if URL changes externally
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  const updateParams = (newParams) => {
    const current = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "") {
        current.delete(key);
      } else {
        current.set(key, String(val));
      }
    });
    setSearchParams(current);
  };

  const resetAllFilters = () => {
    setSearchInput("");
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    searchParam || typeParam || destinationParam || seasonParam || isFeaturedParam || badgeParam || (sortByParam && sortByParam !== "created_at")
  );

  // Dynamic heading based on current filters
  const getPageHeading = () => {
    if (isFeaturedParam === "true") return { title: "Featured Journeys", accent: "Handpicked & Top Rated", eyebrow: "Exclusive Collection" };
    if (typeParam === "DOMESTIC") return { title: "Domestic Holidays", accent: "Across Incredible India", eyebrow: "Domestic Packages" };
    if (typeParam === "INTERNATIONAL") return { title: "International Tours", accent: "World Vacations", eyebrow: "Global Escapes" };
    if (badgeParam) return { title: "Special Offers", accent: "Limited-Time Deals", eyebrow: "Seasonal Savings" };
    if (destinationParam) return { title: `Tours to ${destinationParam}`, accent: "Curated Itineraries", eyebrow: "Destination Filter" };
    if (searchParam) return { title: `Results for "${searchParam}"`, accent: "Best Matching Packages", eyebrow: "Search Results" };
    return { title: "Explore Holiday Packages", accent: "Curated Experiences", eyebrow: "All Tours & Holidays" };
  };

  const headingInfo = getPageHeading();

  return (
    <div ref={revealRef} className="min-h-screen bg-slate-50">
      <Seo
        title={headingInfo.title ? `${headingInfo.title} | Gantabyaa` : "Holiday Packages | Gantabyaa"}
        description="Browse curated domestic and international tour packages from Gantabyaa, including featured holidays, special offers, and custom travel itineraries."
        path="/tours"
        robots="index,follow"
      />
      {/* Top Banner */}
      <section className="relative flex min-h-[280px] items-center overflow-hidden bg-navy px-4 pb-12 pt-12 text-white sm:px-6 lg:px-12">
        <img className="absolute inset-0 h-full w-full object-cover object-center opacity-30 brightness-75" src={HERO_BG} alt="Explore tours background" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark via-navy/85 to-primary-950/70" />

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">{headingInfo.eyebrow}</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-white">
            {headingInfo.title} <span className="text-primary-300">{headingInfo.accent}</span>
          </h1>

          {/* Quick Category Tabs Bar */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {QUICK_FILTERS.map(({ label, icon: Icon, match, getQuery }) => {
              const active = match(searchParams);
              return (
                <button
                  key={label}
                  onClick={() => {
                    const q = getQuery();
                    const next = new URLSearchParams();
                    if (searchParam) next.set("search", searchParam);
                    Object.entries(q).forEach(([k, v]) => next.set(k, v));
                    setSearchParams(next);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                    active
                      ? "bg-primary text-white shadow-md shadow-primary/30 scale-105"
                      : "bg-white/10 text-white backdrop-blur hover:bg-white/20"
                  }`}
                >
                  <Icon size={14} className={active ? "text-white" : "text-primary-200"} />
                  <span>{label}</span>
                </button>
              );
            })}
            <button
              onClick={() => navigate("/custom-tour-enquiry")}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/20 px-4 py-2 text-xs font-bold text-accent-200 backdrop-blur transition hover:bg-accent/30"
            >
              <Sparkle size={14} />
              <span>Custom Tour</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Search Bar & Filter Controls Box */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" size={18} />
              <input
                id="tours-search-input"
                type="text"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                placeholder="Search by package name, destination, route, code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search tour packages"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns on Desktop */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-40 sm:w-44">
                <CustomSelect
                  value={typeParam}
                  options={[
                    { label: "All Regions", value: "" },
                    { label: "Domestic (India)", value: "DOMESTIC" },
                    { label: "International", value: "INTERNATIONAL" },
                  ]}
                  onChange={(val) => updateParams({ type: val, page: 1 })}
                  triggerClassName="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:border-primary"
                />
              </div>

              <div className="w-40 sm:w-48">
                <CustomSelect
                  value={`${sortByParam}_${sortOrderParam}`}
                  options={[
                    { label: "Newest First", value: "created_at_desc" },
                    { label: "Name: A to Z", value: "title_asc" },
                  ]}
                  onChange={(val) => {
                    const [field, order] = val.split("_");
                    updateParams({ sort_by: field, sort_order: order, page: 1 });
                  }}
                  triggerClassName="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:border-primary"
                />
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="flex h-11 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                  title="Reset all filters"
                >
                  <RefreshCw size={13} />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Counter & Active Filter Pills */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              {loading ? "Searching tours…" : error ? "Unable to load tours" : `Showing ${packages.length} of ${pagination.total || packages.length} journey${(pagination.total || packages.length) === 1 ? "" : "s"}`}
            </span>
            {hasActiveFilters && (
              <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                Filtered
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="text-xs font-semibold text-primary hover:text-primary-700 underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Loading Skeleton / Package Grid */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="h-48 w-full rounded-xl bg-slate-200" />
                <div className="mt-3 h-3.5 w-1/3 rounded bg-slate-200" />
                <div className="mt-2 h-4 w-3/4 rounded bg-slate-200" />
                <div className="mt-4 flex justify-between pt-3 border-t border-slate-100">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="h-7 w-20 rounded-lg bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={resetAllFilters}
              className="btn-primary mt-4 text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : packages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Compass className="mx-auto text-primary-300" size={44} />
            <h3 className="mt-3 font-display text-lg font-bold text-navy">No journeys found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any packages matching your search criteria. Try modifying your search keywords or clearing your active filters.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={resetAllFilters}
                className="btn-primary rounded-xl text-xs font-bold"
              >
                Clear all filters
              </button>
              <button
                onClick={() => navigate("/custom-tour-enquiry")}
                className="btn-outline rounded-xl text-xs font-bold"
              >
                Plan a Custom Tour
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {packages.map((pack, index) => (
              <PackageCard key={pack.id || pack.slug} pack={pack} index={index} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-3">
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-primary-50 hover:text-primary disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700"
              disabled={pageParam <= 1}
              onClick={() => updateParams({ page: pageParam - 1 })}
            >
              ← Previous
            </button>
            <span className="text-xs font-semibold text-slate-600">
              Page {pageParam} of {pagination.pages}
            </span>
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-primary-50 hover:text-primary disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700"
              disabled={pageParam >= pagination.pages}
              onClick={() => updateParams({ page: pageParam + 1 })}
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
