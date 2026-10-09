import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, LoaderCircle, Plus, Trash2, X, XCircle } from "lucide-react";
import { acceptQuotation, fetchEnquiryQuotations, rejectQuotation } from "../api";

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
  const [action, setAction] = useState(null);
  const [travellers, setTravellers] = useState([{ full_name: "", gender: "", date_of_birth: "", mobile: "", email: "", relationship_to_customer: "", is_primary: true }]);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  const closeAction = () => {
    if (actionLoading) return;
    setAction(null);
    setRejectReason("");
    setActionError("");
    setTravellers([{ full_name: "", gender: "", date_of_birth: "", mobile: "", email: "", relationship_to_customer: "", is_primary: true }]);
  };

  const openAccept = (quotation) => {
    const customerName = quotation.customer?.name || "";
    setTravellers([{ full_name: customerName, gender: "", date_of_birth: "", mobile: quotation.customer?.mobile || "", email: quotation.customer?.email || "", relationship_to_customer: "Self", is_primary: true }]);
    setActionError("");
    setAction({ type: "accept", quotation });
  };

  const openReject = (quotation) => {
    setRejectReason("");
    setActionError("");
    setAction({ type: "reject", quotation });
  };

  const updateTraveller = (index, field, value) => {
    setTravellers((current) => current.map((traveller, travellerIndex) => travellerIndex === index ? { ...traveller, [field]: value } : traveller));
  };

  const addTraveller = () => {
    setTravellers((current) => [...current, { full_name: "", gender: "", date_of_birth: "", mobile: "", email: "", relationship_to_customer: "", is_primary: false }]);
  };

  const removeTraveller = (index) => {
    setTravellers((current) => current.length === 1 ? current : current.filter((_, travellerIndex) => travellerIndex !== index).map((traveller, travellerIndex) => ({ ...traveller, is_primary: travellerIndex === 0 })));
  };

  const submitAction = async (event) => {
    event.preventDefault();
    if (!action) return;
    setActionError("");
    if (action.type === "accept") {
      const cleanedTravellers = travellers.map((traveller, index) => ({
        ...traveller,
        full_name: traveller.full_name.trim(),
        gender: traveller.gender.trim() || undefined,
        date_of_birth: traveller.date_of_birth || undefined,
        mobile: traveller.mobile.trim() || undefined,
        email: traveller.email.trim() || undefined,
        relationship_to_customer: traveller.relationship_to_customer.trim() || undefined,
        is_primary: index === 0,
      }));
      if (cleanedTravellers.some((traveller) => !traveller.full_name)) {
        setActionError("Enter the full name for every traveller.");
        return;
      }
      setActionLoading(true);
      try {
        await acceptQuotation(action.quotation.id, cleanedTravellers);
        setActionLoading(false);
        closeAction();
        await loadQuotations();
      } catch (submitError) {
        setActionError(submitError.message || "Could not accept this quotation.");
      } finally {
        setActionLoading(false);
      }
      return;
    }

    const reason = rejectReason.trim();
    if (!reason) {
      setActionError("Please tell us why you are declining this quotation.");
      return;
    }
    setActionLoading(true);
    try {
      await rejectQuotation(action.quotation.id, reason);
      setActionLoading(false);
      closeAction();
      await loadQuotations();
    } catch (submitError) {
      setActionError(submitError.message || "Could not reject this quotation.");
    } finally {
      setActionLoading(false);
    }
  };

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
            {["SENT", "VIEWED"].includes(String(quotation.status || "").toUpperCase()) && (
              <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => openReject(quotation)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50">
                  <XCircle size={16} /> Decline quotation
                </button>
                <button type="button" onClick={() => openAccept(quotation)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                  <CheckCircle2 size={16} /> Accept quotation
                </button>
              </div>
            )}
            {quotation.important_notes && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{quotation.important_notes}</p>}
          </article>
        ))}
      </div>

      {action && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-dark/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="quotation-action-title">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-primary">{action.quotation.quotation_code || "Quotation"}</p>
                <h2 id="quotation-action-title" className="mt-1 font-display text-xl font-bold text-navy">{action.type === "accept" ? "Accept quotation" : "Decline quotation"}</h2>
                <p className="mt-1 text-sm text-slate-500">{action.type === "accept" ? "Add the traveller names needed to create your booking." : "Your feedback will be shared with the travel team."}</p>
              </div>
              <button type="button" onClick={closeAction} disabled={actionLoading} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50" aria-label="Close"><X size={20} /></button>
            </div>

            <form onSubmit={submitAction} className="mt-6 space-y-4">
              {action.type === "accept" ? (
                <>
                  {travellers.map((traveller, index) => (
                    <div key={`traveller-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-navy">Traveller {index + 1}{index === 0 ? " · Primary" : ""}</p>{travellers.length > 1 && <button type="button" onClick={() => removeTraveller(index)} className="inline-flex items-center gap-1 text-xs font-bold text-rose-600"><Trash2 size={14} /> Remove</button>}</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Full name *</span><input required value={traveller.full_name} onChange={(event) => updateTraveller(index, "full_name", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="As shown on ID" /></label>
                        <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Gender</span><input value={traveller.gender} onChange={(event) => updateTraveller(index, "gender", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Optional" /></label>
                        <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Date of birth</span><input type="date" value={traveller.date_of_birth} onChange={(event) => updateTraveller(index, "date_of_birth", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
                        <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Mobile</span><input type="tel" value={traveller.mobile} onChange={(event) => updateTraveller(index, "mobile", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
                        <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Email</span><input type="email" value={traveller.email} onChange={(event) => updateTraveller(index, "email", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" /></label>
                        <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Relationship to customer</span><input value={traveller.relationship_to_customer} onChange={(event) => updateTraveller(index, "relationship_to_customer", event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder={index === 0 ? "Self" : "e.g. Spouse, child"} /></label>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addTraveller} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"><Plus size={16} /> Add another traveller</button>
                </>
              ) : (
                <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Reason for declining *</span><textarea required minLength={1} maxLength={2000} rows={5} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Tell us what needs to change..." /><span className="mt-1 block text-right text-xs text-slate-400">{rejectReason.length}/2000</span></label>
              )}
              {actionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{actionError}</p>}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeAction} disabled={actionLoading} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={actionLoading} className={`rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 ${action.type === "accept" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>{actionLoading ? "Submitting…" : action.type === "accept" ? "Accept & create booking" : "Decline quotation"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
