import { useEffect, useRef, useState } from "react";
import {
  Download, Eye, FileText, FolderUp, LoaderCircle, Trash2, Upload, X,
  Shield, CreditCard, Ticket, FileCheck, CheckCircle2, Plus
} from "lucide-react";
import { fetchDocuments, uploadDocument, downloadDocumentFile, fetchDocumentFile, deleteDocument, uploadFile } from "../api";
import CustomSelect from "../components/CustomSelect";

const DOCUMENT_TYPES = [
  { value: "ID_PROOF", label: "ID Proof" },
  { value: "PASSPORT", label: "Passport" },
  { value: "VISA", label: "Visa" },
  { value: "TICKET", label: "Travel Ticket / Flight" },
  { value: "INSURANCE", label: "Travel Insurance" },
  { value: "OTHER", label: "Other Documents" },
];

const TYPE_CONFIG = {
  ID_PROOF: { label: "ID Proof", color: "bg-blue-50 text-primary border-primary-200", icon: CreditCard },
  PASSPORT: { label: "Passport", color: "bg-accent-50 text-accent border-accent/20", icon: Shield },
  VISA: { label: "Visa", color: "bg-green-50 text-success border-green-200", icon: FileCheck },
  TICKET: { label: "Ticket", color: "bg-purple-50 text-purple-700 border-purple-200", icon: Ticket },
  INSURANCE: { label: "Insurance", color: "bg-amber-50 text-amber-800 border-amber-200", icon: Shield },
  OTHER: { label: "Document", color: "bg-slate-100 text-slate-700 border-slate-200", icon: FileText },
};

const EMPTY_FORM = {
  fileUrl: "", fileName: "", fileSize: 0, fileType: "", documentType: "ID_PROOF", title: "", description: ""
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatSize = (value) => {
  if (!value) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DocumentsPage() {
  const fileInput = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState("incoming");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadDocuments = () => {
    setLoading(true);
    fetchDocuments()
      .then((response) => {
        const data = response?.data;
        setDocuments(Array.isArray(data) ? data : data?.items || data?.results || []);
      })
      .catch((err) => setError(err.message || "Could not load travel documents."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    loadDocuments();
  }, []);

  const isOutgoing = (doc) => {
    if (doc.type) return String(doc.type).toLowerCase() === "outgoing";
    if (doc.direction) return doc.direction === "outgoing";
    return doc.uploaded_by === "CUSTOMER" || doc.uploaded_by === "customer";
  };

  const incomingDocs = documents.filter((doc) => !isOutgoing(doc));
  const outgoingDocs = documents.filter((doc) => isOutgoing(doc));

  const currentTabDocuments = activeTab === "outgoing" ? outgoingDocs : incomingDocs;
  const visibleDocuments = selectedTypeFilter === "ALL"
    ? currentTabDocuments
    : currentTabDocuments.filter((doc) => doc.document_type === selectedTypeFilter);

  const setField = (name, value) => setForm((curr) => ({ ...curr, [name]: value }));
  
  const closeModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const response = await uploadFile(file);
      const data = response?.data;
      if (!data?.url) throw new Error("Upload did not return a file URL.");
      setForm((curr) => ({
        ...curr,
        fileUrl: data.url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        title: curr.title || file.name.replace(/\.[^/.]+$/, ""),
      }));
    } catch (err) {
      setError(err.message || "Could not upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e) => { handleFile(e.target.files?.[0]); e.target.value = ""; };
  const onDrop = (e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files?.[0]); };
  const onDragOver = (e) => { e.preventDefault(); if (!uploading) setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragActive(false); };
  
  const clearFile = () => {
    setForm((curr) => ({ ...curr, fileUrl: "", fileName: "", fileSize: 0, fileType: "" }));
    if (fileInput.current) fileInput.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (uploading) return setError("Please wait for the file to finish uploading.");
    if (!form.fileUrl) return setError("Choose a document file before submitting.");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await uploadDocument({
        fileUrl: form.fileUrl,
        documentType: form.documentType,
        title: form.title || form.fileName,
        description: form.description,
      });
      setNotice("Document uploaded successfully.");
      closeModal();
      loadDocuments();
    } catch (err) {
      setError(err.message || "Could not upload document.");
    } finally {
      setBusy(false);
    }
  };

  const download = async (doc) => {
    setDownloadingId(doc.id);
    setError("");
    setNotice("");
    try {
      const { blob, fileName } = await downloadDocumentFile(doc.id, {
        fileName: doc.file_name || doc.title || "document",
        mimeType: doc.mime_type || "",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName || doc.file_name || "document";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`${fileName || doc.file_name || "Document"} downloaded successfully.`);
    } catch (err) {
      setError(err.message || "Could not download document.");
    } finally {
      setDownloadingId(null);
    }
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const previewDocument = async (doc) => {
    setPreviewLoading(true);
    setError("");
    try {
      const { blob, fileName, mimeType } = await fetchDocumentFile(doc.file_url, {
        fileName: doc.file_name || doc.title || "document",
        mimeType: doc.mime_type || "",
      });
      const url = URL.createObjectURL(blob);
      setPreview({
        url,
        fileName: fileName || doc.file_name || "document",
        mimeType: mimeType || doc.mime_type || "application/octet-stream",
      });
    } catch (err) {
      setError(err.message || "Could not load document preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const savePreview = () => {
    if (!preview?.url) return;
    const anchor = document.createElement("a");
    anchor.href = preview.url;
    anchor.download = preview.fileName;
    anchor.click();
  };

  const previewKind = preview
    ? preview.mimeType.startsWith("image/")
      ? "image"
      : preview.mimeType === "application/pdf" || preview.fileName.toLowerCase().endsWith(".pdf")
        ? "pdf"
        : "file"
    : "file";

  const remove = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.title || doc.file_name || "this document"}"?`)) return;
    try {
      await deleteDocument(doc.id);
      setDocuments((curr) => curr.filter((item) => item.id !== doc.id));
      setNotice("Document removed.");
    } catch (err) {
      setError(err.message || "Could not delete document.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Top Hero Banner in Thomas Cook Deep Navy */}
      <section className="relative flex min-h-[220px] items-center overflow-hidden bg-navy px-4 pb-8 pt-8 text-white sm:px-6 lg:px-12">
        <div className="relative z-10 mx-auto w-full max-w-7xl flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">
              Travel Records & Files
            </p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Document <span className="text-primary-300">Vault</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-white/80 max-w-xl">
              Access tickets, vouchers, visas, and IDs securely. Keep all your travel papers organized for your upcoming journeys.
            </p>
          </div>

          <button
            onClick={() => { setShowModal(true); setActiveTab("outgoing"); }}
            className="btn-accent rounded-xl text-xs font-bold px-4 py-2.5 shadow-lg flex-shrink-0 w-fit"
          >
            <Plus size={16} />
            <span>Upload Document</span>
          </button>
        </div>
      </section>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Top Control Bar: Tab Switcher & Quick Stats */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          {/* Tab Switcher */}
          <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-card border border-slate-200 w-fit">
            <button
              onClick={() => { setActiveTab("incoming"); setSelectedTypeFilter("ALL"); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "incoming"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-slate-600 hover:text-navy hover:bg-slate-50"
              }`}
            >
              <span>Received from Team</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                activeTab === "incoming" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {incomingDocs.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("outgoing"); setSelectedTypeFilter("ALL"); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "outgoing"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-slate-600 hover:text-navy hover:bg-slate-50"
              }`}
            >
              <span>Uploaded by You</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                activeTab === "outgoing" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {outgoingDocs.length}
              </span>
            </button>
          </div>

          {/* Quick Filter Pill Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedTypeFilter("ALL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedTypeFilter === "ALL"
                  ? "bg-navy text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All Types
            </button>
            {DOCUMENT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setSelectedTypeFilter(t.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedTypeFilter === t.value
                    ? "bg-navy text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notices and Alerts */}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center justify-between shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-xs font-semibold text-success flex items-center gap-2 shadow-sm">
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}

        {/* Document Cards Grid */}
        {loading ? (
          <div className="card flex items-center justify-center p-16 text-slate-400">
            <LoaderCircle className="animate-spin text-primary" size={28} />
          </div>
        ) : visibleDocuments.length ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visibleDocuments.map((doc) => {
              const config = TYPE_CONFIG[doc.document_type] || TYPE_CONFIG.OTHER;
              const Icon = config.icon;

              return (
                <article
                  key={doc.id}
                  className="card p-5 flex flex-col justify-between hover:border-primary-200 transition-all"
                >
                  <div>
                    {/* Top Row: Icon & Category badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary">
                        <Icon size={20} />
                      </div>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                        {config.label}
                      </span>
                    </div>

                    {/* Title & Metadata */}
                    <h3 className="mt-3.5 font-display text-sm font-bold text-navy truncate" title={doc.title || doc.file_name}>
                      {doc.title || doc.file_name || "Document"}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{doc.file_name || "File attached"}</p>
                    
                    {doc.description && (
                      <p className="mt-2 text-xs text-slate-500 line-clamp-2 italic bg-slate-50 p-2 rounded-lg">
                        "{doc.description}"
                      </p>
                    )}
                  </div>

                  {/* Footer Row: Size & Actions */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                    <div>
                      <span>{formatDate(doc.uploaded_at)}</span>
                      <span className="block text-[10px] text-slate-400">{formatSize(doc.file_size)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => previewDocument(doc)}
                        disabled={previewLoading}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-primary hover:text-white transition"
                        title="View Document"
                        aria-label="View Document"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => download(doc)}
                        disabled={downloadingId === doc.id}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-primary hover:bg-primary hover:text-white transition"
                        title="Download Document"
                        aria-label="Download Document"
                      >
                        {downloadingId === doc.id ? <LoaderCircle className="animate-spin" size={15} /> : <Download size={15} />}
                      </button>
                      {doc.can_delete && (
                        <button
                          onClick={() => remove(doc)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete Document"
                          aria-label="Delete Document"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card p-14 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-primary">
              <FolderUp size={32} />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-navy">
              No {activeTab === "incoming" ? "Received" : "Uploaded"} Documents Found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === "incoming"
                ? "Your travel manager will upload vouchers, flight tickets, and confirmed booking documents here."
                : "You haven't uploaded any documents yet. Share copies of passports, visas, or IDs for seamless booking."}
            </p>
            {activeTab === "outgoing" && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary mt-6 text-xs font-bold px-5 py-2.5"
              >
                Upload Document Now →
              </button>
            )}
          </div>
        )}

        {/* UPLOAD MODAL */}
        {showModal && (
          <div className="modal-viewport fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/75 backdrop-blur-sm p-4 animate-fade-in">
            <div className="modal-panel relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-slide-down">
              {/* Modal Header in Deep Navy */}
              <div className="shrink-0 bg-navy px-6 py-4 text-white flex items-center justify-between border-b border-navy-light">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">
                    <Upload size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Upload Travel Document</h2>
                    <p className="text-[10px] text-white/70">Share securely with your tour planners</p>
                  </div>
                </div>
                <button onClick={closeModal} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20">
                  <X size={16} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
                {/* Drop Zone */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Select File <span className="text-rose-500">*</span>
                  </label>
                  <div
                    onClick={() => !uploading && fileInput.current?.click()}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={`flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-4 text-center transition cursor-pointer ${
                      uploading
                        ? "cursor-wait border-slate-200 bg-slate-50 opacity-70"
                        : dragActive
                        ? "border-primary bg-primary-50"
                        : "border-slate-300 bg-slate-50 hover:border-primary hover:bg-primary-50/30"
                    }`}
                  >
                    <input ref={fileInput} type="file" className="hidden" onChange={onInputChange} />
                    {uploading ? (
                      <>
                        <LoaderCircle className="animate-spin text-primary" size={22} />
                        <p className="text-xs font-medium text-slate-600">Uploading file…</p>
                      </>
                    ) : form.fileUrl ? (
                      <div className="flex w-full items-center gap-3 text-left">
                        {form.fileType?.startsWith("image/") ? (
                          <img src={form.fileUrl} alt={form.fileName} className="h-12 w-12 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary-100 text-primary">
                            <FileText size={22} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-navy">{form.fileName}</p>
                          <p className="text-[10px] text-slate-400">{formatSize(form.fileSize)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); clearFile(); }}
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="text-primary" size={22} />
                        <p className="text-xs font-semibold text-navy">
                          Drag & drop file here, or <span className="text-primary underline">browse</span>
                        </p>
                        <p className="text-[10px] text-slate-400">PDF, JPG, PNG, DOC (up to 10MB)</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Document Type CustomSelect */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Document Type <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelect
                    value={form.documentType}
                    options={DOCUMENT_TYPES}
                    onChange={(val) => setField("documentType", val)}
                    triggerClassName="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-800"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Document Title
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    placeholder="e.g. Passport - Front Page"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Notes / Details (Optional)
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={2}
                    placeholder="e.g. For visa processing for adult traveller"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                </div>
                {/* Submit & Cancel */}
                <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-4">
                  <button type="button" onClick={closeModal} className="btn-ghost text-xs font-semibold">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || uploading || !form.fileUrl}
                    className="btn-accent rounded-xl text-xs font-bold px-5 py-2.5 disabled:opacity-50"
                  >
                    {busy ? "Saving Document…" : "Save Document →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {(previewLoading || preview) && (
          <div className="modal-viewport fixed inset-0 z-[60] flex items-center justify-center bg-navy-dark/80 p-4 backdrop-blur-sm" onClick={closePreview}>
            <div className="modal-panel flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 bg-navy px-5 py-4 text-white">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-200">Document preview</p>
                  <h2 className="truncate text-sm font-bold">{preview?.fileName || "Loading document…"}</h2>
                </div>
                <button onClick={closePreview} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20" aria-label="Close preview">
                  <X size={17} />
                </button>
              </div>

              <div className="flex min-h-[360px] flex-1 items-center justify-center overflow-auto bg-slate-100 p-4 sm:p-8">
                {previewLoading ? (
                  <LoaderCircle className="animate-spin text-primary" size={32} />
                ) : previewKind === "image" ? (
                  <img src={preview.url} alt={preview.fileName} className="max-h-[65vh] max-w-full rounded-lg object-contain shadow" />
                ) : previewKind === "pdf" ? (
                  <iframe src={preview.url} title={preview.fileName} className="h-[65vh] w-full rounded-lg bg-white" />
                ) : (
                  <div className="max-w-sm text-center">
                    <FileText className="mx-auto text-primary" size={56} />
                    <h3 className="mt-4 font-display text-lg font-bold text-navy">Preview unavailable in browser</h3>
                    <p className="mt-2 text-sm text-slate-500">This file type can be downloaded and opened with its compatible application.</p>
                  </div>
                )}
              </div>

              {preview && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4">
                  <span className="truncate text-xs text-slate-500">{preview.mimeType}</span>
                  <button onClick={savePreview} className="btn-primary shrink-0 text-xs font-bold">
                    <Download size={15} /> Download file
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
