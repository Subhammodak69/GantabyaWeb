import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { addCustomerTourTraveller, deleteCustomerTourTraveller, downloadDocumentFile, fetchBookingDocuments, fetchCustomerTour, fetchCustomerTours, fetchDocumentFile, updateCustomerTourTraveller } from "../api";
import { Calendar, ChevronRight, Download, Eye, FileText, LoaderCircle, Plane, Plus, Trash2, Users, X } from "lucide-react";

function formatDate(value) {
  const d = new Date(value);
  return value && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Date to be confirmed";
}

function unwrapTour(response) {
  const data = response?.data;
  return Array.isArray(data) ? data[0] || null : data || null;
}

const emptyTraveller = { full_name: "", gender: "", date_of_birth: "", mobile: "", email: "", relationship_to_customer: "", is_primary: false };

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [traveller, setTraveller] = useState(emptyTraveller);
  const [editingTraveller, setEditingTraveller] = useState(null);
  const [travellerOpen, setTravellerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bookingDocuments, setBookingDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [bookingPreview, setBookingPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => () => {
    if (bookingPreview?.url) URL.revokeObjectURL(bookingPreview.url);
  }, [bookingPreview]);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const response = await fetchCustomerTours(1, 20);
      const data = response?.data;
      setTrips(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setError(err.message || "Unable to load your bookings.");
      setTrips([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadTrips(); }, []);

  const openTour = async (tour) => {
    setSelectedTour(tour); setDetailLoading(true); setDocumentsLoading(true); setBookingDocuments([]); setError("");
    try {
      const detail = unwrapTour(await fetchCustomerTour(tour.id));
      if (detail) setSelectedTour(detail);
      const response = await fetchBookingDocuments(tour.id);
      setBookingDocuments(Array.isArray(response?.data) ? response.data : []);
    } catch (err) { setError(err.message || "Unable to load booking details."); }
    finally { setDetailLoading(false); setDocumentsLoading(false); }
  };

  const previewBookingDocument = async (doc) => {
    setPreviewLoading(true);
    setError("");
    try {
      const { blob, fileName, mimeType } = await fetchDocumentFile(doc.file_url, {
        fileName: doc.file_name || doc.title || "document",
        mimeType: doc.mime_type || "",
      });
      setBookingPreview({ url: URL.createObjectURL(blob), fileName, mimeType });
    } catch (err) {
      setError(err.message || "Unable to open booking document.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadBookingDocument = async (doc) => {
    try {
      const { blob, fileName } = await downloadDocumentFile(doc.id, {
        fileName: doc.file_name || doc.title || "document",
        mimeType: doc.mime_type || "",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName || doc.file_name || "document";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message || "Unable to download booking document.");
    }
  };

  const openTraveller = (item = null) => {
    setEditingTraveller(item);
    setTraveller(item ? {
      full_name: item.full_name || "", gender: item.gender || "", date_of_birth: item.date_of_birth || "", mobile: item.mobile || "", email: item.email || "", relationship_to_customer: item.relationship_to_customer || "", is_primary: Boolean(item.is_primary),
    } : { ...emptyTraveller });
    setTravellerOpen(true);
  };

  const saveTraveller = async (event) => {
    event.preventDefault();
    if (!selectedTour || !traveller.full_name.trim()) return;
    setSaving(true); setError("");
    const payload = { full_name: traveller.full_name.trim(), gender: traveller.gender.trim() || null, date_of_birth: traveller.date_of_birth.trim() || null, mobile: traveller.mobile.trim() || null, email: traveller.email.trim() || null, relationship_to_customer: traveller.relationship_to_customer.trim() || null, is_primary: traveller.is_primary };
    try {
      if (editingTraveller) await updateCustomerTourTraveller(selectedTour.id, editingTraveller.id, payload);
      else await addCustomerTourTraveller(selectedTour.id, payload);
      setSelectedTour(unwrapTour(await fetchCustomerTour(selectedTour.id)) || selectedTour);
      setTravellerOpen(false);
    } catch (err) { setError(err.message || "Could not save traveller."); }
    finally { setSaving(false); }
  };

  const removeTraveller = async (item) => {
    if (!selectedTour || !window.confirm(`Remove ${item.full_name} from this booking?`)) return;
    setError("");
    try {
      await deleteCustomerTourTraveller(selectedTour.id, item.id);
      setSelectedTour(unwrapTour(await fetchCustomerTour(selectedTour.id)) || selectedTour);
    } catch (err) { setError(err.message || "Could not remove traveller."); }
  };

  const tripCount = (trip) => trip.travellers?.length || 1;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <section className="relative flex min-h-[220px] items-center overflow-hidden bg-navy px-4 pb-8 pt-8 text-white sm:px-6 lg:px-12"><div className="relative z-10 mx-auto w-full max-w-7xl"><p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">Bookings & Itineraries</p><h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">My <span className="text-primary-300">Trips</span></h1><p className="mt-1 max-w-xl text-xs text-white/80 sm:text-sm">Track bookings, payment status, and travellers for every journey.</p></div></section>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && !selectedTour && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading ? <div className="card flex items-center justify-center p-12 text-slate-400"><LoaderCircle className="animate-spin text-primary" size={26} /></div> : trips.length ? <div className="grid gap-5 md:grid-cols-2">{trips.map((trip) => <article key={trip.id} className="card flex flex-col justify-between p-6"><div><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-primary">{trip.booking_code || "PLANNED TRIP"}</span><span className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-primary">{trip.status || "TENTATIVE"}</span></div><h2 className="font-display text-xl font-bold text-navy">{trip.destination_name || trip.package?.name || "Custom Journey"}</h2><p className="mt-1 text-xs text-slate-500">{trip.package?.name || ""}{trip.variant?.name ? ` • ${trip.variant.name}` : ""}</p><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><div className="flex items-center gap-1.5"><Calendar size={14} className="text-primary" /><span>{formatDate(trip.departure_date)}</span></div><div className="flex items-center gap-1.5"><Users size={14} className="text-primary" /><span>{tripCount(trip)} Traveller{tripCount(trip) === 1 ? "" : "s"}</span></div></div></div><button type="button" onClick={() => openTour(trip)} className="mt-5 flex items-center justify-end gap-1 border-t border-slate-100 pt-3 text-xs font-bold text-primary hover:underline">View booking details <ChevronRight size={15} /></button></article>)}</div> : <div className="card p-12 text-center"><Plane className="mx-auto text-primary-300" size={36} /><h2 className="mt-3 font-display text-lg font-bold text-navy">No Trips Scheduled Yet</h2><p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">Your customer-tour bookings will appear here once they are created.</p><Link to="/tours" className="btn-primary mt-6 text-xs font-bold">Explore Available Tours →</Link></div>}
      </section>

      {selectedTour && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && setSelectedTour(null)}>
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Booking details</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-navy">{selectedTour.booking_code || "Your booking"}</h2>
              </div>
              <button type="button" onClick={() => setSelectedTour(null)} className="rounded-full bg-slate-100 p-2 text-slate-600" aria-label="Close booking details"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              {detailLoading ? (
                <div className="flex justify-center p-12"><LoaderCircle className="animate-spin text-primary" /></div>
              ) : (
                <>
                  {error && <div className="mt-1 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                  <h3 className="mt-3 font-display text-xl font-bold text-navy">{selectedTour.destination_name || selectedTour.package?.name || "Your journey"}</h3>
                  <p className="mt-1 text-xs text-slate-500">{selectedTour.package?.name || ""}{selectedTour.variant?.name ? ` • ${selectedTour.variant.name}` : ""}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[["Departure", formatDate(selectedTour.departure_date)], ["Return", formatDate(selectedTour.return_date)], ["Total", `₹${selectedTour.total_amount ?? "0"}`], ["Due", `₹${selectedTour.due_amount ?? "0"}`]].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-navy">{value}</p></div>
                    ))}
                  </div>
                  <div className="mt-7 flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-navy">Travellers</h3>
                    <button type="button" onClick={() => openTraveller()} className="flex items-center gap-1 text-xs font-bold text-primary"><Plus size={15} /> Add traveller</button>
                  </div>
                  <div className="mt-3 divide-y divide-slate-100">
                    {(selectedTour.travellers || []).length ? selectedTour.travellers.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary"><Users size={16} /></div>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-navy">{item.full_name}{item.is_primary ? " · Primary" : ""}</p><p className="truncate text-xs text-slate-500">{item.email || item.mobile || item.relationship_to_customer || "Traveller details"}</p></div>
                        <button type="button" onClick={() => openTraveller(item)} className="text-xs font-bold text-primary">Edit</button>
                        <button type="button" onClick={() => removeTraveller(item)} className="text-red-500" aria-label={`Remove ${item.full_name}`}><Trash2 size={16} /></button>
                      </div>
                    )) : <p className="py-4 text-sm text-slate-500">No travellers added yet.</p>}
                  </div>
                  <div className="mt-7">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-lg font-bold text-navy">Booking documents</h3>
                      <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold text-primary">{bookingDocuments.length}</span>
                    </div>
                    {documentsLoading ? (
                      <div className="flex justify-center p-6"><LoaderCircle className="animate-spin text-primary" size={20} /></div>
                    ) : bookingDocuments.length ? (
                      <div className="mt-2 divide-y divide-slate-100">
                        {bookingDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-3 py-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary"><FileText size={16} /></span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-navy">{doc.title || doc.file_name || "Booking document"}</p>
                              <p className="text-xs text-slate-500">{(doc.document_type || "DOCUMENT").replaceAll("_", " ")}{doc.uploaded_at ? ` · ${formatDate(doc.uploaded_at)}` : ""}</p>
                            </div>
                            <button type="button" onClick={() => previewBookingDocument(doc)} disabled={previewLoading} className="rounded-lg p-2 text-primary hover:bg-primary-50 disabled:opacity-50" aria-label={`View ${doc.title || "document"}`} title="View document">
                              {previewLoading ? <LoaderCircle size={16} className="animate-spin" /> : <Eye size={16} />}
                            </button>
                            <button type="button" onClick={() => downloadBookingDocument(doc)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Download ${doc.title || "document"}`} title="Download document"><Download size={16} /></button>
                          </div>
                        ))}
                      </div>
                    ) : <p className="mt-2 rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">No documents are available for this booking yet.</p>}
                  </div>
                </>
              )}
            </div>
            <div className="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <button type="button" onClick={() => setSelectedTour(null)} className="btn-ghost text-xs font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}

      {bookingPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setBookingPreview(null)}>
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-primary">Booking document</p><p className="truncate text-sm font-semibold text-navy">{bookingPreview.fileName}</p></div>
              <button type="button" onClick={() => setBookingPreview(null)} className="rounded-full bg-slate-100 p-2 text-slate-600" aria-label="Close document preview"><X size={18} /></button>
            </div>
            <div className="flex min-h-[50vh] flex-1 items-center justify-center overflow-auto bg-slate-900 p-3">
              {bookingPreview.mimeType.includes("pdf") || bookingPreview.fileName.toLowerCase().endsWith(".pdf")
                ? <iframe title={bookingPreview.fileName} src={bookingPreview.url} className="h-[75vh] w-full rounded-lg bg-white" />
                : bookingPreview.mimeType.startsWith("image/")
                  ? <img src={bookingPreview.url} alt={bookingPreview.fileName} className="max-h-[75vh] max-w-full object-contain" />
                  : bookingPreview.mimeType.startsWith("video/")
                    ? <video src={bookingPreview.url} controls className="max-h-[75vh] max-w-full" />
                    : <p className="text-sm text-white">Preview is not available for this file type. Use Download to save it.</p>}
            </div>
          </div>
        </div>
      )}

      {travellerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <form onSubmit={saveTraveller} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-display text-xl font-bold text-navy">{editingTraveller ? "Edit traveller" : "Add traveller"}</h2>
              <button type="button" onClick={() => setTravellerOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-600" aria-label="Close traveller form"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {[["full_name", "Full name", "Enter full name"], ["gender", "Gender", "e.g. Male"], ["date_of_birth", "Date of birth", "YYYY-MM-DD"], ["mobile", "Mobile", "Mobile number"], ["email", "Email", "Email address"], ["relationship_to_customer", "Relationship", "e.g. Spouse"]].map(([key, label, placeholder]) => (
                  <label key={key} className="text-xs font-bold text-slate-600">{label}<input required={key === "full_name"} value={traveller[key]} onChange={(event) => setTraveller((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-primary" /></label>
                ))}
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={traveller.is_primary} onChange={(event) => setTraveller((current) => ({ ...current, is_primary: event.target.checked }))} /> Primary traveller</label>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button disabled={saving} className="btn-primary flex w-full items-center justify-center gap-2">{saving && <LoaderCircle size={16} className="animate-spin" />}{editingTraveller ? "Save changes" : "Add traveller"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
