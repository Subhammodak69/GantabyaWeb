import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteEnquiry,
  fetchDestinations,
  fetchEnquiries,
  fetchHotels,
  fetchPackages,
  fetchPackageVariants,
  fetchVehicles,
  updateEnquiry,
} from "../api";
import CustomSelect from "../components/CustomSelect";
import CustomDatePicker from "../components/CustomDatePicker";
import { LoaderCircle, MessageSquareText, X } from "lucide-react";

function formatDate(value) {
  if (!value) return "Date not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function getLookupItems(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

const STATUS_THEMES = {
  NEW: "bg-primary-50 text-primary border-primary-200",
  IN_PROGRESS: "bg-amber-50 text-amber-800 border-amber-200",
  QUOTED: "bg-purple-50 text-purple-800 border-purple-200",
  CONVERTED: "bg-green-50 text-success border-green-200",
  CANCELLED: "bg-rose-50 text-rose-800 border-rose-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function EnquiriesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lookupOptions, setLookupOptions] = useState({
    packages: [],
    variants: [],
    destinations: [],
    hotels: [],
    vehicles: [],
  });
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchEnquiries()
      .then((response) => {
        const data = response?.data;
        setItems(Array.isArray(data) ? data : data?.items || data?.results || []);
      })
      .catch((err) => setError(err.message || "Could not load your enquiries."))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (item) => {
    setEditing(item);
    setLookupError("");
    setLookupOptions((current) => ({ ...current, variants: [] }));
    setEditForm({
      name: item.enquirer_name || "", phone: item.enquirer_phone || "", email: item.enquirer_email || "", travel_date: item.travel_date || "",
      package_id: item.package_id || "", variant_id: item.variant_id || "", destination_id: item.destination_id || "",
      travel_duration_day: item.travel_duration_day ?? 0, travel_duration_night: item.travel_duration_night ?? 0,
      adult_count: item.adult_count ?? item.pax_no ?? 1, child_count: item.child_count ?? 0, senior_count: item.senior_count ?? 0,
      hotel_id: item.hotel_id || "", vehicle_id: item.vehicle_id || "",
      room_count: item.room_count ?? item.no_room ?? 0, vehicle_count: item.vehicle_count ?? 0,
      budget_min: item.budget_min ?? 0, budget_max: item.budget_max ?? 0,
      message: item.message || "", special_requirements: item.special_requirements || "", meal_plan: item.meal_plan || "ANY",
    });
  };

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    setLookupsLoading(true);

    Promise.allSettled([
      fetchPackages({ page: 1, page_size: 100 }),
      fetchDestinations(1, 100),
      fetchHotels(1, 100),
      fetchVehicles(1, 100),
    ]).then(([packagesResult, destinationsResult, hotelsResult, vehiclesResult]) => {
      if (!active) return;
      const failedLookups = [
        packagesResult,
        destinationsResult,
        hotelsResult,
        vehiclesResult,
      ].filter((result) => result.status === "rejected");
      if (failedLookups.length) {
        setLookupError("Some related options could not be loaded. Close and reopen the form to retry.");
      }
      setLookupOptions((current) => ({
        ...current,
        packages: packagesResult.status === "fulfilled" ? packagesResult.value.items : [],
        destinations: destinationsResult.status === "fulfilled" ? destinationsResult.value.items : [],
        hotels: hotelsResult.status === "fulfilled" ? getLookupItems(hotelsResult.value) : [],
        vehicles: vehiclesResult.status === "fulfilled" ? getLookupItems(vehiclesResult.value) : [],
      }));
      setLookupsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [editing]);

  useEffect(() => {
    if (!editing || !editForm?.package_id) {
      setLookupOptions((current) => ({ ...current, variants: [] }));
      return undefined;
    }
    if (lookupsLoading) return undefined;

    const selectedPackage = lookupOptions.packages.find((item) =>
      String(item.id) === String(editForm.package_id) ||
      String(item.package_id) === String(editForm.package_id)
    );
    const packageRef = selectedPackage?.slug || selectedPackage?.id || editForm.package_id;
    let active = true;

    fetchPackageVariants(packageRef)
      .then((result) => {
        if (active) {
          setLookupOptions((current) => ({ ...current, variants: result.items || [] }));
        }
      })
      .catch((error) => {
        if (active) {
          setLookupOptions((current) => ({ ...current, variants: [] }));
          setLookupError(error.message || "Package variants could not be loaded.");
        }
      });

    return () => {
      active = false;
    };
  }, [editing, editForm?.package_id, lookupsLoading, lookupOptions.packages]);

  const optionsWithCurrent = (records, id, getLabel, fallback) => {
    const options = records
      .filter((record) => record?.id || record?.package_id)
      .map((record) => ({
        label: getLabel(record) || "Unnamed item",
        value: record.package_id || record.id,
      }));
    if (id && !options.some((option) => String(option.value) === String(id))) {
      options.unshift({ label: fallback || "Previously selected item", value: id });
    }
    return options;
  };

  const selectEditField = (key, label, options, placeholder) => (
    <label key={key} className="text-xs font-bold text-slate-600">
      {label}
      <CustomSelect
        value={editForm[key]}
        options={options}
        onChange={(value) => {
          setEditForm((current) => ({
            ...current,
            [key]: value,
            ...(key === "package_id" ? { variant_id: "" } : {}),
          }));
        }}
        triggerClassName="mt-1 h-10"
        placeholder={placeholder}
        disabled={lookupsLoading || (key === "variant_id" && !editForm.package_id)}
      />
    </label>
  );

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editing?.id || !editForm.name.trim() || !editForm.phone.trim()) return;
    setSaving(true);
    try {
      await updateEnquiry(editing.id, {
        ...editForm,
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        travel_duration_day: Number(editForm.travel_duration_day) || 0,
        travel_duration_night: Number(editForm.travel_duration_night) || 0,
        adult_count: Number(editForm.adult_count) || 0,
        child_count: Number(editForm.child_count) || 0,
        senior_count: Number(editForm.senior_count) || 0,
        room_count: Number(editForm.room_count) || 0,
        vehicle_count: Number(editForm.vehicle_count) || 0,
        budget_min: Number(editForm.budget_min) || 0,
        budget_max: Number(editForm.budget_max) || 0,
      });
      const response = await fetchEnquiries();
      setItems(Array.isArray(response?.data) ? response.data : []);
      setEditing(null);
    } catch (err) { setError(err.message || "Could not update your enquiry."); }
    finally { setSaving(false); }
  };

  const removeItem = async (item) => {
    if (!item.id || !window.confirm("Delete this enquiry permanently?")) return;
    try {
      await deleteEnquiry(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err) { setError(err.message || "Could not delete your enquiry."); }
  };

  const filteredItems = activeFilter === "ALL"
    ? items
    : items.filter((item) => (item.status || "NEW") === activeFilter);

  const statuses = ["ALL", ...Array.from(new Set(items.map((i) => i.status || "NEW")))];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hero Header Banner */}
      <section className="relative flex min-h-[220px] items-center overflow-hidden bg-navy px-4 pb-8 pt-8 text-white sm:px-6 lg:px-12">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">
            Travel Dashboard
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            My <span className="text-primary-300">Enquiries</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-white/80 max-w-xl">
            Track your holiday requests, customized itinerary quotes, and communicate directly with your tour planner.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Actions Bar & Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setActiveFilter(status)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  activeFilter === status
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {status.replace(/_/g, " ")} {status !== "ALL" && `(${items.filter((i) => (i.status || "NEW") === status).length})`}
              </button>
            ))}
          </div>

          <Link
            to="/custom-tour-enquiry"
            className="btn-accent rounded-xl text-xs font-bold"
          >
            New Custom Enquiry →
          </Link>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-600" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card mt-6 flex flex-col items-center justify-center p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-slate-600">Loading your enquiries…</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="card mt-6 flex flex-col items-center justify-center p-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-2xl text-primary">
              <MessageSquareText size={28} />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-navy">
              {activeFilter === "ALL" ? "No enquiries found" : `No enquiries with status "${activeFilter.replace(/_/g, " ")}"`}
            </h3>
            <p className="mt-1.5 max-w-md text-xs text-slate-500">
              {activeFilter === "ALL"
                ? "You haven't requested any custom tours or package quotes yet. Start exploring your next trip!"
                : "Try switching filters to view other enquiries."}
            </p>
            {activeFilter === "ALL" && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/tours" className="btn-outline rounded-xl text-xs font-bold">
                  Browse Packages
                </Link>
                <Link to="/custom-tour-enquiry" className="btn-primary rounded-xl text-xs font-bold">
                  Request Custom Itinerary
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const status = item.status || "NEW";
              const themeCls = STATUS_THEMES[status] || "bg-slate-100 text-slate-700 border-slate-200";

              return (
                <article
                  key={item.id || item.enquiry_code}
                  className="card p-5 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Code & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          {item.enquiry_code || "ENQUIRY"}
                        </span>
                        <h2 className="mt-0.5 truncate font-display text-base font-bold leading-tight text-navy">
                          {item.subject || item.destination_name || item.destination || "Custom Itinerary"}
                        </h2>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${themeCls}`}>
                        {status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                      <div>
                        <span className="block text-[10px] font-medium text-slate-400">Type</span>
                        <b className="text-navy">{item.enquiry_type?.replace(/_/g, " ") || "TOUR"}</b>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-400">Travel Date</span>
                        <b className="text-navy">{formatDate(item.travel_date)}</b>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-400">Travellers / Rooms</span>
                        <b className="text-navy">{item.adult_count ?? item.pax_no ?? 0} Adults · {item.room_count ?? item.no_room ?? 0} Rm</b>
                      </div>
                      <div>
                        <span className="block text-[10px] font-medium text-slate-400">Channel</span>
                        <b className="text-navy">{item.channel || "WEBSITE"}</b>
                      </div>
                    </div>

                    {/* Message / Special Request */}
                    {item.message && (
                      <p className="mt-3 rounded-lg border border-slate-100 bg-white p-2.5 text-xs italic leading-relaxed text-slate-600">
                        "{item.message}"
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                    <span>Submitted {formatDate(item.created_at)}</span>
                    <div className="flex items-center gap-3">{item.enquirer_phone && <span className="font-semibold text-slate-700">📞 {item.enquirer_phone}</span>}<button type="button" onClick={() => startEdit(item)} className="font-bold text-primary hover:underline">Edit</button><button type="button" onClick={() => removeItem(item)} className="font-bold text-rose-600 hover:underline">Delete</button></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      {editing && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/70 p-4">
          <form onSubmit={saveEdit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-navy">Edit enquiry</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-slate-100 p-2 text-slate-600" aria-label="Close edit form">
                <X size={18} />
              </button>
            </div>
            {lookupError && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800" role="status">
                {lookupError}
              </p>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["name", "Full name", "text"],
                ["phone", "Phone", "tel"],
                ["email", "Email", "email"],
                ["travel_duration_day", "Duration (days)", "number"],
                ["travel_duration_night", "Duration (nights)", "number"],
                ["adult_count", "Adults", "number"],
                ["child_count", "Children", "number"],
                ["senior_count", "Seniors", "number"],
                ["room_count", "Rooms", "number"],
                ["vehicle_count", "Vehicles", "number"],
                ["budget_min", "Minimum budget", "number"],
                ["budget_max", "Maximum budget", "number"],
              ].map(([key, label, type]) => (
                <label key={key} className="text-xs font-bold text-slate-600">
                  {label}
                  <input
                    type="text"
                    inputMode={type === "number" ? "numeric" : undefined}
                    pattern={type === "number" ? "[0-9]*" : undefined}
                    required={key === "name" || key === "phone"}
                    value={editForm[key]}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (type !== "number" || /^\d*$/.test(nextValue)) {
                        setEditForm((current) => ({ ...current, [key]: nextValue }));
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-primary"
                  />
                </label>
              ))}
              {selectEditField(
                "package_id",
                "Package",
                optionsWithCurrent(
                  lookupOptions.packages,
                  editForm.package_id,
                  (item) => item.title || item.destination,
                  editing.tourTitle || editing.package_name || editing.package?.title || editing.package?.name,
                ),
                lookupsLoading ? "Loading packages..." : "Select package",
              )}
              {selectEditField(
                "variant_id",
                "Variant",
                optionsWithCurrent(
                  lookupOptions.variants,
                  editForm.variant_id,
                  (item) => item.name || item.season_name,
                  editing.variantName || editing.variant_name || editing.variant?.name,
                ),
                !editForm.package_id ? "Select a package first" : "Select variant",
              )}
              {selectEditField(
                "destination_id",
                "Destination",
                optionsWithCurrent(
                  lookupOptions.destinations,
                  editForm.destination_id,
                  (item) => item.name || item.destination_name,
                  editing.destination_name || editing.destination,
                ),
                lookupsLoading ? "Loading destinations..." : "Select destination",
              )}
              {selectEditField(
                "hotel_id",
                "Hotel",
                optionsWithCurrent(
                  lookupOptions.hotels,
                  editForm.hotel_id,
                  (item) => item.name || item.hotel_name || item.title,
                  editing.hotel_name || editing.hotel?.name,
                ),
                lookupsLoading ? "Loading hotels..." : "Select hotel",
              )}
              {selectEditField(
                "vehicle_id",
                "Vehicle",
                optionsWithCurrent(
                  lookupOptions.vehicles,
                  editForm.vehicle_id,
                  (item) => item.name || item.vehicle_name || item.title,
                  editing.vehicle_name || editing.vehicle?.name,
                ),
                lookupsLoading ? "Loading vehicles..." : "Select vehicle",
              )}
              <label className="text-xs font-bold text-slate-600">
                Travel date
                <CustomDatePicker
                  id="edit-enquiry-travel-date"
                  value={editForm.travel_date}
                  onChange={(value) => setEditForm((current) => ({ ...current, travel_date: value }))}
                  placeholder="Choose travel date"
                  triggerClassName="mt-1 h-10"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Meal plan
                <CustomSelect
                  id="edit-enquiry-meal-plan"
                  value={editForm.meal_plan}
                  options={["ANY", "NONE", "CP", "MAP", "AP"].map((meal) => ({ label: meal, value: meal }))}
                  onChange={(value) => setEditForm((current) => ({ ...current, meal_plan: value }))}
                  triggerClassName="mt-1 h-10"
                  placeholder="Select meal plan"
                />
              </label>
            </div>
            <label className="mt-3 block text-xs font-bold text-slate-600">
              Message
              <textarea
                value={editForm.message}
                onChange={(event) => setEditForm((current) => ({ ...current, message: event.target.value }))}
                className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-primary"
              />
            </label>
            <label className="mt-3 block text-xs font-bold text-slate-600">
              Special requirements
              <textarea
                value={editForm.special_requirements}
                onChange={(event) => setEditForm((current) => ({ ...current, special_requirements: event.target.value }))}
                className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-primary"
              />
            </label>
            <button disabled={saving} className="btn-primary mt-5 flex w-full items-center justify-center gap-2">
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              Save changes
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
