import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addCustomerTourTraveller,
  deleteCustomerTourTraveller,
  downloadDocumentFile,
  fetchBookingDocuments,
  fetchCustomerTour,
  fetchDocumentFile,
  updateCustomerTourTraveller,
} from "../api";
import { ArrowLeft, Calendar, Download, Eye, FileText, LoaderCircle, Plus, Trash2, Users, X } from "lucide-react";

const emptyTraveller = {
  full_name: "",
  gender: "",
  date_of_birth: "",
  mobile: "",
  email: "",
  relationship_to_customer: "",
  is_primary: false,
};

function formatDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Date to be confirmed";
}

function unwrapTour(response) {
  const data = response?.data;
  return Array.isArray(data) ? data[0] || null : data || null;
}

export default function CustomerTripDetailsPage() {
  const { bookingId } = useParams();
  const [tour, setTour] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [bookingDocuments, setBookingDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [documentRequestVersion, setDocumentRequestVersion] = useState(0);
  const [error, setError] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [bookingPreview, setBookingPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [traveller, setTraveller] = useState(emptyTraveller);
  const [editingTraveller, setEditingTraveller] = useState(null);
  const [travellerOpen, setTravellerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => {
    if (bookingPreview?.url) URL.revokeObjectURL(bookingPreview.url);
  }, [bookingPreview]);

  const loadTour = useCallback(async () => {
    setDetailLoading(true);
    setError("");
    setTour(null);
    setActiveTab("details");
    setBookingDocuments([]);
    setDocumentsLoaded(false);
    setDocumentError("");
    setBookingPreview(null);
    try {
      const detail = unwrapTour(await fetchCustomerTour(bookingId));
      if (!detail) throw new Error("Booking details were not found.");
      setTour(detail);
    } catch (err) {
      setError(err.message || "Unable to load booking details.");
      setTour(null);
    } finally {
      setDetailLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadTour();
  }, [loadTour]);

  useEffect(() => {
    if (activeTab !== "documents" || documentsLoaded || !bookingId) return;
    let active = true;
    const loadDocuments = async () => {
      setDocumentsLoading(true);
      setDocumentError("");
      try {
        const response = await fetchBookingDocuments(bookingId);
        if (active) {
          const data = response?.data;
          setBookingDocuments(Array.isArray(data) ? data : data?.items || []);
          setDocumentsLoaded(true);
        }
      } catch (err) {
        if (active) setDocumentError(err.message || "Unable to load booking documents.");
      } finally {
        if (active) setDocumentsLoading(false);
      }
    };
    loadDocuments();
    return () => { active = false; };
  }, [activeTab, bookingId, documentsLoaded, documentRequestVersion]);

  const openTraveller = (item = null) => {
    setEditingTraveller(item);
    setTraveller(item ? {
      full_name: item.full_name || "",
      gender: item.gender || "",
      date_of_birth: item.date_of_birth || "",
      mobile: item.mobile || "",
      email: item.email || "",
      relationship_to_customer: item.relationship_to_customer || "",
      is_primary: Boolean(item.is_primary),
    } : { ...emptyTraveller });
    setTravellerOpen(true);
  };

  const saveTraveller = async (event) => {
    event.preventDefault();
    if (!tour || !traveller.full_name.trim()) return;
    setSaving(true);
    setError("");
    const payload = {
      full_name: traveller.full_name.trim(),
      gender: traveller.gender.trim() || null,
      date_of_birth: traveller.date_of_birth.trim() || null,
      mobile: traveller.mobile.trim() || null,
      email: traveller.email.trim() || null,
      relationship_to_customer: traveller.relationship_to_customer.trim() || null,
      is_primary: traveller.is_primary,
    };
    try {
      if (editingTraveller) await updateCustomerTourTraveller(tour.id, editingTraveller.id, payload);
      else await addCustomerTourTraveller(tour.id, payload);
      const response = unwrapTour(await fetchCustomerTour(tour.id));
      if (response) setTour(response);
      setTravellerOpen(false);
    } catch (err) {
      setError(err.message || "Could not save traveller.");
    } finally {
      setSaving(false);
    }
  };

  const removeTraveller = async (item) => {
    if (!tour || !window.confirm(`Remove ${item.full_name} from this booking?`)) return;
    setError("");
    try {
      await deleteCustomerTourTraveller(tour.id, item.id);
      const response = unwrapTour(await fetchCustomerTour(tour.id));
      if (response) setTour(response);
    } catch (err) {
      setError(err.message || "Could not remove traveller.");
    }
  };

  const previewBookingDocument = async (doc) => {
    setPreviewLoading(true);
    setDocumentError("");
    try {
      const { blob, fileName, mimeType } = await fetchDocumentFile(doc.file_url, {
        fileName: doc.file_name || doc.title || "document",
        mimeType: doc.mime_type || "",
      });
      setBookingPreview({ url: URL.createObjectURL(blob), fileName, mimeType });
    } catch (err) {
      setDocumentError(err.message || "Unable to open booking document.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadBookingDocument = async (doc) => {
    setDocumentError("");
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
      setDocumentError(err.message || "Unable to download booking document.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <section className="bg-navy px-4 py-8 text-white sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-5xl">
          <Link to="/my-trips" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white">
            <ArrowLeft size={16} /> Back to My Trips
          </Link>
          {detailLoading ? (
            <div className="flex items-center gap-3 py-4"><LoaderCircle className="animate-spin text-primary-300" /><span>Loading booking…</span></div>
          ) : tour ? (
            <>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">Booking details</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{tour.destination_name || tour.package?.name || "Your journey"}</h1>
                <span className="rounded-full border border-primary-200/40 bg-primary-300/10 px-3 py-1 text-[10px] font-bold uppercase text-primary-200">
                  {tour.status || "TENTATIVE"}
                </span>
              </div>
              <p className="mt-2 text-sm text-white/75">
                {tour.booking_code || "Booking"}{tour.package?.name ? ` · ${tour.package.name}` : ""}{tour.variant?.name ? ` · ${tour.variant.name}` : ""}
              </p>
            </>
          ) : (
            <div role="alert" className="rounded-xl border border-red-200/30 bg-red-950/30 p-4 text-sm text-red-100">
              {error || "Unable to load booking details."}
            </div>
          )}
        </div>
      </section>

      {tour && (
        <>
          <nav className="sticky top-14 z-20 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6" aria-label="Booking sections">
            <div className="mx-auto flex max-w-5xl gap-1" role="tablist" aria-label="Booking information">
              {[
                { id: "details", label: "Trip details", icon: Calendar },
                { id: "documents", label: "Documents", icon: FileText },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  id={`booking-${id}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  aria-controls={`booking-${id}-panel`}
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-4 text-sm font-bold transition-colors ${activeTab === id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-navy"}`}
                >
                  <Icon size={16} /> {label}
                  {id === "documents" && documentsLoaded && <span className="text-xs opacity-70">{bookingDocuments.length}</span>}
                </button>
              ))}
            </div>
          </nav>

          {activeTab === "details" ? (
            <section id="booking-details-panel" role="tabpanel" aria-labelledby="booking-details-tab" className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
              {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Departure", formatDate(tour.departure_date)],
                  ["Return", formatDate(tour.return_date)],
                  ["Total", `₹${tour.total_amount ?? "0"}`],
                  ["Due", `₹${tour.due_amount ?? "0"}`],
                ].map(([label, value]) => (
                  <div key={label} className="card p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-bold text-navy">{value}</p>
                  </div>
                ))}
              </div>

              <div className="card mt-5 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold text-navy">Travellers</h2>
                  <button type="button" onClick={() => openTraveller()} className="flex items-center gap-1 text-xs font-bold text-primary">
                    <Plus size={15} /> Add traveller
                  </button>
                </div>
                <div className="mt-3 divide-y divide-slate-100">
                  {(tour.travellers || []).length ? tour.travellers.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary"><Users size={16} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-navy">{item.full_name}{item.is_primary ? " · Primary" : ""}</p>
                        <p className="truncate text-xs text-slate-500">{item.email || item.mobile || item.relationship_to_customer || "Traveller details"}</p>
                      </div>
                      <button type="button" onClick={() => openTraveller(item)} className="text-xs font-bold text-primary">Edit</button>
                      <button type="button" onClick={() => removeTraveller(item)} className="text-red-500" aria-label={`Remove ${item.full_name}`}><Trash2 size={16} /></button>
                    </div>
                  )) : <p className="py-4 text-sm text-slate-500">No travellers added yet.</p>}
                </div>
              </div>
            </section>
          ) : (
            <section id="booking-documents-panel" role="tabpanel" aria-labelledby="booking-documents-tab" className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
              {documentError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{documentError}</div>}
              <div className="card p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Booking files</p>
                    <h2 className="mt-1 font-display text-xl font-bold text-navy">Documents</h2>
                  </div>
                  {documentsLoaded && <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary">{bookingDocuments.length}</span>}
                </div>
                {documentsLoading ? (
                  <div className="flex justify-center p-10"><LoaderCircle className="animate-spin text-primary" size={22} /></div>
                ) : bookingDocuments.length ? (
                  <div className="mt-4 divide-y divide-slate-100">
                    {bookingDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 py-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary"><FileText size={18} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-navy">{doc.title || doc.file_name || "Booking document"}</p>
                          <p className="text-xs text-slate-500">
                            {(doc.document_type || "DOCUMENT").replaceAll("_", " ")}
                            {doc.uploaded_at ? ` · ${formatDate(doc.uploaded_at)}` : ""}
                          </p>
                        </div>
                        <button type="button" onClick={() => previewBookingDocument(doc)} disabled={previewLoading} className="rounded-lg p-2 text-primary hover:bg-primary-50 disabled:opacity-50" aria-label={`View ${doc.title || "document"}`} title="View document">
                          {previewLoading ? <LoaderCircle size={17} className="animate-spin" /> : <Eye size={17} />}
                        </button>
                        <button type="button" onClick={() => downloadBookingDocument(doc)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Download ${doc.title || "document"}`} title="Download document">
                          <Download size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    <p>{documentError ? "Documents could not be loaded." : "No documents are available for this booking yet."}</p>
                    {documentError && (
                      <button
                        type="button"
                        onClick={() => setDocumentRequestVersion((version) => version + 1)}
                        className="mt-2 font-semibold text-primary hover:underline"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {bookingPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setBookingPreview(null)}>
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Booking document</p>
                <p className="truncate text-sm font-semibold text-navy">{bookingPreview.fileName}</p>
              </div>
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
                  <label key={key} className="text-xs font-bold text-slate-600">
                    {label}
                    <input
                      required={key === "full_name"}
                      value={traveller[key]}
                      onChange={(event) => setTraveller((current) => ({ ...current, [key]: event.target.value }))}
                      placeholder={placeholder}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-primary"
                    />
                  </label>
                ))}
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={traveller.is_primary} onChange={(event) => setTraveller((current) => ({ ...current, is_primary: event.target.checked }))} />
                Primary traveller
              </label>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button disabled={saving} className="btn-primary flex w-full items-center justify-center gap-2">
                {saving && <LoaderCircle size={16} className="animate-spin" />}
                {editingTraveller ? "Save changes" : "Add traveller"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
