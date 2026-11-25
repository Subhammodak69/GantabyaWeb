import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchAllDestinations, fetchPackageVariants, fetchPackages } from "../api";
import { useTravel } from "../contexts/TravelContext";
import Seo from "../components/Seo";
import CustomSelect from "../components/CustomSelect";
import enums from "../utils/enums.json";
import { ArrowLeft, ArrowRight, Check, MapPin, Search, Sparkle } from "lucide-react";
import CONTACTS from "../config/contacts.json";

const VEHICLE_OPTIONS = Object.values(enums.VehicleType);
const MEAL_OPTIONS = Object.values(enums.MealPlan);
const HOTEL_CATEGORIES = [
  { value: "BUDGET", label: "Budget" },
  { value: "STANDARD", label: "Standard" },
  { value: "DELUXE", label: "Deluxe" },
  { value: "LUXURY", label: "Luxury" },
];
const ROOM_TYPES = [
  { value: "SINGLE", label: "Single" },
  { value: "DOUBLE", label: "Double" },
  { value: "TWIN", label: "Twin" },
  { value: "TRIPLE", label: "Triple" },
  { value: "FAMILY", label: "Family" },
  { value: "SUITE", label: "Suite" },
  { value: "DELUXE", label: "Deluxe" },
  { value: "EXECUTIVE", label: "Executive" },
  { value: "PRESIDENTIAL", label: "Presidential" },
];
const ENQUIRY_TYPE_OPTIONS = Object.values(enums.EnquiryType).filter(
  (type) => type !== "FIXED_TOUR" && type !== "FIXED TOUR"
);
const WHATSAPP_NUMBER = CONTACTS.whatsapp?.[0]?.number || "919932204885";
const STEPS = [
  { id: 1, title: "Contact details", description: "Who should we contact?" },
  { id: 2, title: "Choose your trip", description: "Destination or tour package" },
  { id: 3, title: "Travel plans", description: "Dates and travellers" },
  { id: 4, title: "Preferences", description: "Stay, transport and budget" },
];

const INITIAL = {
  name: "",
  mobile: "",
  email: "",
  destination: "",
  destination_id: "",
  package_id: "",
  variant_id: "",
  travel_date: "",
  travel_duration_day: 0,
  travel_duration_night: 0,
  adult_count: 2,
  child_count: 0,
  senior_count: 0,
  room_count: 1,
  hotel_category: "",
  room_type: "",
  vehicle_count: 0,
  budget_min: 0,
  budget_max: 0,
  vehicle_type: "ANY",
  meal_plan: "ANY",
  special_requirements: "",
  enquiry_type: "CUSTOM_TOUR",
};

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const selectClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800";
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700";

export default function CustomTourEnquiryPage() {
  const { user, goHome } = useTravel();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [step, setStep] = useState(1);
  const [selectionMode, setSelectionMode] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const firstRef = useRef(null);
  const submitRequested = useRef(false);
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [destinationsError, setDestinationsError] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [packageTypeFilter, setPackageTypeFilter] = useState("ALL");
  const [packageDestinationFilter, setPackageDestinationFilter] = useState("ALL");
  const [variants, setVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsError, setVariantsError] = useState("");
  const customTourPrefill = location.state?.customTourPrefill;

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name || current.name,
      mobile: user?.mobile || user?.phone || current.mobile,
    }));
  }, [user]);

  useEffect(() => {
    if (!customTourPrefill?.packageId) return;
    setSelectionMode("PACKAGE");
    setForm((current) => ({
      ...current,
      package_id: customTourPrefill.packageId,
      variant_id: customTourPrefill.variantId || "",
      travel_date: customTourPrefill.travelDate || "",
      travel_duration_day: customTourPrefill.durationDays || current.travel_duration_day,
      travel_duration_night: customTourPrefill.durationNights || current.travel_duration_night,
    }));
  }, [customTourPrefill]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (step === 1) setTimeout(() => firstRef.current?.focus(), 100);
  }, [step]);

  useEffect(() => {
    let active = true;
    const loadPackages = async () => {
      setPackagesLoading(true);
      setPackagesError("");
      try {
        const allPackages = [];
        let page = 1;
        let totalPages = 1;
        do {
          const result = await fetchPackages({ page, page_size: 100 });
          allPackages.push(...(Array.isArray(result?.items) ? result.items : []));
          totalPages = Number(result?.pages) || 1;
          page += 1;
        } while (active && page <= totalPages);
        if (active) setPackages(allPackages);
      } catch (error) {
        if (active) setPackagesError(error.message || "Unable to load tour packages.");
      } finally {
        if (active) setPackagesLoading(false);
      }
    };

    loadPackages();
    fetchAllDestinations()
      .then((items) => active && setDestinations(Array.isArray(items) ? items : []))
      .catch((error) => active && setDestinationsError(error.message || "Unable to load destinations."));
    return () => { active = false; };
  }, []);

  const selectedPackage = useMemo(
    () => packages.find((item) => (item.package_id || item.id) === form.package_id),
    [packages, form.package_id]
  );

  useEffect(() => {
    const packageSlug = selectedPackage?.slug || "";
    if (!packageSlug) {
      setVariants([]);
      setVariantsLoading(false);
      setVariantsError("");
      return undefined;
    }

    let active = true;
    setVariantsLoading(true);
    setVariantsError("");
    fetchPackageVariants(packageSlug, 1, 100)
      .then((response) => {
        if (active) setVariants(Array.isArray(response?.items) ? response.items : []);
      })
      .catch((error) => {
        if (!active) return;
        setVariants([]);
        setVariantsError(error.message || "Unable to load package variants.");
      })
      .finally(() => active && setVariantsLoading(false));
    return () => { active = false; };
  }, [selectedPackage]);

  const destinationOptions = useMemo(() => {
    const options = new Map();
    destinations.forEach((item) => {
      const value = item.id || item.destination_id;
      const label = item.name || item.destination_name;
      if (value && label) options.set(value, { value, label });
    });
    packages.forEach((item) => {
      const value = item.destination_id;
      const label = item.destination || item.destination_name;
      if (value && label && !options.has(value)) options.set(value, { value, label });
    });
    return Array.from(options.values());
  }, [destinations, packages]);

  const packageTypes = useMemo(
    () => Array.from(new Set(packages.map((item) => item.type).filter(Boolean))),
    [packages]
  );
  const filteredPackages = useMemo(() => {
    const search = packageSearch.trim().toLowerCase();
    return packages.filter((item) => {
      const searchableText = [item.title, item.destination, item.description, item.code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (!search || searchableText.includes(search))
        && (packageTypeFilter === "ALL" || item.type === packageTypeFilter)
        && (packageDestinationFilter === "ALL" || item.destination_id === packageDestinationFilter);
    });
  }, [packages, packageSearch, packageTypeFilter, packageDestinationFilter]);

  const selectedVariant = variants.find((item) => item.id === form.variant_id);
  const selectedDestination = selectionMode === "PACKAGE"
    ? selectedPackage?.destination || selectedPackage?.destination_name || ""
    : form.destination;
  const packageSelectionIsValid = Boolean(form.package_id)
    && !variantsLoading
    && (!variants.length || Boolean(form.variant_id));
  const selectionIsValid = selectionMode === "DESTINATION"
    ? Boolean(form.destination_id)
    : selectionMode === "PACKAGE" && packageSelectionIsValid;
  const departureDateOptions = (selectedVariant?.dates || [])
    .filter((date) => date.date || date.departure_date)
    .map((date) => {
      const departure = date.date || date.departure_date;
      const returnDate = date.return_date ? ` – ${date.return_date}` : "";
      return { label: `${departure}${returnDate}`, value: departure };
    });
  const canContinue = step === 1
    ? Boolean(form.name.trim() && form.mobile.trim())
    : step === 2
    ? selectionIsValid
    : true;

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrorMsg("");
  };
  const setNumber = (field) => (event) => {
    if (/^\d*$/.test(event.target.value)) {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setErrorMsg("");
    }
  };
  const chooseSelectionMode = (mode) => {
    setSelectionMode(mode);
    setForm((current) => ({
      ...current,
      package_id: "",
      variant_id: "",
      destination_id: "",
      destination: "",
      travel_date: "",
    }));
    setVariants([]);
    setErrorMsg("");
  };
  const applyPackage = (item) => {
    const packageId = item.package_id || item.id;
    if (form.package_id === packageId) return;
    setForm((current) => ({
      ...current,
      package_id: packageId,
      variant_id: "",
      destination_id: "",
      destination: "",
      travel_date: "",
    }));
    setVariants([]);
    setVariantsLoading(true);
    setVariantsError("");
    setErrorMsg("");
  };
  const applyDestination = (destination) => {
    setForm((current) => ({
      ...current,
      package_id: "",
      variant_id: "",
      destination_id: destination.value,
      destination: destination.label,
      travel_date: "",
    }));
    setVariants([]);
    setErrorMsg("");
  };
  const applyVariant = (variant) => {
    setForm((current) => ({
      ...current,
      variant_id: variant.id,
      travel_date: "",
      travel_duration_day: variant.duration_days || current.travel_duration_day,
      travel_duration_night: variant.duration_nights || current.travel_duration_night,
    }));
    setErrorMsg("");
  };
  const goNext = () => {
    if (!canContinue) {
      setErrorMsg(step === 1
        ? "Enter your name and mobile number to continue."
        : "Choose a destination or select a package and variant to continue.");
      return;
    }
    setErrorMsg("");
    setStep((current) => Math.min(current + 1, STEPS.length));
  };
  const goPrevious = () => {
    setErrorMsg("");
    setStep((current) => Math.max(current - 1, 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (step !== STEPS.length || !submitRequested.current) return;
    submitRequested.current = false;

    if (!form.name.trim() || !form.mobile.trim() || !selectionIsValid) {
      setErrorMsg("Complete your contact details and choose a destination or package before submitting.");
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
        `Destination: ${selectedDestination || "Not specified"}`,
        `Package: ${selectedPackage?.title || "Custom itinerary"}`,
        `Variant: ${selectedVariant?.name || selectedVariant?.season_name || "Not selected"}`,
        `Departure date: ${form.travel_date || "Not selected"}`,
        `Duration: ${form.travel_duration_day || 0} days / ${form.travel_duration_night || 0} nights`,
        `Travellers: Adults ${form.adult_count || 0}, Children ${form.child_count || 0}, Seniors ${form.senior_count || 0}`,
        `Rooms: ${form.room_count || 0}`,
        `Hotel category: ${HOTEL_CATEGORIES.find((option) => option.value === form.hotel_category)?.label || "Not selected"}`,
        `Room type: ${ROOM_TYPES.find((option) => option.value === form.room_type)?.label || "Not selected"}`,
        `Vehicle type: ${form.vehicle_type || "ANY"}`,
        `Vehicles: ${form.vehicle_count || 0}`,
        `Budget: ${form.budget_min || 0} - ${form.budget_max || 0}`,
        `Meal plan: ${form.meal_plan || "ANY"}`,
        `Special requirements: ${form.special_requirements.trim() || "None"}`,
        selectedVariant?.cover_image
          ? `Package image: ${selectedVariant.cover_image}`
          : (selectedPackage?.image ? `Package image: ${selectedPackage.image}` : ""),
        "",
        "Please help me with availability, pricing and a personalized itinerary.",
      ].filter(Boolean).join("\n");
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;
      const whatsappWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (!whatsappWindow) window.location.assign(whatsappUrl);
      setStatus("success");
    } catch (error) {
      setErrorMsg(error.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const resetForm = () => {
    setForm({
      ...INITIAL,
      name: user?.name || "",
      mobile: user?.mobile || user?.phone || "",
    });
    setSelectionMode("");
    setStep(1);
    setStatus("idle");
    setErrorMsg("");
    setPackageSearch("");
    setPackageTypeFilter("ALL");
    setPackageDestinationFilter("ALL");
  };

  const currentStep = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <Seo
        title="Custom Tour Enquiry | Gantabyaa"
        description="Plan a tailor-made holiday with Gantabyaa. Share your preferred destinations, dates, and travel preferences for a custom itinerary."
        path="/custom-tour-enquiry"
        robots="index,follow"
      />
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkle size={14} /> Tailor-made itineraries
            </span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
              Plan your custom journey
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Share your travel preferences and our specialists will help shape your itinerary.
            </p>
          </div>
          {status !== "success" && (
            <p className="text-xs font-semibold text-slate-500">
              Step {step} of {STEPS.length}
            </p>
          )}
        </header>

        {status === "success" ? (
          <section className="flex flex-1 flex-col items-center justify-center py-12 text-center" role="status">
            <span className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl text-success">
              ✓
            </span>
            <h2 className="font-display text-2xl font-bold text-navy">Enquiry ready in WhatsApp</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              Your enquiry is prepared. Press Send in WhatsApp to share it with our travel team.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={resetForm} className="btn-outline rounded-xl text-sm font-bold">
                Submit another enquiry
              </button>
              <button type="button" onClick={goHome} className="btn-primary rounded-xl text-sm font-bold">
                Back to home
              </button>
            </div>
          </section>
        ) : (
          <div className="grid flex-1 gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
            <aside>
              <div className="mb-5 lg:hidden">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>{currentStep.title}</span>
                  <span>{Math.round((step / STEPS.length) * 100)}%</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-label="Custom tour enquiry progress"
                  aria-valuemin={1}
                  aria-valuemax={STEPS.length}
                  aria-valuenow={step}
                >
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / STEPS.length) * 100}%` }} />
                </div>
              </div>
              <nav aria-label="Enquiry steps" className="hidden lg:block">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Your enquiry</p>
                <ol className="mt-4 space-y-1">
                  {STEPS.map((item) => {
                    const complete = item.id < step;
                    const active = item.id === step;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-current={active ? "step" : undefined}
                          disabled={!complete}
                          onClick={() => setStep(item.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                            active
                              ? "bg-primary/10 text-navy"
                              : complete
                              ? "text-emerald-700 hover:bg-emerald-50"
                              : "text-slate-400"
                          } ${complete ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                            active ? "bg-primary text-white" : complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                          }`}>
                            {complete ? <Check size={15} /> : item.id}
                          </span>
                          <span>
                            <span className="block text-sm font-bold">{item.title}</span>
                            <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{item.description}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </aside>

            <section className="min-w-0">
              <div className="mb-6 border-b border-slate-200 pb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Step {String(step).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-navy sm:text-2xl">{currentStep.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{currentStep.description}</p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-7">
                {step === 1 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="custom-page-name">Full name <span className="text-rose-500">*</span></label>
                      <input ref={firstRef} id="custom-page-name" type="text" autoComplete="name" value={form.name} onChange={setField("name")} placeholder="Your full name" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="custom-page-mobile">Mobile / WhatsApp <span className="text-rose-500">*</span></label>
                      <input id="custom-page-mobile" type="tel" autoComplete="tel" value={form.mobile} onChange={setField("mobile")} placeholder="+91 98765 43210" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass} htmlFor="custom-page-email">Email address</label>
                      <input id="custom-page-email" type="email" autoComplete="email" value={form.email} onChange={setField("email")} placeholder="you@example.com" className={inputClass} />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        aria-pressed={selectionMode === "DESTINATION"}
                        onClick={() => chooseSelectionMode("DESTINATION")}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selectionMode === "DESTINATION"
                            ? "border-primary bg-primary/5 ring-2 ring-primary/15"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="flex items-center gap-2 font-bold text-navy"><MapPin size={17} className="text-primary" /> Choose a destination</span>
                        <span className="mt-1 block text-xs text-slate-500">Build a custom itinerary around a place.</span>
                      </button>
                      <button
                        type="button"
                        aria-pressed={selectionMode === "PACKAGE"}
                        onClick={() => chooseSelectionMode("PACKAGE")}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selectionMode === "PACKAGE"
                            ? "border-primary bg-primary/5 ring-2 ring-primary/15"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="flex items-center gap-2 font-bold text-navy"><Sparkle size={17} className="text-primary" /> Choose a tour package</span>
                        <span className="mt-1 block text-xs text-slate-500">Pick a package first, then choose its variant.</span>
                      </button>
                    </div>

                    {selectionMode === "DESTINATION" && (
                      <div>
                        <div className="mb-3">
                          <h3 className="text-sm font-bold text-navy">Where would you like to go?</h3>
                          <p className="mt-1 text-xs text-slate-500">Choose one destination for your custom itinerary.</p>
                        </div>
                        {destinationsError && (
                          <p className="mb-3 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700">{destinationsError}</p>
                        )}
                        {destinationOptions.length ? (
                          <div className="flex gap-3 overflow-x-auto pb-2">
                            {destinationOptions.map((destination) => {
                              const selected = form.destination_id === destination.value;
                              return (
                                <button
                                  key={destination.value}
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() => applyDestination(destination)}
                                  className={`min-w-44 shrink-0 rounded-xl border px-4 py-3 text-left transition ${
                                    selected ? "border-primary bg-primary/5 text-navy ring-2 ring-primary/15" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                  }`}
                                >
                                  <span className="flex items-center justify-between gap-2 text-sm font-bold">
                                    {destination.label}
                                    {selected && <Check size={15} className="shrink-0 text-primary" />}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                            {destinationsError || "No destinations are available right now."}
                          </p>
                        )}
                      </div>
                    )}

                    {selectionMode === "PACKAGE" && (
                      <div className="space-y-5">
                        <div className="flex flex-col gap-3 xl:flex-row">
                          <label className="relative min-w-0 flex-1">
                            <span className="sr-only">Search packages</span>
                            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="search"
                              value={packageSearch}
                              onChange={(event) => setPackageSearch(event.target.value)}
                              placeholder="Search by package, destination or code"
                              className={`${inputClass} pl-10`}
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-3 xl:w-[26rem]">
                            <CustomSelect
                              ariaLabel="Filter by tour type"
                              value={packageTypeFilter}
                              options={[
                                { label: "All tour types", value: "ALL" },
                                ...packageTypes.map((type) => ({ label: type.replace(/_/g, " "), value: type })),
                              ]}
                              onChange={setPackageTypeFilter}
                              placeholder="All tour types"
                              triggerClassName={selectClass}
                            />
                            <CustomSelect
                              ariaLabel="Filter by destination"
                              value={packageDestinationFilter}
                              options={[
                                { label: "All destinations", value: "ALL" },
                                ...destinationOptions,
                              ]}
                              onChange={setPackageDestinationFilter}
                              placeholder="All destinations"
                              triggerClassName={selectClass}
                            />
                          </div>
                        </div>

                        {packagesError && (
                          <p className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700">{packagesError}</p>
                        )}
                        {packagesLoading ? (
                          <p className="py-6 text-sm text-slate-500" role="status">Loading tour packages…</p>
                        ) : filteredPackages.length ? (
                          <div className="flex gap-3 overflow-x-auto pb-3">
                            {filteredPackages.map((item) => {
                              const packageId = item.package_id || item.id;
                              const selected = form.package_id === packageId;
                              const image = item.image || item.cover_image || item.banner?.image;
                              return (
                                <button
                                  key={packageId}
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() => applyPackage(item)}
                                  className={`w-64 shrink-0 overflow-hidden rounded-xl border text-left transition ${
                                    selected ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <div className="relative h-28 overflow-hidden bg-gradient-to-br from-navy to-primary">
                                    {image ? (
                                      <img src={image} alt={item.title || "Tour package"} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="grid h-full place-items-center text-white/80"><MapPin size={22} /></div>
                                    )}
                                    {selected && (
                                      <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-primary text-white">
                                        <Check size={16} />
                                      </span>
                                    )}
                                  </div>
                                  <div className="p-3">
                                    <h3 className="truncate text-sm font-bold text-navy">{item.title || "Tour package"}</h3>
                                    <p className="mt-1 truncate text-xs text-slate-500">{item.destination || "Destination details unavailable"}</p>
                                    <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                      <span>{item.type ? item.type.replace(/_/g, " ") : "Tour package"}</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                            {packagesLoading ? "Loading tour packages…" : "No packages match these filters."}
                          </p>
                        )}

                        {selectedPackage && (
                          <div className="border-t border-slate-200 pt-5">
                            <div className="mb-3">
                              <h3 className="text-sm font-bold text-navy">Choose a package variant</h3>
                              <p className="mt-1 text-xs text-slate-500">
                                {selectedPackage.title} {selectedPackage.destination ? `· ${selectedPackage.destination}` : ""}
                              </p>
                            </div>
                            {variantsLoading ? (
                              <p className="py-4 text-sm text-slate-500" role="status">Loading available variants…</p>
                            ) : variantsError ? (
                              <p className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700">{variantsError}</p>
                            ) : variants.length ? (
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {variants.map((variant) => {
                                  const selected = form.variant_id === variant.id;
                                  return (
                                    <button
                                      key={variant.id}
                                      type="button"
                                      aria-pressed={selected}
                                      onClick={() => applyVariant(variant)}
                                      className={`rounded-xl border p-4 text-left transition ${
                                        selected ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-slate-200 bg-white hover:border-slate-300"
                                      }`}
                                    >
                                      <span className="flex items-start justify-between gap-3">
                                        <span className="font-bold text-navy">{variant.name || variant.season_name || "Standard variant"}</span>
                                        {selected && <Check size={16} className="shrink-0 text-primary" />}
                                      </span>
                                      <span className="mt-2 block text-xs text-slate-500">
                                        {variant.duration_days || 0} days · {variant.duration_nights || 0} nights
                                      </span>
                                      {(variant.valid_from || variant.valid_to) && (
                                        <span className="mt-1 block text-[11px] text-slate-500">
                                          Valid {variant.valid_from || "anytime"}{variant.valid_to ? ` – ${variant.valid_to}` : ""}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
                                No variants are listed for this package. You can continue with the package selection.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    {selectionMode === "PACKAGE" && selectedPackage && (
                      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected package</p>
                          <p className="mt-1 text-sm font-bold text-navy">{selectedPackage.title}</p>
                          {selectedVariant && <p className="mt-0.5 text-xs text-slate-500">{selectedVariant.name || selectedVariant.season_name}</p>}
                        </div>
                        <button type="button" onClick={goPrevious} className="text-xs font-bold text-primary hover:underline">Change</button>
                      </div>
                    )}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className={labelClass} htmlFor="custom-page-date">Preferred departure date</label>
                        {departureDateOptions.length ? (
                          <CustomSelect
                            id="custom-page-date"
                            value={form.travel_date}
                            options={[{ label: "Choose a departure date", value: "" }, ...departureDateOptions]}
                            onChange={(value) => setForm((current) => ({ ...current, travel_date: value }))}
                            placeholder="Choose a departure date"
                            triggerClassName={selectClass}
                          />
                        ) : (
                          <input id="custom-page-date" type="date" value={form.travel_date} onChange={setField("travel_date")} className={inputClass} />
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Trip duration</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="custom-page-days">Days</label>
                            <input id="custom-page-days" type="text" inputMode="numeric" pattern="[0-9]*" value={form.travel_duration_day} onChange={setNumber("travel_duration_day")} className={inputClass} placeholder="Enter days" />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="custom-page-nights">Nights</label>
                            <input id="custom-page-nights" type="text" inputMode="numeric" pattern="[0-9]*" value={form.travel_duration_night} onChange={setNumber("travel_duration_night")} className={inputClass} placeholder="Enter nights" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className={labelClass}>Travellers</h3>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {[
                          ["adult_count", "Adults"],
                          ["child_count", "Children"],
                          ["senior_count", "Seniors"],
                        ].map(([field, label]) => (
                          <div key={field}>
                            <label className={labelClass} htmlFor={`custom-page-${field}`}>{label}</label>
                            <input id={`custom-page-${field}`} type="text" inputMode="numeric" pattern="[0-9]*" value={form[field]} onChange={setNumber(field)} className={inputClass} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <label className={labelClass} htmlFor="custom-page-category">Tour category</label>
                        <CustomSelect
                          id="custom-page-category"
                          value={form.enquiry_type}
                          options={ENQUIRY_TYPE_OPTIONS.map((type) => ({ label: type.replace(/_/g, " "), value: type }))}
                          onChange={(value) => setForm((current) => ({ ...current, enquiry_type: value }))}
                          placeholder="Select category"
                          triggerClassName={selectClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="custom-page-rooms">Rooms required</label>
                        <input id="custom-page-rooms" type="text" inputMode="numeric" pattern="[0-9]*" value={form.room_count} onChange={setNumber("room_count")} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="custom-page-hotel-category">Hotel category</label>
                        <CustomSelect
                          id="custom-page-hotel-category"
                          value={form.hotel_category}
                          options={HOTEL_CATEGORIES}
                          onChange={(value) => setForm((current) => ({ ...current, hotel_category: value }))}
                          placeholder="Select hotel category"
                          triggerClassName={selectClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="custom-page-room-type">Room type</label>
                        <CustomSelect
                          id="custom-page-room-type"
                          value={form.room_type}
                          options={ROOM_TYPES}
                          onChange={(value) => setForm((current) => ({ ...current, room_type: value }))}
                          placeholder="Select room type"
                          triggerClassName={selectClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="custom-page-meal">Meal plan</label>
                        <CustomSelect
                          id="custom-page-meal"
                          value={form.meal_plan}
                          options={[{ label: "Any / No preference", value: "ANY" }, ...MEAL_OPTIONS.map((meal) => ({ label: meal, value: meal }))]}
                          onChange={(value) => setForm((current) => ({ ...current, meal_plan: value }))}
                          placeholder="Select meal plan"
                          triggerClassName={selectClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="custom-page-vehicle">Vehicle preference</label>
                        <CustomSelect
                          id="custom-page-vehicle"
                          value={form.vehicle_type}
                          options={[{ label: "Any / No preference", value: "ANY" }, ...VEHICLE_OPTIONS.map((vehicle) => ({ label: vehicle, value: vehicle }))]}
                          onChange={(value) => setForm((current) => ({ ...current, vehicle_type: value }))}
                          placeholder="Select vehicle"
                          triggerClassName={selectClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="custom-page-vehicle-count">Vehicles required</label>
                        <input id="custom-page-vehicle-count" type="text" inputMode="numeric" pattern="[0-9]*" value={form.vehicle_count} onChange={setNumber("vehicle_count")} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Budget range</label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="sr-only" htmlFor="custom-page-budget-min">Minimum budget</label>
                          <input id="custom-page-budget-min" type="text" inputMode="numeric" pattern="[0-9]*" value={form.budget_min} onChange={setNumber("budget_min")} className={inputClass} placeholder="Minimum budget (₹)" />
                        </div>
                        <div>
                          <label className="sr-only" htmlFor="custom-page-budget-max">Maximum budget</label>
                          <input id="custom-page-budget-max" type="text" inputMode="numeric" pattern="[0-9]*" value={form.budget_max} onChange={setNumber("budget_max")} className={inputClass} placeholder="Maximum budget (₹)" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="custom-page-special">Special requests or notes</label>
                      <textarea
                        id="custom-page-special"
                        value={form.special_requirements}
                        onChange={setField("special_requirements")}
                        placeholder="Share any specific requests, pickup location or places you would like to visit."
                        rows={4}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-medium text-rose-700" role="alert">
                    {errorMsg}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                  {step > 1 ? (
                    <button type="button" onClick={goPrevious} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white">
                      <ArrowLeft size={16} /> Back
                    </button>
                  ) : (
                    <button type="button" onClick={() => navigate(-1)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-white">
                      Cancel
                    </button>
                  )}
                  {step < STEPS.length ? (
                    <button type="button" onClick={goNext} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95">
                      Continue <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button type="submit" onClick={() => { submitRequested.current = true; }} disabled={status === "loading"} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">
                      {status === "loading" ? "Preparing enquiry…" : <>Prepare WhatsApp enquiry <ArrowRight size={16} /></>}
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
