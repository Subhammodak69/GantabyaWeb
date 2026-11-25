import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchPackageVariants } from "../api";
import { useTravel } from "../contexts/TravelContext";
import CustomSelect from "./CustomSelect";
import { X } from "lucide-react";
import CONTACTS from "../config/contacts.json";

const WHATSAPP_NUMBER = CONTACTS.whatsapp?.[0]?.number || "919932204885";
const INITIAL = {
  name: "", mobile: "", email: "", channel: "WEBSITE", variant_id: "", travel_date: "",
  adult_count: 1, child_count: 0, senior_count: 0,
};

function numericDuration(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  if (Array.isArray(value)) return numericDuration(value[0]);
  if (value && typeof value === "object") {
    for (const key of ["value", "count", "duration", "items"]) {
      const result = numericDuration(value[key]);
      if (result !== null) return result;
    }
  }
  return null;
}

function variantDuration(variant, field, fallback, suffix) {
  if (!variant) return numericDuration(fallback) ?? 0;
  const value = numericDuration(variant[field]);
  if (value !== null) return value;
  const duration = typeof variant.duration === "string" ? variant.duration : "";
  const match = duration.match(new RegExp(`(\\d+)\\s*${suffix}\\b`, "i"));
  return match ? Number(match[1]) : 0;
}

export default function EnquiryModal({
  open,
  onClose,
  packageId = "",
  packageSlug = "",
  variantId = "",
  packageTitle = "",
  packageDestination = "",
  variantName = "",
  variantPrice = 0,
  destinationId = "",
  travelDate = "",
  departureDates = [],
  durationDays = 0,
  durationNights = 0,
  packageImage = "",
}) {
  const { user } = useTravel();
  const [form, setForm] = useState(INITIAL);
  const [variants, setVariants] = useState([]);
  const selectedVariant = variants.find((variant) => variant.id === form.variant_id)
    || (form.variant_id ? { id: form.variant_id, dates: departureDates } : null);
  const travelDurationDay = variantDuration(selectedVariant, "duration_days", durationDays, "D");
  const travelDurationNight = variantDuration(selectedVariant, "duration_nights", durationNights, "N");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [whatsappOpened, setWhatsappOpened] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const lookupKey = packageSlug || packageId;
    setVariants([]);

    if (lookupKey) {
      fetchPackageVariants(lookupKey)
        .then((result) => {
          if (!isMounted || !result) return;
          if (Array.isArray(result.items) && result.items.length > 0) {
            const loadedVariants = result.items.map((item) => (
              item.id === variantId && departureDates.length > 0
                ? { ...item, dates: departureDates }
                : item
            ));
            setVariants(loadedVariants);
            setForm((f) => {
              const chosenVariant = loadedVariants.find((item) => item.id === variantId) || loadedVariants[0];
              const firstDate = chosenVariant?.dates?.[0]?.date || chosenVariant?.dates?.[0]?.departure_date || "";
              return {
                ...f,
                variant_id: variantId || f.variant_id || chosenVariant?.id || "",
                travel_date: f.travel_date || firstDate,
              };
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [open, packageSlug, packageId, variantId, packageTitle, departureDates]);

  useEffect(() => {
    if (open) {
      setForm({
        name: user?.name || "",
        mobile: user?.mobile || user?.phone || "",
        email: user?.email || "",
        channel: "WEBSITE",
        variant_id: variantId || "",
        travel_date: travelDate || "",
        adult_count: 1,
        child_count: 0,
        senior_count: 0,
      });
      setStatus("idle");
      setErrorMsg("");
      setWhatsappUrl("");
      setWhatsappOpened(false);
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [open, user, packageTitle, variantId, travelDate]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  const setNumber = (field) => (e) => {
    if (/^\d*$/.test(e.target.value)) {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    }
  };

  const departureDateOptions = (selectedVariant?.dates || [])
    .filter((date) => date.date || date.departure_date)
    .map((date) => {
      const departure = date.date || date.departure_date;
      const returnDate = date.return_date ? ` – ${date.return_date}` : "";
      return { label: `${departure}${returnDate}`, value: departure };
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.mobile.trim()) {
      setErrorMsg("Name and mobile number are required.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const selectedVariantName = selectedVariant?.name || selectedVariant?.season_name || variantName || "Selected package option";
      const whatsappMessage = [
        "Hello Gantabyaa team!",
        "",
        "I would like to enquire about this fixed tour package:",
        "Enquiry type: FIXED",
        `Package: ${packageTitle || "Tour package"}`,
        packageDestination ? `Destination: ${packageDestination}` : "",
        `Variant: ${selectedVariantName}`,
        `Departure date: ${form.travel_date || "Not selected"}`,
        `Full name: ${form.name.trim()}`,
        `Mobile / WhatsApp: ${form.mobile.trim()}`,
        `Email: ${form.email.trim() || "Not provided"}`,
        `Travellers: Adults ${form.adult_count || 0}, Children ${form.child_count || 0}, Seniors ${form.senior_count || 0}`,
        `Travel duration: ${travelDurationDay} days / ${travelDurationNight} nights`,
        packageImage ? `Package banner: ${packageImage}` : "",
        "",
        "Please share availability, pricing and booking details.",
      ].filter(Boolean).join("\n");
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;
      const whatsappWindow = window.open(whatsappUrl, "_blank");
      if (whatsappWindow) whatsappWindow.opener = null;
      setWhatsappUrl(whatsappUrl);
      setWhatsappOpened(Boolean(whatsappWindow));
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message || "Could not open WhatsApp. Please try again.");
      setStatus("error");
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] min-h-screen overflow-y-auto bg-slate-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enquiry-modal-title"
    >
      <div className="flex min-h-screen w-full flex-col bg-slate-50">
        {/* Header */}
        <div className="shrink-0 border-b border-navy-light bg-navy px-4 py-4 text-white sm:px-6">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-300">Holiday enquiry</p>
              <h2 id="enquiry-modal-title" className="truncate font-display text-base font-bold text-white sm:text-lg">
                {packageTitle || "Send Travel Enquiry"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close enquiry"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
          {status === "success" ? (
            <div className="flex w-full flex-1 items-center justify-center py-6">
              <section className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                <div className="bg-gradient-to-br from-emerald-50 via-white to-primary-50 px-6 py-7 text-center sm:px-10">
                  <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-600">✓</span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Enquiry prepared</p>
                  <h3 className="mt-2 font-display text-2xl font-bold text-navy">You’re one step away</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                    {whatsappOpened
                      ? "WhatsApp opened in a new tab. Review your enquiry there and press Send to share it with our holiday team."
                      : "Your enquiry is ready. Open WhatsApp in a new tab and press Send to share it with our holiday team."}
                  </p>
                </div>
                <div className={`grid gap-4 p-5 sm:p-6 ${packageImage ? "sm:grid-cols-[120px_1fr]" : ""}`}>
                  {packageImage ? (
                    <img src={packageImage} alt="" className="h-28 w-full rounded-xl object-cover sm:h-28 sm:w-[120px]" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Selected fixed tour</p>
                    <h4 className="mt-1 font-display text-base font-bold text-navy">{packageTitle || "Tour package"}</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {[packageDestination, selectedVariant?.name || selectedVariant?.season_name || variantName]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-700">
                        Departure: {form.travel_date || "Not selected"}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-700">
                        {travelDurationDay} days · {travelDurationNight} nights
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <>
            <form id="enquiry-form" onSubmit={handleSubmit} noValidate className="mx-auto grid w-full max-w-4xl gap-5">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:flex">
                {packageImage ? (
                  <img src={packageImage} alt={packageTitle || "Selected tour"} className="h-44 w-full object-cover sm:h-auto sm:w-56" />
                ) : (
                  <div className="grid h-32 w-full place-items-center bg-primary-50 text-4xl text-primary sm:h-auto sm:w-56" aria-hidden="true">✦</div>
                )}
                <div className="min-w-0 flex-1 p-4 sm:p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Selected fixed tour</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-navy">{packageTitle || "Tour package"}</h3>
                  {(packageDestination || selectedVariant?.name || selectedVariant?.season_name || variantName) && (
                    <p className="mt-1 text-sm text-slate-600">
                      {[packageDestination, selectedVariant?.name || selectedVariant?.season_name || variantName].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-700">
                      {travelDurationDay} days · {travelDurationNight} nights
                    </span>
                    {(selectedVariant?.starting_price || selectedVariant?.price || variantPrice) ? (
                      <span className="rounded-lg bg-primary-50 px-2.5 py-1.5 font-bold text-primary">
                        From ₹{Number(selectedVariant?.starting_price || selectedVariant?.price || variantPrice).toLocaleString("en-IN")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-date">Departure Date</label>
                  <CustomSelect
                    id="enq-date"
                    value={form.travel_date}
                    options={[{ label: departureDateOptions.length ? "Select departure date" : "No departure dates available", value: "" }, ...departureDateOptions]}
                    onChange={(value) => setForm((f) => ({ ...f, travel_date: value }))}
                    placeholder="Select departure date"
                    disabled={!departureDateOptions.length}
                    triggerClassName="h-11"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-days">Travel Duration (Days)</label>
                  <input id="enq-days" type="number" value={travelDurationDay} readOnly className="h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-600 outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-nights">Travel Duration (Nights)</label>
                  <input id="enq-nights" type="number" value={travelDurationNight} readOnly className="h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-600 outline-none" />
                </div>
              </div>

              <div>
                <h3 className="font-display text-lg font-bold text-navy">Your details</h3>
                <p className="mt-1 text-xs text-slate-500">Our holiday team will contact you about this package.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-name">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={firstRef}
                    id="enq-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Your name"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-mobile">
                    Mobile / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="enq-mobile"
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-email">Email</label>
                  <input
                    id="enq-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["adult_count", "Adults"],
                  ["child_count", "Children"],
                  ["senior_count", "Seniors"],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor={`enq-${field}`}>{label}</label>
                    <input id={`enq-${field}`} type="text" inputMode="numeric" pattern="[0-9]*" value={form[field]} onChange={setNumber(field)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20" />
                  </div>
                ))}
              </div>
              {errorMsg && (
                <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">{errorMsg}</p>
              )}
            </form>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-6">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          {status === "success" ? (
            <div className="flex w-full items-center justify-end gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp rounded-xl px-5 py-2 text-xs font-bold"
              >
                {whatsappOpened ? "Open WhatsApp again" : "Open WhatsApp"}
              </a>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary rounded-xl px-5 py-2 text-xs font-bold"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <button type="button" onClick={onClose} className="btn-ghost text-xs font-semibold">
                Cancel
              </button>
              <button
                type="submit"
                form="enquiry-form"
                id="enq-submit-btn"
                disabled={status === "loading"}
                className="btn-accent rounded-xl px-5 py-2 text-xs font-bold disabled:opacity-60"
              >
                {status === "loading" ? "Preparing enquiry…" : "Enquire on WhatsApp"}
              </button>
            </>
          )}
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
