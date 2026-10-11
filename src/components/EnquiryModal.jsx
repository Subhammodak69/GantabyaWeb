import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchPackageVariants, fetchVariant } from "../api";
import { useTravel } from "../contexts/TravelContext";
import CustomSelect from "./CustomSelect";
import enums from "../utils/enums.json";
import { X } from "lucide-react";
import CONTACTS from "../config/contacts.json";

const MEAL_OPTIONS = ["ANY", ...Object.values(enums.MealPlan)];
const VEHICLE_OPTIONS = ["ANY", ...Object.values(enums.VehicleType)];
const WHATSAPP_NUMBER = CONTACTS.whatsapp?.[0]?.number || "919932204885";
const INITIAL = {
  name: "", mobile: "", email: "", channel: "WEBSITE", subject: "", message: "", variant_id: "", travel_date: "",
  adult_count: 1, child_count: 0, senior_count: 0,
  vehicle_type: "ANY", room_count: 0, vehicle_count: 0, budget_min: 0, budget_max: 0,
  special_requirements: "", meal_plan: "ANY",
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
  const firstRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const lookupKey = packageSlug || packageId;

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
            setForm((f) => ({
              ...f,
              variant_id: variantId || f.variant_id || loadedVariants[0].id || "",
            }));
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
        subject: packageTitle ? `Enquiry about ${packageTitle}` : "",
        message: "",
        variant_id: variantId || "",
        travel_date: travelDate || "",
        adult_count: 1,
        child_count: 0,
        senior_count: 0,
        vehicle_type: "ANY",
        room_count: 0,
        vehicle_count: 0,
        budget_min: 0,
        budget_max: 0,
        special_requirements: "",
        meal_plan: "ANY",
      });
      setStatus("idle");
      setErrorMsg("");
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

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setNumber = (field) => (e) => {
    if (/^\d*$/.test(e.target.value)) {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    }
  };

  const handleVariantChange = async (value) => {
    setForm((f) => ({ ...f, variant_id: value, travel_date: "" }));
    const selected = variants.find((item) => item.id === value);
    const lookupKey = packageSlug || packageId;
    if (!selected || selected.dates?.length || !lookupKey) return;

    try {
      const detailed = await fetchVariant(lookupKey, selected.slug || selected.variant_slug || selected.key || value, variants);
      setVariants((current) => current.map((item) => (
        item.id === value || item.id === detailed.id ? detailed : item
      )));
    } catch {
      // Keep the variant option available even if its detail request fails.
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
      const selectedVariantName = selectedVariant?.name || selectedVariant?.season_name || "Selected package option";
      const whatsappMessage = [
        "Hello Gantabyaa team! 👋",
        "",
        "I would like to customise this tour package:",
        `Package: ${packageTitle || "Tour package"}`,
        `Enquiry source: ${form.channel || "WEBSITE"}`,
        `Variant: ${selectedVariantName}`,
        `Departure date: ${form.travel_date || "Not selected"}`,
        `Full name: ${form.name.trim()}`,
        `Mobile / WhatsApp: ${form.mobile.trim()}`,
        `Email: ${form.email.trim() || "Not provided"}`,
        `Travellers: Adults ${form.adult_count || 0}, Children ${form.child_count || 0}, Seniors ${form.senior_count || 0}`,
        `Travel duration: ${travelDurationDay} days / ${travelDurationNight} nights`,
        `Vehicle type: ${form.vehicle_type || "ANY"}`,
        `Rooms: ${form.room_count || 0}`,
        `Vehicles: ${form.vehicle_count || 0}`,
        `Budget: ${form.budget_min || 0} - ${form.budget_max || 0}`,
        `Meal plan: ${form.meal_plan || "ANY"}`,
        `Subject: ${form.subject.trim() || "Not provided"}`,
        `Special requirements: ${form.special_requirements.trim() || "None"}`,
        `Travel plans / preferences: ${form.message.trim() || "None"}`,
        packageImage ? `Package banner: ${packageImage}` : "",
        "",
        "Please share availability, pricing and booking details.",
      ].filter(Boolean).join("\n");
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;
      const whatsappWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (!whatsappWindow) window.location.assign(whatsappUrl);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message || "Could not open WhatsApp. Please try again.");
      setStatus("error");
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="modal-viewport fixed inset-0 z-[9999] flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enquiry-modal-title"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-navy-dark/75 backdrop-blur-sm" style={{ animation: "fadeInBg 0.2s ease forwards" }} />

      <div
        className="modal-panel relative z-10 flex flex-col w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden"
        style={{ animation: "slideUpPanel 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
      >
        {/* Header */}
        <div className="relative shrink-0 bg-navy px-6 py-4 text-white border-b border-navy-light flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-300">Quick Holiday Enquiry</p>
            <h2 id="enquiry-modal-title" className="font-display text-base font-bold text-white truncate max-w-sm">
              {packageTitle || "Send Travel Enquiry"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {status === "success" ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-green-100 text-2xl text-success font-bold">✓</span>
              <h3 className="font-display text-xl font-bold text-navy">Enquiry Ready in WhatsApp!</h3>
              <p className="mt-2 text-xs text-slate-500 max-w-xs">Your complete enquiry is prepared in WhatsApp. Please press Send to share it with our holiday team.</p>
            </div>
          ) : (
            <form id="enquiry-form" onSubmit={handleSubmit} noValidate className="grid gap-3.5">
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
                    onChange={set("name")}
                    placeholder="Your name"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
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
                    onChange={set("mobile")}
                    placeholder="+91 98765 43210"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-email">Email</label>
                  <input id="enq-email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-date">Departure Date</label>
                  <CustomSelect
                    id="enq-date"
                    value={form.travel_date}
                    options={[{ label: departureDateOptions.length ? "Select departure date" : "No departure dates available", value: "" }, ...departureDateOptions]}
                    onChange={(value) => setForm((f) => ({ ...f, travel_date: value }))}
                    placeholder="Select departure date"
                    disabled={!departureDateOptions.length}
                    triggerClassName="h-10"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-days">Travel Duration (Days)</label>
                  <input id="enq-days" type="number" value={travelDurationDay} readOnly className="h-10 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs text-slate-600 outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-nights">Travel Duration (Nights)</label>
                  <input id="enq-nights" type="number" value={travelDurationNight} readOnly className="h-10 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs text-slate-600 outline-none" />
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
                    <input id={`enq-${field}`} type="text" inputMode="numeric" pattern="[0-9]*" value={form[field]} onChange={setNumber(field)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20" />
                  </div>
                ))}
              </div>

              {variants.length > 0 && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-variant">
                    Tour Variant / Season
                  </label>
                  <CustomSelect
                    value={form.variant_id}
                    options={variants.map((v) => ({
                      label: `${v.name || v.season_name}${v.season_name && v.name && v.name !== v.season_name ? ` (${v.season_name})` : ""}`,
                      value: v.id,
                    }))}
                    onChange={handleVariantChange}
                    placeholder="Select package option"
                    triggerClassName="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800"
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700">Vehicle Type</label>
                <CustomSelect
                  value={form.vehicle_type}
                  options={VEHICLE_OPTIONS.map((vehicle) => ({ label: vehicle === "ANY" ? "Any / No preference" : vehicle, value: vehicle }))}
                  onChange={(value) => setForm((f) => ({ ...f, vehicle_type: value }))}
                  placeholder="Select vehicle type"
                  triggerClassName="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800"
                  className="w-full"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["room_count", "Rooms"],
                  ["vehicle_count", "Vehicles"],
                  ["budget_min", "Minimum Budget"],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor={`enq-${field}`}>{label}</label>
                    <input id={`enq-${field}`} type="text" inputMode="numeric" pattern="[0-9]*" value={form[field]} onChange={setNumber(field)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20" />
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-budget-max">Maximum Budget</label>
                  <input id="enq-budget-max" type="text" inputMode="numeric" pattern="[0-9]*" value={form.budget_max} onChange={setNumber("budget_max")} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-meal-plan">Meal Plan</label>
                  <CustomSelect
                    value={form.meal_plan}
                    options={MEAL_OPTIONS.map((meal) => ({ label: meal === "ANY" ? "Any / No preference" : meal, value: meal }))}
                    onChange={(value) => setForm((f) => ({ ...f, meal_plan: value }))}
                    placeholder="Select meal plan"
                    triggerClassName="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-subject">
                  Enquiry Subject
                </label>
                <input
                  id="enq-subject"
                  type="text"
                  value={form.subject}
                  onChange={set("subject")}
                  placeholder="e.g. Group booking enquiry"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-special-requirements">
                  Special Requirements
                </label>
                <textarea
                  id="enq-special-requirements"
                  value={form.special_requirements}
                  onChange={set("special_requirements")}
                  placeholder="Dietary needs, accessibility, pickup requests, or other preferences…"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700" htmlFor="enq-message">
                  Travel Plans & Preferences
                </label>
                <textarea
                  id="enq-message"
                  value={form.message}
                  onChange={set("message")}
                  placeholder="Tell us about dates, group size, vehicle needs or specific requirements…"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {errorMsg && (
                <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">{errorMsg}</p>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          {status === "success" ? (
            <button
              type="button"
              onClick={onClose}
              className="btn-primary rounded-xl text-xs font-bold px-5 py-2"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="enquiry-form"
                id="enq-submit-btn"
                disabled={status === "loading"}
                className="btn-accent rounded-xl text-xs font-bold px-5 py-2 disabled:opacity-60"
              >
                {status === "loading" ? "Sending Enquiry…" : "Submit Enquiry →"}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInBg { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUpPanel { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>,
    document.body
  );
}
