import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchHotels, fetchPackages, fetchVehicles, submitCustomEnquiry } from "../api";
import { useTravel } from "../contexts/TravelContext";
import CustomSelect from "./CustomSelect";
import CustomDatePicker from "./CustomDatePicker";
import enums from "../utils/enums.json";
import { X, Sparkle } from "lucide-react";

const VEHICLE_OPTIONS = Object.values(enums.VehicleType);
const MEAL_OPTIONS = Object.values(enums.MealPlan);
const ENQUIRY_TYPE_OPTIONS = Object.values(enums.EnquiryType).filter(
  (t) => t !== "FIXED_TOUR" && t !== "FIXED TOUR"
);

const INITIAL = {
  name: "", mobile: "", email: "", destination: "", destination_id: "", package_id: "", travel_date: "",
  travel_duration_day: 0, travel_duration_night: 0, adult_count: 2, child_count: 0, senior_count: 0,
  room_count: 1, vehicle_count: 0, budget_min: 0, budget_max: 0,
  vehicle_type: "", hotel_id: "", vehicle_id: "", meal_plan: "ANY", special_requirements: "", enquiry_type: "CUSTOM_TOUR",
};

export default function CustomEnquiryModal({ open, onClose }) {
  const { user } = useTravel();
  const [form, setForm] = useState(INITIAL);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const firstRef = useRef(null);
  const overlayRef = useRef(null);
  const [packages, setPackages] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...INITIAL, name: user?.name || "", mobile: user?.mobile || user?.phone || "" });
      setStatus("idle");
      setErrorMsg("");
      setTimeout(() => firstRef.current?.focus(), 50);
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return undefined;
    let isMounted = true;
    fetchPackages({ page: 1, page_size: 50 })
      .then((result) => isMounted && setPackages(Array.isArray(result?.items) ? result.items : []))
      .catch(() => isMounted && setPackages([]));
    return () => { isMounted = false; };
  }, [open]);

  useEffect(() => {
    if (!open || !form.destination_id) {
      setHotels([]);
      setVehicles([]);
      return undefined;
    }
    let isMounted = true;
    setFacilitiesLoading(true);
    Promise.all([fetchHotels(1, 20, form.destination_id), fetchVehicles(1, 20)])
      .then(([hotelResponse, vehicleResponse]) => {
        if (!isMounted) return;
        setHotels(Array.isArray(hotelResponse?.data) ? hotelResponse.data : []);
        setVehicles(Array.isArray(vehicleResponse?.data) ? vehicleResponse.data : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setHotels([]);
        setVehicles([]);
      })
      .finally(() => isMounted && setFacilitiesLoading(false));
    return () => { isMounted = false; };
  }, [open, form.destination_id]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

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
    setForm((f) => ({ ...f, package_id: selected?.package_id || "", destination_id: selected?.destination_id || "", destination: selected?.destination || "", hotel_id: "", vehicle_id: "" }));
  };
  const applyDestination = (value) => {
    const selected = destinationOptions.find((item) => item.value === value);
    setForm((f) => ({ ...f, package_id: "", destination_id: value, destination: selected?.label || "", hotel_id: "", vehicle_id: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim() || !form.destination_id) {
      setErrorMsg("Name, mobile number and a package or destination are required.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      await submitCustomEnquiry({ ...form, customer_id: user?.id || "" });
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (!open) return null;

  const inputCls = "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20";
  const labelCls = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700";

  return createPortal(
    <div
      ref={overlayRef}
      className="modal-viewport fixed inset-0 z-[9999] flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-enquiry-modal-title"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-navy-dark/75 backdrop-blur-sm" style={{ animation: "fadeInBg 0.2s ease forwards" }} />

      <div
        className="modal-panel relative z-10 w-full max-w-2xl rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ animation: "slideUpPanel 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
      >
        {/* Header */}
        <div className="relative shrink-0 bg-navy px-6 py-4 text-white border-b border-navy-light flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent-300">
              <Sparkle size={11} /> Tailor-Made Itinerary
            </span>
            <h2 id="custom-enquiry-modal-title" className="font-display text-base font-bold text-white">
              Plan a Customized Holiday
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

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {status === "success" ? (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-green-100 text-2xl text-success font-bold">✓</span>
              <h3 className="font-display text-xl font-bold text-navy">Custom Enquiry Received!</h3>
              <p className="mt-2 text-xs text-slate-500 max-w-sm">
                Thank you, {form.name}! Our destination planners will design your itinerary for {form.destination} and reach out to you within 24 hours.
              </p>
              <button
                onClick={onClose}
                className="btn-primary mt-6 rounded-xl text-xs font-bold px-6 py-2.5"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="grid gap-4">
              {/* Contact */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">1. Contact Information</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls} htmlFor="cenq-name">Full Name <span className="text-rose-500">*</span></label>
                    <input ref={firstRef} id="cenq-name" type="text" value={form.name} onChange={set("name")} placeholder="Your name" className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-mobile">Mobile / WhatsApp <span className="text-rose-500">*</span></label>
                    <input id="cenq-mobile" type="tel" value={form.mobile} onChange={set("mobile")} placeholder="+91 98765 43210" className={inputCls} required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="cenq-email">Email</label>
                    <input id="cenq-email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Trip */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">2. Trip Preferences</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Choose Package</label>
                    <CustomSelect
                      value={form.package_id}
                      options={[{ label: "Select a package (optional)", value: "" }, ...packages.map((item) => ({ label: item.title || item.destination || "Tour package", value: item.package_id || item.id }))]}
                      onChange={applyPackage}
                      placeholder="Choose package"
                      triggerClassName="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Or Choose Destination <span className="text-rose-500">*</span></label>
                    <CustomSelect
                      value={form.destination_id}
                      options={[{ label: "Select destination", value: "" }, ...destinationOptions]}
                      onChange={applyDestination}
                      placeholder="Choose destination"
                      triggerClassName="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-enquiry-type">Tour Category</label>
                    <CustomSelect
                      value={form.enquiry_type}
                      options={ENQUIRY_TYPE_OPTIONS.map((t) => ({ label: t.replace(/_/g, " "), value: t }))}
                      onChange={(value) => setForm((f) => ({ ...f, enquiry_type: value }))}
                      placeholder="Select category"
                      triggerClassName="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-travel-date">Tentative Date</label>
                    <CustomDatePicker
                      id="cenq-travel-date"
                      value={form.travel_date}
                      onChange={(value) => setForm((f) => ({ ...f, travel_date: value }))}
                      placeholder="Choose tentative date"
                      triggerClassName="h-10"
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-travel-days">Duration (Days)</label>
                    <input id="cenq-travel-days" type="text" inputMode="numeric" pattern="[0-9]*" value={form.travel_duration_day} onChange={setNum("travel_duration_day")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-travel-nights">Duration (Nights)</label>
                    <input id="cenq-travel-nights" type="text" inputMode="numeric" pattern="[0-9]*" value={form.travel_duration_night} onChange={setNum("travel_duration_night")} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Group & Preferences */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">3. Travellers & Stays</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelCls} htmlFor="cenq-adults">Adults</label>
                    <input id="cenq-adults" type="text" inputMode="numeric" pattern="[0-9]*" value={form.adult_count} onChange={setNum("adult_count")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-children">Children</label>
                    <input id="cenq-children" type="text" inputMode="numeric" pattern="[0-9]*" value={form.child_count} onChange={setNum("child_count")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-seniors">Seniors</label>
                    <input id="cenq-seniors" type="text" inputMode="numeric" pattern="[0-9]*" value={form.senior_count} onChange={setNum("senior_count")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-rooms">Rooms</label>
                    <input id="cenq-rooms" type="text" inputMode="numeric" pattern="[0-9]*" value={form.room_count} onChange={setNum("room_count")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-meal">Meal Plan</label>
                    <CustomSelect
                      value={form.meal_plan}
                      options={[{ label: "Any Plan", value: "ANY" }, ...MEAL_OPTIONS.map((m) => ({ label: m, value: m }))]}
                      onChange={(value) => setForm((f) => ({ ...f, meal_plan: value }))}
                      placeholder="Select meal"
                      triggerClassName="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-vehicle-count">Vehicles</label>
                    <input id="cenq-vehicle-count" type="text" inputMode="numeric" pattern="[0-9]*" value={form.vehicle_count} onChange={setNum("vehicle_count")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-budget-min">Minimum Budget</label>
                    <input id="cenq-budget-min" type="text" inputMode="numeric" pattern="[0-9]*" value={form.budget_min} onChange={setNum("budget_min")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cenq-budget-max">Maximum Budget</label>
                    <input id="cenq-budget-max" type="text" inputMode="numeric" pattern="[0-9]*" value={form.budget_max} onChange={setNum("budget_max")} className={inputCls} />
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Preferred Hotel</label>
                    <CustomSelect
                      value={form.hotel_id}
                      options={[{ label: "Any / No preference", value: "" }, ...hotels.map((hotel) => ({ label: `${hotel.name}${hotel.category ? ` · ${hotel.category}` : ""}`, value: hotel.id }))]}
                      onChange={(value) => setForm((f) => ({ ...f, hotel_id: value }))}
                      placeholder={facilitiesLoading ? "Loading hotels…" : form.destination_id ? "Select hotel" : "Choose package or destination first"}
                      triggerClassName="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Preferred Vehicle</label>
                    <CustomSelect
                      value={form.vehicle_id}
                      options={[{ label: "Any / No preference", value: "" }, ...vehicles.map((vehicle) => ({ label: `${vehicle.name}${vehicle.capacity ? ` · ${vehicle.capacity} seats` : ""}`, value: vehicle.id }))]}
                      onChange={(value) => setForm((f) => ({ ...f, vehicle_id: value }))}
                      placeholder={facilitiesLoading ? "Loading vehicles…" : "Select vehicle"}
                      triggerClassName="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Special Requirements */}
              <div>
                <label className={labelCls} htmlFor="cenq-special">Special Notes</label>
                <textarea
                  id="cenq-special"
                  value={form.special_requirements}
                  onChange={set("special_requirements")}
                  placeholder="Dietary requirements, senior citizen care, hotel tier preferences, etc."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {errorMsg && (
                <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">{errorMsg}</p>
              )}

              <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 pb-2 pt-3">
                <button type="button" onClick={onClose} className="btn-ghost text-xs font-semibold">
                  Cancel
                </button>
                <button
                  type="submit"
                  id="cenq-submit-btn"
                  disabled={status === "loading"}
                  className="btn-accent rounded-xl text-xs font-bold px-5 py-2.5 disabled:opacity-60"
                >
                  {status === "loading" ? "Submitting…" : "Request Custom Plan →"}
                </button>
              </div>
            </form>
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
