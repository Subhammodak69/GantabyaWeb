import { useCallback, useEffect, useState } from "react";
import { Award, ArrowDownLeft, ArrowUpRight, Clock3, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { fetchAccountPoints } from "../api";

const PAGE_SIZE = 20;

function formatPoints(value) {
  const points = Number(value);
  return Number.isFinite(points) ? points.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : String(value ?? "0");
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function CustomerRow({ customer }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      {customer.customer_profile_picture
        ? <img src={customer.customer_profile_picture} alt="" className="h-10 w-10 rounded-full object-cover" />
        : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-50 text-sm font-black text-primary">{customer.customer_name?.charAt(0)?.toUpperCase() || "?"}</div>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-navy">{customer.customer_name || "Traveler"}</p>
        <p className="mt-0.5 text-xs text-slate-400">Joined {formatDate(customer.customer_joined_at)}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-extrabold text-primary">#{customer.rank}</p>
        <p className="text-xs text-slate-500">{formatPoints(customer.point_balance)} pts</p>
      </div>
    </div>
  );
}

export default function PointsPage() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadPoints = useCallback(async ({ page = 1, refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else if (page > 1) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetchAccountPoints(page, PAGE_SIZE);
      if (!response?.data) throw new Error(response?.message || "Points could not be loaded.");
      setAccount((current) => page === 1 || !current
        ? response.data
        : { ...response.data, transactions: [...current.transactions, ...response.data.transactions] });
    } catch (loadError) {
      setError(loadError.message || "Points could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadPoints(); }, [loadPoints]);

  const transactions = account?.transactions || [];
  const pagination = account?.transaction_pagination;

  return (
    <>
      <Seo title="Travel Points | Gantabyaa" description="View your Gantabyaa travel points, account rank and points transactions." path="/points" robots="noindex,nofollow" />
      <main className="min-h-screen bg-slate-50 pb-12">
        <section className="bg-navy px-4 pb-9 pt-9 text-white sm:px-6 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-200">Your account</p>
            <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">Travel points</h1><p className="mt-1 text-sm text-white/70">Track rewards earned on your Gantabyaa journeys.</p></div>
              <button type="button" onClick={() => loadPoints({ refresh: true })} disabled={loading || refreshing} className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 disabled:opacity-60"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />Refresh</button>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <section className="-mt-4 flex flex-col justify-between gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available points</p>
              <p className="mt-1 font-display text-4xl font-black text-navy">{account ? formatPoints(account.points_balance) : loading ? "Loading…" : "—"}</p>
              {account && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"><Award size={14} />Your rank · #{account.rank}</p>}
            </div>
            <Link to="/leaderboard" className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700"><Award size={17} />View public leaderboard</Link>
          </section>

          {error && <div role="alert" className="mt-5 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button onClick={() => loadPoints()} className="font-bold underline">Retry</button></div>}

          <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <section>
              <p className="eyebrow">Your community</p>
              <h2 className="section-title mb-3">Travelers around you</h2>
              <div className="rounded-xl border border-slate-200 bg-white px-4 shadow-card">
                {account?.around?.length ? account.around.map((customer, index) => <CustomerRow key={`${customer.rank}-${customer.customer_name}-${index}`} customer={customer} />)
                  : loading ? <p className="py-6 text-sm text-slate-400">Loading nearby rankings…</p>
                    : <p className="py-6 text-sm text-slate-400">No nearby ranking available yet.</p>}
              </div>
            </section>

            <section>
              <div className="flex items-end justify-between border-b border-slate-200 pb-3">
                <div><p className="eyebrow">Points activity</p><h2 className="section-title">Transactions</h2></div>
                <p className="text-xs font-semibold text-slate-500">{pagination?.total_items ?? transactions.length} total</p>
              </div>
              <div className="mt-1 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4 shadow-card">
                {loading && !account ? <p className="py-6 text-sm text-slate-400">Loading transactions…</p>
                  : transactions.length ? transactions.map((transaction) => {
                    const points = Number(transaction.points) || 0;
                    return (
                      <div key={transaction.id} className="flex items-center gap-3 py-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${points >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                          {points >= 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-navy">{transaction.tour_title || transaction.reason || transaction.transaction_type?.replace(/_/g, " ")}</p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Clock3 size={12} />{transaction.booking_code ? `${transaction.booking_code} · ` : ""}{formatDate(transaction.created_at)}</p>
                        </div>
                        <p className={`shrink-0 text-sm font-extrabold ${points < 0 ? "text-amber-600" : "text-emerald-600"}`}>{points > 0 ? "+" : ""}{formatPoints(points)} pts</p>
                      </div>
                    );
                  }) : !error ? <p className="py-6 text-sm text-slate-400">No points transactions yet.</p> : null}
              </div>
              {pagination?.has_next && <button type="button" disabled={loadingMore} onClick={() => loadPoints({ page: (pagination.current_page || 1) + 1 })} className="mt-4 w-full rounded-lg bg-primary-50 px-4 py-3 text-sm font-bold text-primary hover:bg-primary-100 disabled:opacity-60">{loadingMore ? "Loading…" : "Load more transactions"}</button>}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
