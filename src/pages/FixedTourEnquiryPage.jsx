import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchPackageVariants } from "../api";
import { useTravel } from "../contexts/TravelContext";
import CustomSelect from "../components/CustomSelect";
import Seo from "../components/Seo";
import { ArrowLeft } from "lucide-react";
import CONTACTS from "../config/contacts.json";

const WHATSAPP_NUMBER = CONTACTS.whatsapp?.[0]?.number || "919932204885";
const INITIAL = {
  name: "", mobile: "", email: "", channel: "WEBSITE", variant_id: "", travel_date: "",
  adult_count: 1, child_count: 0, senior_count: 0,
};
const EMPTY_DATES = [];

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
  const value = numericDuration(variant?.[field]);
  if (value !== null && value > 0) return value;
  const duration = typeof variant?.duration === "string" ? variant.duration : "";
  const unit = suffix === "D" ? "(?:days?|d)" : "(?:nights?|n)";
  const match = duration.match(new RegExp(`(\\d+)\\s*${unit}\\b`, "i"));
  return match ? Number(match[1]) : numericDuration(fallback) ?? 0;
}

export default function FixedTourEnquiryPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const enquiry = location.state?.fixedTourEnquiry;
  const {
    packageId = "",
    packageSlug = id || "",
    variantId = "",
    packageTitle = "",
    packageDestination = "",
    variantName = "",
    variantPrice = 0,
    travelDate = "",
    departureDates = EMPTY_DATES,
    durationDays = 0,
    durationNights = 0,
    packageImage = "",
  } = enquiry || {};
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
    if (!enquiry) return undefined;

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
  }, [enquiry, packageSlug, packageId, variantId, departureDates]);

  useEffect(() => {
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
  }, [user, packageTitle, variantId, travelDate]);

  useEffect(() => {
    if (!enquiry) {
      navigate(`/${id}`, { replace: true });
    }
  }, [enquiry, id, navigate]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") navigate(-1);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [navigate]);

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

  if (!enquiry) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <Seo
        title={`${packageTitle || "Fixed Tour"} Enquiry | Gantabyaa`}
        description="Send your fixed tour enquiry to the Gantabyaa holiday team."
        path={`/${id}/enquiry`}
        robots="noindex,nofollow"
      />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Fixed tour enquiry</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
              Enquire about your tour
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Confirm your travel details and our holiday team will help with availability and pricing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-navy transition hover:bg-slate-100 sm:self-auto"
          >
            <ArrowLeft size={16} />
            Back to tour
          </button>
        </header>

        {status === "success" ? (
          <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center py-8 text-center" role="status">
            <span className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl text-success">✓</span>
            <h2 className="font-display text-2xl font-bold text-navy">Enquiry ready in WhatsApp</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              {whatsappOpened
                ? "WhatsApp opened in a new tab. Review your enquiry and press Send to share it with our holiday team."
                : "Your enquiry is prepared. Open WhatsApp and press Send to share it with our holiday team."}
            </p>
            <section className="mt-7 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm sm:flex">
              {packageImage ? <img src={packageImage} alt={packageTitle || "Selected tour"} className="h-40 w-full object-cover sm:h-auto sm:w-48" /> : null}
              <div className="min-w-0 flex-1 p-4 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Selected fixed tour</p>
                <h3 className="mt-1 font-display text-base font-bold text-navy">{packageTitle || "Tour package"}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {[packageDestination, selectedVariant?.name || selectedVariant?.season_name || variantName].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-3 text-xs font-semibold text-slate-600">
                  Departure: {form.travel_date || "Not selected"} · {travelDurationDay} days / {travelDurationNight} nights
                </p>
              </div>
            </section>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-whatsapp rounded-xl text-sm font-bold">
                {whatsappOpened ? "Open WhatsApp again" : "Open WhatsApp"}
              </a>
              <button type="button" onClick={() => navigate(-1)} className="btn-primary rounded-xl text-sm font-bold">
                Back to tour
              </button>
            </div>
          </section>
        ) : (
          <form id="enquiry-form" onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-4xl space-y-7">
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
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => navigate(-1)} className="btn-ghost text-xs font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  id="enq-submit-btn"
                  disabled={status === "loading"}
                  className="btn-accent rounded-xl px-5 py-2 text-xs font-bold disabled:opacity-60"
                >
                  {status === "loading" ? "Preparing enquiry…" : "Enquire on WhatsApp"}
                </button>
              </div>
          </form>
        )}
      </div>
      </div>
  );
}
