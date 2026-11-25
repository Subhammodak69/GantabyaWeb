import { useCallback, useEffect, useState } from "react";
import { Award, BarChart3, RefreshCw, TrendingUp, Users } from "lucide-react";
import Seo from "../components/Seo";
import { fetchAccountPoints, fetchPublicRanking } from "../api";
import { useTravel } from "../contexts/TravelContext";
import heroLandscape from "../assets/hero-landscape.svg";

const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatPoints(value) {
  const points = Number(value);
  return Number.isFinite(points) ? points.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0";
}

export default function LeaderboardPage() {
  const { isMember } = useTravel();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [locating, setLocating] = useState(false);
  const [myRank, setMyRank] = useState(null);
  const [error, setError] = useState("");

  const loadRanking = useCallback(async ({ nextPage = 1, refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else if (nextPage > 1) setLoadingMore(true);
    else setLoading(true);
    if (nextPage === 1) setMyRank(null);
    setError("");
    try {
      const response = await fetchPublicRanking(nextPage, PAGE_SIZE);
      if (!Array.isArray(response?.data)) throw new Error(response?.message || "Leaderboard could not be loaded.");
      setCustomers((current) => nextPage === 1 ? response.data : [...current, ...response.data]);
      setPagination(response.pagination || null);
      setPage(nextPage);
    } catch (loadError) {
      setError(loadError.message || "Leaderboard could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  const showMyPosition = async () => {
    setLocating(true);
    setError("");
    try {
      const accountResponse = await fetchAccountPoints(1, 1);
      const rank = Number(accountResponse?.data?.rank);
      if (!Number.isInteger(rank) || rank < 1) {
        throw new Error(accountResponse?.message || "Your leaderboard position could not be found.");
      }

      const targetPage = Math.ceil(rank / PAGE_SIZE);
      const rankingResponse = await fetchPublicRanking(targetPage, PAGE_SIZE);
      if (!Array.isArray(rankingResponse?.data)) {
        throw new Error(rankingResponse?.message || "Your leaderboard position could not be loaded.");
      }
      if (!rankingResponse.data.some((customer) => Number(customer.rank) === rank)) {
        throw new Error("Your position is not available on the public leaderboard yet.");
      }

      setCustomers(rankingResponse.data);
      setPagination(rankingResponse.pagination || null);
      setPage(targetPage);
      setMyRank(rank);
    } catch (loadError) {
      setError(loadError.message || "Your leaderboard position could not be loaded.");
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => { loadRanking(); }, [loadRanking]);
  useEffect(() => {
    if (myRank === null || !customers.some((customer) => Number(customer.rank) === myRank)) return;
    document.getElementById(`leaderboard-rank-${myRank}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [myRank, customers]);

  const visiblePointValues = customers
    .map((customer) => Number(customer.point_balance))
    .filter(Number.isFinite);
  const highestVisiblePoints = visiblePointValues.length ? Math.max(...visiblePointValues) : null;
  const averageVisiblePoints = visiblePointValues.length
    ? visiblePointValues.reduce((total, points) => total + points, 0) / visiblePointValues.length
    : null;
  const chartEntries = customers.slice(0, 5);
  const chartMaxPoints = Math.max(0, ...chartEntries.map((customer) => Number(customer.point_balance) || 0));

  return (
    <>
      <Seo title="Travelers Leaderboard | Gantabyaa" description="Explore the public Gantabyaa travel points leaderboard and celebrate our top travelers." path="/leaderboard" />
      <main className="min-h-screen bg-slate-50 pb-12">
        <section className="relative isolate overflow-hidden bg-navy px-4 py-12 text-white sm:px-6 lg:px-12">
          <img src={heroLandscape} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/55 to-navy/70" />
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <Award className="mx-auto text-amber-300" size={34} />
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-primary-200">Gantabyaa community</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-white sm:text-4xl">Travelers leaderboard</h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">Every journey earns a place. Discover the travelers ranked by their points.</p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <section className="-mt-4 mb-8 pt-5">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              <div>
                <p className="eyebrow">Leaderboard insights</p>
                <h2 className="font-display text-lg font-extrabold text-navy">Community statistics</h2>
              </div>
            </div>

            <div className="mt-4 grid divide-y divide-slate-200 border-y border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="py-4 sm:pr-5">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users size={16} className="text-primary" />
                  <p className="text-xs font-bold">Travelers ranked</p>
                </div>
                <p className="mt-2 font-display text-2xl font-black text-navy">
                  {pagination?.total_items ?? (customers.length || "—")}
                </p>
              </div>
              <div className="py-4 sm:px-5">
                <div className="flex items-center gap-2 text-slate-500">
                  <Award size={16} className="text-amber-500" />
                  <p className="text-xs font-bold">Highest score shown</p>
                </div>
                <p className="mt-2 font-display text-2xl font-black text-navy">
                  {highestVisiblePoints === null ? "—" : formatPoints(highestVisiblePoints)}
                </p>
              </div>
              <div className="py-4 sm:pl-5">
                <div className="flex items-center gap-2 text-slate-500">
                  <TrendingUp size={16} className="text-emerald-600" />
                  <p className="text-xs font-bold">Average points shown</p>
                </div>
                <p className="mt-2 font-display text-2xl font-black text-navy">
                  {averageVisiblePoints === null ? "—" : formatPoints(averageVisiblePoints)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <h3 className="text-sm font-extrabold text-navy">Points comparison</h3>
                <p className="text-right text-xs text-slate-400">Top five travelers currently shown</p>
              </div>
              {chartEntries.length ? (
                <div className="space-y-4" role="img" aria-label="Bar chart comparing points for the top five travelers currently shown">
                  {chartEntries.map((customer) => {
                    const points = Number(customer.point_balance) || 0;
                    const width = chartMaxPoints > 0 ? Math.max(3, (points / chartMaxPoints) * 100) : 0;
                    return (
                      <div key={`${customer.rank}-${customer.customer_name}`} className="grid grid-cols-[minmax(5rem,8rem)_1fr_auto] items-center gap-3">
                        <span className="truncate text-xs font-semibold text-slate-600">{customer.customer_name || "Traveler"}</span>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-sky-400 transition-all" style={{ width: `${width}%` }} />
                        </div>
                        <span className="min-w-12 text-right text-xs font-extrabold text-primary">{formatPoints(points)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">
                  {loading ? "Loading leaderboard statistics…" : "Statistics will appear when leaderboard data is available."}
                </p>
              )}
            </div>
          </section>

          <section className="bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
              <div><p className="eyebrow">Public ranking</p><h2 className="font-display text-lg font-extrabold text-navy">Top travelers</h2></div>
              <div className="flex items-center gap-2">
                {isMember && <button type="button" onClick={showMyPosition} disabled={locating || loading} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-60">{locating ? "Finding…" : "Show my position"}</button>}
                <button type="button" onClick={() => loadRanking({ refresh: true })} disabled={loading || refreshing || locating} aria-label="Refresh leaderboard" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /><span className="hidden sm:inline">Refresh</span></button>
              </div>
            </div>
            {error && <div role="alert" className="m-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button onClick={() => loadRanking()} className="font-bold underline">Retry</button></div>}
            {loading && customers.length === 0 ? <p className="px-6 py-10 text-center text-sm text-slate-400">Loading leaderboard…</p>
              : customers.length ? customers.map((customer, index) => (
                <div id={Number(customer.rank) === myRank ? `leaderboard-rank-${myRank}` : undefined} key={`${customer.rank}-${customer.customer_name}-${index}`} className={`flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 sm:gap-4 sm:px-6 ${Number(customer.rank) === myRank ? "bg-primary-50 ring-2 ring-inset ring-primary/40" : ""}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${customer.rank <= 3 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{customer.rank}</span>
                  {customer.customer_profile_picture
                    ? <img src={customer.customer_profile_picture} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                    : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-50 font-black text-primary">{customer.customer_name?.charAt(0)?.toUpperCase() || "?"}</span>}
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-navy">{customer.customer_name || "Traveler"}{Number(customer.rank) === myRank && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-black tracking-wide text-white">YOU</span>}</p><p className="mt-1 text-xs text-slate-400">Traveler since {formatDate(customer.customer_joined_at)}</p></div>
                  <div className="text-right"><p className="text-sm font-black text-primary">{formatPoints(customer.point_balance)}</p><p className="text-[10px] font-bold tracking-wider text-slate-400">POINTS</p></div>
                </div>
              )) : !error ? <p className="px-6 py-10 text-center text-sm text-slate-400">No ranking data available yet.</p> : null}
            {pagination?.has_next && <div className="border-t border-slate-100 p-4 sm:px-6"><button type="button" disabled={loadingMore} onClick={() => loadRanking({ nextPage: page + 1 })} className="w-full rounded-lg bg-primary-50 px-4 py-3 text-sm font-bold text-primary hover:bg-primary-100 disabled:opacity-60">{loadingMore ? "Loading…" : "Load more travelers"}</button></div>}
            {pagination && <p className="border-t border-slate-100 px-6 py-3 text-center text-xs text-slate-400">Showing {customers.length} of {pagination.total_items} travelers</p>}
          </section>
        </div>
      </main>
    </>
  );
}
