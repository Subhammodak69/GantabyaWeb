import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPackageVariants, fetchPackages } from "../api";
import { useTravel } from "../contexts/TravelContext";
import Seo from "../components/Seo";
import CustomSelect from "../components/CustomSelect";
import enums from "../utils/enums.json";
import { Sparkle } from "lucide-react";
import CONTACTS from "../config/contacts.json";

const VEHICLE_OPTIONS = Object.values(enums.VehicleType);
const MEAL_OPTIONS = Object.values(enums.MealPlan);
const ENQUIRY_TYPE_OPTIONS = Object.values(enums.EnquiryType).filter(
  (t) => t !== "FIXED_TOUR" && t !== "FIXED TOUR"
);
const WHATSAPP_NUMBER = CONTACTS.whatsapp?.[0]?.number || "919932204885";

const INITIAL = {
  name: "", mobile: "", email: "", destination: "", destination_id: "", package_id: "", variant_id: "", travel_date: "",
  travel_duration_day: 0, travel_duration_night: 0, adult_count: 2, child_count: 0, senior_count: 0,
  room_count: 1, vehicle_count: 0, budget_min: 0, budget_max: 0,
  vehicle_type: "ANY", meal_plan: "ANY", special_requirements: "", enquiry_type: "CUSTOM_TOUR",
};

export default function CustomTourEnquiryPage() {
  const { user, goHome } = useTravel();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const firstRef = useRef(null);
  const [packages, setPackages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setForm((f) => ({
      ...f,
      name: user?.name || f.name,
      mobile: user?.mobile || user?.phone || f.mobile,
    }));
    setTimeout(() => firstRef.current?.focus(), 100);
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    fetchPackages({ page: 1, page_size: 50 })
      .then((result) => isMounted && setPackages(Array.isArray(result?.items) ? result.items : []))
      .catch(() => isMounted && setPackages([]));
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const selectedPackage = packages.find((item) => (item.package_id || item.id) === form.package_id);
    const packageRef = selectedPackage?.slug || "";
    if (!packageRef) {
      setVariants([]);
      return undefined;
    }
    let isMounted = true;
    setVariantsLoading(true);
    fetchPackageVariants(packageRef, 1, 100)
      .then((response) => {
        if (!isMounted) return;
        setVariants(Array.isArray(response?.items) ? response.items : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setVariants([]);
      })
      .finally(() => isMounted && setVariantsLoading(false));
    return () => { isMounted = false; };
  }, [form.package_id, packages]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setNum = (field) => (e) => {
    if (/^\d*$/.test(e.target.value)) {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    }
  };
  const destinationOptions = Array.from(new Map(
    packages
      .filter((item) => item.destination_id && item.destination)
      .map((item) => [item.destination_id, { label: item.destination, value: item.destination_id }])
  ).values());
  const applyPackage = (value) => {
    const selected = packages.find((item) => (item.package_id || item.id) === value);
    setForm((f) => ({ ...f, package_id: selected?.package_id || selected?.id || "", variant_id: "", travel_date: "", destination_id: selected?.destination_id || "", destination: selected?.destination || "" }));
  };
  const applyDestination = (value) => {
    const selected = destinationOptions.find((item) => item.value === value);
    setForm((f) => ({ ...f, package_id: "", variant_id: "", travel_date: "", destination_id: value, destination: selected?.label || "" }));
  };
  const selectedVariant = variants.find((item) => item.id === form.variant_id);
  const selectedPackage = packages.find((item) => (item.package_id || item.id) === form.package_id);
  const departureDateOptions = (selectedVariant?.dates || []).filter((date) => date.date || date.departure_date).map((date) => {
    const departure = date.date || date.departure_date;
    const returnDate = date.return_date ? ` – ${date.return_date}` : "";
    return { label: `${departure}${returnDate}`, value: departure };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim() || !form.destination_id) {
      setErrorMsg("Name, mobile number and a package or destination are required fields.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const whatsappMessage = [
        "Hello Gantabyaa team! 👋",
        "",
        "I would like to plan a custom tour:",
        `Enquiry type: ${form.enquiry_type || "CUSTOM_TOUR"}`,
        `Name: ${form.name.trim()}`,
        `Mobile / WhatsApp: ${form.mobile.trim()}`,
        `Email: ${form.email.trim() || "Not provided"}`,
        `Destination: ${form.destination || "Not specified"}`,
        `Package: ${selectedPackage?.title || "Custom package"}`,
        `Variant: ${selectedVariant?.name || selectedVariant?.season_name || "Not selected"}`,
        `Departure date: ${form.travel_date || "Not selected"}`,
        `Duration: ${form.travel_duration_day || 0} days / ${form.travel_duration_night || 0} nights`,
        `Travellers: Adults ${form.adult_count || 0}, Children ${form.child_count || 0}, Seniors ${form.senior_count || 0}`,
        `Rooms: ${form.room_count || 0}`,
        `Vehicle type: ${form.vehicle_type || "ANY"}`,
        `Vehicles: ${form.vehicle_count || 0}`,
        `Budget: ${form.budget_min || 0} - ${form.budget_max || 0}`,
        `Meal plan: ${form.meal_plan || "ANY"}`,
        `Special requirements: ${form.special_requirements.trim() || "None"}`,
        selectedVariant?.cover_image ? `Package image: ${selectedVariant.cover_image}` : (selectedPackage?.cover_image ? `Package image: ${selectedPackage.cover_image}` : ""),
        "",
        "Please help me with availability, pricing and a personalized itinerary.",
      ].filter(Boolean).join("\n");
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;
      const whatsappWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (!whatsappWindow) window.location.assign(whatsappUrl);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const inputCls = "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20";
  const selectTriggerCls = "h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-800";
  const labelCls = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Seo
        title="Custom Tour Enquiry | Gantabyaa"
        description="Plan a tailor-made holiday with Gantabyaa. Share your preferred destinations, dates, and travel preferences for a custom itinerary."
        path="/custom-tour-enquiry"
        robots="index,follow"
      />
      {/* Hero Banner */}
      <section className="relative flex min-h-[260px] items-center overflow-hidden bg-navy px-4 pb-8 pt-10 text-white sm:px-6 lg:px-12">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-25 brightness-75"
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2000&q=90"
          alt="Custom travel"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark via-navy/90 to-primary-950/70" />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-300">
            <Sparkle size={13} /> Tailor-Made Itineraries
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-white">
            Plan Your <span className="text-primary-300">Custom Journey</span>
          </h1>
          <p className="mt-2 max-w-2xl text-xs sm:text-sm text-white/80 leading-relaxed">
            Tell us your dream destinations, dates, group size, and preferences. Our expert travel designers will create a personalized itinerary crafted just for you within 24 hours.
          </p>
        </div>
      </section>

      {/* Main Form Container */}
      <div className="mx-auto max-w-5xl px-4 -mt-6 sm:px-6 relative z-20">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          {status === "success" ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl text-success">
                ✓
              </span>
              <h2 className="font-display text-2xl font-bold text-navy">Enquiry Ready in WhatsApp!</h2>
              <p className="mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
                Your complete enquiry is prepared in WhatsApp. Please press Send to share it with our travel team.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => { setForm(INITIAL); setStatus("idle"); }}
                  className="btn-outline rounded-xl text-xs font-bold"
                >
                  Submit Another Enquiry
                </button>
                <button
                  onClick={goHome}
                  className="btn-primary rounded-xl text-xs font-bold"
                >
                  Back to Home
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="grid gap-7">
              {/* Section 1: Contact Information */}
              <div>
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-white">1</span>
                  <h3 className="font-display text-base font-bold text-navy">Contact Details</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls} htmlFor="custom-page-name">Full Name <span className="text-rose-500">*</span></label>
                    <input ref={firstRef} id="custom-page-name" type="text" value={form.name} onChange={set("name")} placeholder="Your full name" className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-mobile">Mobile / WhatsApp Number <span className="text-rose-500">*</span></label>
                    <input id="custom-page-mobile" type="tel" value={form.mobile} onChange={set("mobile")} placeholder="+91 98765 43210" className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-email">Email</label>
                    <input id="custom-page-email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Section 2: Trip Preferences */}
              <div>
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-white">2</span>
                  <h3 className="font-display text-base font-bold text-navy">Trip Destination & Dates</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={labelCls}>Choose Package</label>
                    <CustomSelect
                      value={form.package_id}
                      options={[{ label: "Select a package (optional)", value: "" }, ...packages.map((item) => ({ label: item.title || item.destination || "Tour package", value: item.package_id || item.id }))]}
                      onChange={applyPackage}
                      placeholder="Choose package"
                      triggerClassName={selectTriggerCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Package Variant</label>
                    <CustomSelect
                      value={form.variant_id}
                      options={[{ label: variantsLoading ? "Loading variants…" : "Select package variant", value: "" }, ...variants.map((item) => ({ label: item.name || item.season_name || "Tour variant", value: item.id }))]}
                      onChange={(value) => setForm((f) => ({ ...f, variant_id: value, travel_date: "" }))}
                      placeholder={form.package_id ? "Choose variant" : "Choose package first"}
                      disabled={!form.package_id || variantsLoading}
                      triggerClassName={selectTriggerCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Or Choose Destination <span className="text-rose-500">*</span></label>
                    <CustomSelect
                      value={form.destination_id}
                      options={[{ label: "Select destination", value: "" }, ...destinationOptions]}
                      onChange={applyDestination}
                      placeholder="Choose destination"
                      triggerClassName={selectTriggerCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-type">Tour Category</label>
                    <CustomSelect
                      value={form.enquiry_type}
                      options={ENQUIRY_TYPE_OPTIONS.map((t) => ({ label: t.replace(/_/g, " "), value: t }))}
                      onChange={(value) => setForm((f) => ({ ...f, enquiry_type: value }))}
                      placeholder="Select category"
                      triggerClassName={selectTriggerCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-date">Departure Date</label>
                    <CustomSelect
                      id="custom-page-date"
                      value={form.travel_date}
                      options={[{ label: departureDateOptions.length ? "Select departure date" : "Choose package variant first", value: "" }, ...departureDateOptions]}
                      onChange={(value) => setForm((f) => ({ ...f, travel_date: value }))}
                      placeholder="Select departure date"
                      disabled={!departureDateOptions.length}
                      triggerClassName={selectTriggerCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-days">Duration (Days)</label>
                    <input id="custom-page-days" type="text" inputMode="numeric" pattern="[0-9]*" value={form.travel_duration_day} onChange={setNum("travel_duration_day")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-nights">Duration (Nights)</label>
                    <input id="custom-page-nights" type="text" inputMode="numeric" pattern="[0-9]*" value={form.travel_duration_night} onChange={setNum("travel_duration_night")} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Section 3: Travellers & Accommodation */}
              <div>
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-white">3</span>
                  <h3 className="font-display text-base font-bold text-navy">Travellers & Stay Preferences</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={labelCls} htmlFor="custom-page-adults">Adults</label>
                    <input id="custom-page-adults" type="text" inputMode="numeric" pattern="[0-9]*" value={form.adult_count} onChange={setNum("adult_count")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-children">Children</label>
                    <input id="custom-page-children" type="text" inputMode="numeric" pattern="[0-9]*" value={form.child_count} onChange={setNum("child_count")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-seniors">Seniors</label>
                    <input id="custom-page-seniors" type="text" inputMode="numeric" pattern="[0-9]*" value={form.senior_count} onChange={setNum("senior_count")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-rooms">Rooms Required</label>
                    <input id="custom-page-rooms" type="text" inputMode="numeric" pattern="[0-9]*" value={form.room_count} onChange={setNum("room_count")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-meal">Meal Plan</label>
                    <CustomSelect
                      value={form.meal_plan}
                      options={[{ label: "Any / No preference", value: "ANY" }, ...MEAL_OPTIONS.map((m) => ({ label: m, value: m }))]}
                      onChange={(value) => setForm((f) => ({ ...f, meal_plan: value }))}
                      placeholder="Select meal plan"
                      triggerClassName={selectTriggerCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-vehicle">Vehicle Preference</label>
                    <CustomSelect
                      value={form.vehicle_type}
                      options={[{ label: "Any / No preference", value: "ANY" }, ...VEHICLE_OPTIONS.map((v) => ({ label: v, value: v }))]}
                      onChange={(value) => setForm((f) => ({ ...f, vehicle_type: value }))}
                      placeholder="Select vehicle"
                      triggerClassName={selectTriggerCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-vehicle-count">Vehicles Required</label>
                    <input id="custom-page-vehicle-count" type="text" inputMode="numeric" pattern="[0-9]*" value={form.vehicle_count} onChange={setNum("vehicle_count")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-budget-min">Minimum Budget</label>
                    <input id="custom-page-budget-min" type="text" inputMode="numeric" pattern="[0-9]*" value={form.budget_min} onChange={setNum("budget_min")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="custom-page-budget-max">Maximum Budget</label>
                    <input id="custom-page-budget-max" type="text" inputMode="numeric" pattern="[0-9]*" value={form.budget_max} onChange={setNum("budget_max")} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Section 4: Special Requirements */}
              <div>
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-white">4</span>
                  <h3 className="font-display text-base font-bold text-navy">Special Requests & Notes</h3>
                </div>
                <textarea
                  id="custom-page-special"
                  value={form.special_requirements}
                  onChange={set("special_requirements")}
                  placeholder="Mention any specific requests (e.g. senior citizen assistance, child meals, pickup location, specific sightseeing spots…)"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-600">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn-ghost text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-custom-enquiry-page-btn"
                  disabled={status === "loading"}
                  className="btn-accent rounded-xl text-xs font-bold shadow-md disabled:opacity-60"
                >
                  {status === "loading" ? "Submitting Request…" : "Submit Custom Enquiry →"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
