import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, FileText, LoaderCircle } from "lucide-react";
import {
  fetchDestinations,
  fetchEnquiries,
  fetchHotels,
  fetchPackages,
  fetchPackageVariants,
  fetchVehicles,
} from "../api";

const STATUS_THEMES = {
  NEW: "border-primary-200 bg-primary-50 text-primary",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-800",
  QUOTED: "border-purple-200 bg-purple-50 text-purple-800",
  CONVERTED: "border-green-200 bg-green-50 text-green-800",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-800",
  CLOSED: "border-slate-200 bg-slate-100 text-slate-700",
};

function getEnquiries(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getItems(response) {
  const data = response?.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function displayValue(value) {
  if (value === undefined || value === null || value === "") return "Not provided";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  if (typeof value === "object") {
    for (const key of ["name", "title", "label", "display_name", "description", "value"]) {
      if (value[key] !== undefined && value[key] !== null && value[key] !== "") return displayValue(value[key]);
    }
    return "Not provided";
  }
  return "Not provided";
}

function lookupLabel(items, id) {
  if (!id) return undefined;
  const match = items.find((item) => String(item.id || item.package_id) === String(id));
  return match && firstValue(match.title, match.name, match.destination_name, match.destination, match.hotel_name, match.vehicle_name);
}

function firstValue(...values) {
  return values.find((value) =>
    (typeof value === "string" && value.trim() !== "") ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function formatDate(value) {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? displayValue(value)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatBudget(value) {
  if (value === undefined || value === null || value === "") return "Not provided";
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toLocaleString("en-IN")}` : displayValue(value);
}

function Detail({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-800">{displayValue(value)}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wider text-slate-500">{title}</h2>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

export default function EnquiryDetailsPage() {
  const { enquiryId } = useParams();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lookupOptions, setLookupOptions] = useState({ packages: [], variants: [], destinations: [], hotels: [], vehicles: [] });
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    fetchEnquiries(0, 100)
      .then((response) => {
        if (!active) return;
        const match = getEnquiries(response).find((item) => String(item.id) === String(enquiryId));
        if (!match) {
          setError("This enquiry could not be found. It may have been removed or is no longer available.");
          return;
        }
        setEnquiry(match);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Could not load this enquiry.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enquiryId]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetchPackages({ page: 1, page_size: 100 }),
      fetchDestinations(1, 100),
      fetchHotels(1, 100),
      fetchVehicles(1, 100),
    ]).then(([packages, destinations, hotels, vehicles]) => {
      if (!active) return;
      const failed = [packages, destinations, hotels, vehicles].some((result) => result.status === "rejected");
      setLookupError(failed ? "Some linked names could not be resolved; showing the enquiry data available." : "");
      setLookupOptions((current) => ({
        ...current,
        packages: packages.status === "fulfilled" ? getItems(packages.value) : [],
        destinations: destinations.status === "fulfilled" ? getItems(destinations.value) : [],
        hotels: hotels.status === "fulfilled" ? getItems(hotels.value) : [],
        vehicles: vehicles.status === "fulfilled" ? getItems(vehicles.value) : [],
      }));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!enquiry?.package_id || lookupOptions.packages.length === 0) return undefined;
    const selectedPackage = lookupOptions.packages.find((item) =>
      String(item.id || item.package_id) === String(enquiry.package_id)
    );
    const packageRef = selectedPackage?.slug || selectedPackage?.id || enquiry.package_id;
    let active = true;
    fetchPackageVariants(packageRef)
      .then((response) => {
        if (active) setLookupOptions((current) => ({ ...current, variants: response.items || [] }));
      })
      .catch(() => {
        if (active) setLookupError("The linked package variant could not be resolved; showing the enquiry data available.");
      });
    return () => { active = false; };
  }, [enquiry, lookupOptions.packages]);

  const title = enquiry && firstValue(
    enquiry.subject,
    enquiry.package?.title,
    enquiry.package?.name,
    enquiry.package_name,
    enquiry.tour_title,
    enquiry.destination_name,
    enquiry.destination
  );
  const status = String(enquiry?.status || "NEW").toUpperCase();
  const duration = enquiry && [
    enquiry.travel_duration_day != null ? `${enquiry.travel_duration_day} ${Number(enquiry.travel_duration_day) === 1 ? "day" : "days"}` : null,
    enquiry.travel_duration_night != null ? `${enquiry.travel_duration_night} ${Number(enquiry.travel_duration_night) === 1 ? "night" : "nights"}` : null,
  ].filter(Boolean).join(" · ");
  const budget = enquiry && (enquiry.budget_min != null || enquiry.budget_max != null)
    ? `${formatBudget(enquiry.budget_min)} – ${formatBudget(enquiry.budget_max)}`
    : "Not provided";

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <section className="bg-navy px-4 py-9 text-white sm:px-6 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <Link to="/my-enquiries" className="inline-flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white">
            <ArrowLeft size={15} /> Back to enquiries
          </Link>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-primary-200">Travel dashboard</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">Enquiry details</h1>
          {enquiry && <p className="mt-2 text-sm text-white/70">{displayValue(title)}</p>}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {loading ? (
          <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-sm font-semibold text-slate-500">
            <LoaderCircle size={18} className="animate-spin text-primary" /> Loading enquiry details…
          </div>
        ) : error ? (
          <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p>{error}</p>
            <Link to="/my-enquiries" className="mt-4 inline-flex font-bold underline">Return to enquiries</Link>
          </div>
        ) : enquiry ? (
          <article className="-mt-4 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-primary">Reference</p>
                <p className="mt-1 font-bold text-navy">{displayValue(firstValue(enquiry.enquiry_code, enquiry.id))}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${STATUS_THEMES[status] || STATUS_THEMES.NEW}`}>
                  {status.replace(/_/g, " ")}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  {displayValue(enquiry.enquiry_type).replace(/_/g, " ")}
                </span>
              </div>
            </div>

            <Section title="Contact information">
              <Detail label="Full name" value={firstValue(enquiry.enquirer_name, enquiry.name, enquiry.full_name)} />
              <Detail label="Phone" value={firstValue(enquiry.enquirer_phone, enquiry.phone, enquiry.mobile)} />
              <Detail label="Email" value={firstValue(enquiry.enquirer_email, enquiry.email)} />
              <Detail label="Channel" value={enquiry.channel} />
            </Section>

            <Section title="Travel details">
              <Detail label="Package / tour" value={firstValue(enquiry.package?.title, enquiry.package?.name, enquiry.package_name, enquiry.tour_title, lookupLabel(lookupOptions.packages, enquiry.package_id), enquiry.subject)} />
              <Detail label="Variant" value={firstValue(enquiry.variant?.name, enquiry.variant?.season_name, enquiry.variant_name, enquiry.variant?.title, lookupLabel(lookupOptions.variants, enquiry.variant_id))} />
              <Detail label="Destination" value={firstValue(enquiry.destination_name, enquiry.destination?.name, typeof enquiry.destination === "string" ? enquiry.destination : undefined, lookupLabel(lookupOptions.destinations, enquiry.destination_id))} />
              <Detail label="Travel date" value={formatDate(enquiry.travel_date)} />
              <Detail label="Duration" value={duration || enquiry.travel_duration} />
              <Detail label="Meal plan" value={enquiry.meal_plan} />
            </Section>

            <Section title="Travelers & arrangements">
              <Detail label="Adults" value={firstValue(enquiry.adult_count, enquiry.pax_no)} />
              <Detail label="Children" value={enquiry.child_count} />
              <Detail label="Seniors" value={enquiry.senior_count} />
              <Detail label="Rooms" value={firstValue(enquiry.room_count, enquiry.no_room)} />
              <Detail label="Hotel" value={firstValue(enquiry.hotel_name, enquiry.hotel?.name, lookupLabel(lookupOptions.hotels, enquiry.hotel_id))} />
              <Detail label="Vehicles" value={enquiry.vehicle_count} />
              <Detail label="Vehicle" value={firstValue(enquiry.vehicle_name, enquiry.vehicle?.name, lookupLabel(lookupOptions.vehicles, enquiry.vehicle_id))} />
              <Detail label="Vehicle registration" value={enquiry.vehicle_registration_number} />
              <Detail label="Budget range" value={budget} />
            </Section>

            <Section title="Message & requirements">
              <Detail label="Message" value={enquiry.message} />
              <Detail label="Special requirements" value={enquiry.special_requirements} />
            </Section>
            {lookupError && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">{lookupError}</p>}
            <Section title="Submission information">
              <Detail label="Submitted" value={formatDate(enquiry.created_at)} />
              <Detail label="Last updated" value={formatDate(enquiry.updated_at)} />
            </Section>
            <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <CalendarDays size={14} className="text-primary" /> Enquiry information as submitted
            </div>
            <Link
              to={`/my-enquiries/${encodeURIComponent(enquiry.id)}/quotations`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-50 px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary-100"
            >
              <FileText size={17} /> View quotations <ArrowRight size={16} />
            </Link>
          </article>
        ) : null}
      </div>
    </main>
  );
}
