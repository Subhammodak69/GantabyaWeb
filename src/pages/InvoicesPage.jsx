import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Copy,
  FileText,
  LoaderCircle,
  MoreVertical,
  Plane,
  ReceiptText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { fetchInvoices } from "../api";

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PENDING", label: "Pending" },
];

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatAmount(invoice) {
  const currency = invoice.currency || "INR";
  const amount = Number(invoice.amount || 0);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

function statusKey(value) {
  return String(value || "PENDING").trim().toUpperCase().replace(/[ -]+/g, "_");
}

function statusLabel(value) {
  return String(value || "PENDING").replace(/[_-]+/g, " ");
}

function statusClass(value) {
  const key = statusKey(value);
  if (key === "PAID" || key === "SUCCESS" || key === "COMPLETED") return "border-green-200 bg-green-50 text-green-700";
  if (key === "PARTIALLY_PAID" || key === "PARTIAL") return "border-amber-200 bg-amber-50 text-amber-800";
  if (key === "FAILED" || key === "CANCELLED" || key === "REFUNDED") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function matchesStatus(invoice, filter) {
  if (filter === "ALL") return true;
  const key = statusKey(invoice.status);
  if (filter === "PARTIALLY_PAID") return key === "PARTIALLY_PAID" || key === "PARTIAL";
  if (filter === "PAID") return key === "PAID" || key === "SUCCESS" || key === "COMPLETED";
  return key === filter;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [openActions, setOpenActions] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [copied, setCopied] = useState("");

  const loadInvoices = async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setInvoices(await fetchInvoices());
    } catch (err) {
      setError(err.message || "Could not load bills and invoices.");
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    loadInvoices();
  }, []);

  const visibleInvoices = useMemo(() => {
    const search = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const haystack = `${invoice.invoice_code || ""} ${invoice.destination || ""} ${invoice.description || ""} ${invoice.status || ""}`.toLowerCase();
      return (!search || haystack.includes(search)) && matchesStatus(invoice, statusFilter);
    });
  }, [invoices, query, statusFilter]);

  const paidCount = invoices.filter((invoice) => matchesStatus(invoice, "PAID")).length;
  const pendingCount = invoices.filter((invoice) => statusKey(invoice.status) === "PENDING").length;
  const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  const copyInvoiceCode = async (invoice) => {
    const code = invoice.invoice_code || invoice.id || "";
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied((current) => (current === code ? "" : current)), 1500);
    } catch {
      setError("Could not copy the invoice number.");
    }
    setOpenActions(null);
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <section className="relative overflow-hidden bg-navy px-4 pb-10 pt-10 text-white sm:px-6 lg:px-12">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">Payments & records</p>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Bills <span className="text-primary-300">& invoices</span></h1>
              <p className="mt-1 max-w-xl text-xs text-white/80 sm:text-sm">Track payments and booking documents in one place.</p>
            </div>
            <button type="button" onClick={() => loadInvoices({ refresh: true })} disabled={loading || refreshing} className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard icon={ReceiptText} label="Total records" value={invoices.length} tone="primary" />
          <SummaryCard icon={Check} label="Paid records" value={paidCount} tone="green" />
          <SummaryCard icon={CircleDollarSign} label="Total billed" value={`₹${totalAmount.toLocaleString("en-IN")}`} tone="amber" />
        </div>

        <div className="card mb-6 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block flex-1">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice number, booking or status..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white" />
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button key={filter.value} type="button" onClick={() => setStatusFilter(filter.value)} className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${statusFilter === filter.value ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary"}`}>
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          {pendingCount > 0 && <p className="mt-3 text-[11px] font-semibold text-amber-700">{pendingCount} payment record{pendingCount === 1 ? "" : "s"} need attention.</p>}
        </div>

        {error && <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => loadInvoices()} className="font-bold underline">Try again</button></div>}

        {loading ? (
          <div className="card flex min-h-56 items-center justify-center text-slate-400"><LoaderCircle size={28} className="animate-spin text-primary" /></div>
        ) : visibleInvoices.length ? (
          <div className="space-y-3">
            {visibleInvoices.map((invoice, index) => {
              const code = invoice.invoice_code || invoice.id || `INV-${index + 1}`;
              return (
                <article key={invoice.id || code || index} className={`card relative flex items-center gap-3 p-4 transition hover:border-primary-200 sm:gap-4 sm:p-5 ${selectedInvoice?.id === invoice.id ? "border-primary-300 ring-1 ring-primary-100" : ""}`}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-extrabold text-primary sm:h-11 sm:w-11">{String(index + 1).padStart(2, "0")}</div>
                  <button type="button" onClick={() => setSelectedInvoice(invoice)} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-display text-sm font-bold text-navy sm:text-base">{code}</h2><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass(invoice.status)}`}>{statusLabel(invoice.status)}</span></div>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-600">{invoice.destination || "Travel booking"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays size={13} className="text-primary" />Booked: {formatDate(invoice.booking_date)}</span><span className="inline-flex items-center gap-1"><Plane size={13} className="text-primary" />Travel: {formatDate(invoice.travel_date)}</span></div>
                  </button>
                  <div className="hidden text-right sm:block"><p className="font-display text-base font-extrabold text-navy">{formatAmount(invoice)}</p><button type="button" onClick={() => setSelectedInvoice(invoice)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">View details <ChevronRight size={13} /></button></div>
                  <div className="relative self-start">
                    <button type="button" onClick={() => setOpenActions(openActions === code ? null : code)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={`Actions for ${code}`}><MoreVertical size={18} /></button>
                    {openActions === code && <div className="absolute right-0 top-10 z-10 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-elevated"><button type="button" onClick={() => { setSelectedInvoice(invoice); setOpenActions(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-primary-50 hover:text-primary"><FileText size={14} />View details</button><button type="button" onClick={() => copyInvoiceCode(invoice)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-primary-50 hover:text-primary">{copied === code ? <Check size={14} /> : <Copy size={14} />}{copied === code ? "Copied" : "Copy invoice number"}</button></div>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card p-12 text-center"><ReceiptText className="mx-auto text-primary-300" size={38} /><h2 className="mt-3 font-display text-lg font-bold text-navy">{query || statusFilter !== "ALL" ? "No matching invoices" : "No invoices yet"}</h2><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">Your booking bills and invoices will appear here once a booking is confirmed.</p></div>
        )}
      </section>

      {selectedInvoice && (
        <div className="modal-viewport fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setSelectedInvoice(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title" className="modal-panel flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary"><FileText size={19} /></span>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-primary">Payment details</p><h2 id="invoice-detail-title" className="mt-1 font-display text-xl font-bold text-navy">{selectedInvoice.booking_code || selectedInvoice.invoice_code || "Booking payment"}</h2><p className="mt-1 text-xs text-slate-500">{selectedInvoice.description || selectedInvoice.destination || "Travel booking"}</p></div>
              </div>
              <button type="button" onClick={() => setSelectedInvoice(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800" aria-label="Close invoice details"><X size={16} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Amount" value={formatAmount(selectedInvoice)} />
                <DetailItem label="Status" value={statusLabel(selectedInvoice.status)} />
                <DetailItem label="Transaction type" value={selectedInvoice.transaction_type} />
                <DetailItem label="Category" value={selectedInvoice.category} />
                <DetailItem label="Payment method" value={selectedInvoice.payment_method} />
                <DetailItem label="Currency" value={selectedInvoice.currency || "INR"} />
                <DetailItem label="Transaction date" value={formatDateTime(selectedInvoice.transaction_date)} />
                <DetailItem label="Booking date" value={formatDate(selectedInvoice.booking_date || selectedInvoice.created_at)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const tones = { primary: "bg-primary-50 text-primary", green: "bg-green-50 text-green-600", amber: "bg-amber-50 text-amber-600" };
  return <div className="card flex items-center gap-3 p-4"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 font-display text-xl font-extrabold text-navy">{value}</p></div></div>;
}

function DetailItem({ label, value }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-bold text-navy" title={value}>{value || "Not available"}</p></div>;
}
