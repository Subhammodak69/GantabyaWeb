import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, FileText, LoaderCircle } from "lucide-react";
import { fetchEnquiryQuotations } from "../api";

function getQuotations(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function formatDate(value) {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(value) {
  if (value === undefined || value === null || value === "") return "—";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString("en-IN")}`
    : String(value);
}

export default function EnquiryQuotationsPage() {
  const { enquiryId } = useParams();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchEnquiryQuotations(enquiryId);
      setQuotations(getQuotations(response));
    } catch (loadError) {
      setError(loadError.message || "Could not load quotations.");
    } finally {
      setLoading(false);
    }
  }, [enquiryId]);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <section className="bg-navy px-4 py-9 text-white sm:px-6 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <Link to={`/my-enquiries/${encodeURIComponent(enquiryId)}`} className="inline-flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white">
            <ArrowLeft size={15} /> Back to enquiry
          </Link>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-primary-200">Travel dashboard</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">Your quotations</h1>
          <p className="mt-2 text-sm text-white/70">Travel options and pricing shared for this enquiry.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-4 px-4 pt-6 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-sm font-semibold text-slate-500">
            <LoaderCircle size={18} className="animate-spin text-primary" /> Loading quotations…
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p>{error}</p>
            <button type="button" onClick={loadQuotations} className="mt-4 rounded-lg bg-rose-700 px-4 py-2 font-bold text-white hover:bg-rose-800">
              Try again
            </button>
          </div>
        ) : quotations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-card">
            <FileText size={36} className="mx-auto text-slate-400" />
            <h2 className="mt-4 font-display text-lg font-bold text-navy">No quotations yet</h2>
            <p className="mt-2 text-sm text-slate-500">Quotations shared for this enquiry will appear here.</p>
          </div>
        ) : quotations.map((quotation) => (
          <article key={quotation.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-primary">{quotation.quotation_code || "Quotation"}</p>
                <h2 className="mt-1 font-display text-lg font-bold text-navy">{quotation.tour_name || "Travel quotation"}</h2>
              </div>
              <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-primary">
                {String(quotation.status || "PENDING").replace(/_/g, " ")}
              </span>
            </div>

            <div className="flex items-center gap-2 py-4 text-xs text-slate-600">
              <CalendarDays size={15} className="text-primary" />
              {formatDate(quotation.travel_date)}
              {quotation.return_date ? ` – ${formatDate(quotation.return_date)}` : ""}
            </div>

            {quotation.items?.length > 0 && (
              <div className="divide-y divide-slate-100">
                {quotation.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy">{item.name || "Quotation item"}</p>
                      {item.description && <p className="mt-1 text-xs text-slate-500">{item.description}</p>}
                      {item.quantity != null && <p className="mt-1 text-[10px] text-slate-400">Qty: {item.quantity}</p>}
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-700">{formatAmount(item.total_price ?? item.unit_price)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="text-[10px] text-slate-500">
                <p>Valid until {formatDate(quotation.valid_until)}</p>
                {quotation.version ? <p className="mt-1">Version {quotation.version}</p> : null}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total</p>
                <p className="mt-1 text-xl font-extrabold text-primary">{formatAmount(quotation.total_amount)}</p>
              </div>
            </div>
            {quotation.important_notes && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{quotation.important_notes}</p>}
          </article>
        ))}
      </div>
    </main>
  );
}
