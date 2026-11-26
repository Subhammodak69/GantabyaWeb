import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, FileText, LoaderCircle } from "lucide-react";
import { fetchEnquiryQuotations } from "../api";

function formatDate(value) {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(value) {
  if (value === undefined || value === null || value === "") return "—";
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toLocaleString("en-IN")}` : String(value);
}

function getQuotations(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function Detail({ label, value }) {
  const displayValue = value === undefined || value === null || value === ""
    ? "Not provided"
    : typeof value === "boolean"
      ? value ? "Yes" : "No"
      : value;
  return (
    <div className="min-w-0 py-2">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{displayValue}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 border-l-4 border-l-indigo-400 bg-white p-5 shadow-card sm:p-6">
      <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
      {children}
    </section>
  );
}

export default function QuotationDetailsPage() {
  const { enquiryId, quotationId } = useParams();
  const location = useLocation();
  const routeQuotation = location.state?.quotation;
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let active = true;
    const matchesRoute = routeQuotation?.id === quotationId
      && routeQuotation?.enquiry_id === enquiryId;

    setActiveTab("overview");
    setError("");
    if (matchesRoute) {
      setQuotation(routeQuotation);
      setLoading(false);
      return () => { active = false; };
    }

    setQuotation(null);
    setLoading(true);
    fetchEnquiryQuotations(enquiryId)
      .then((response) => {
        const found = getQuotations(response).find((item) => item.id === quotationId);
        if (!found) throw new Error("This quotation could not be found for the selected enquiry.");
        if (active) setQuotation(found);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Could not load quotation details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [enquiryId, quotationId, routeQuotation]);

  const backToQuotations = `/my-enquiries/${encodeURIComponent(enquiryId)}/quotations`;
  const status = String(quotation?.status || "PENDING").toUpperCase();
  const statusColor = status === "ACCEPTED"
    ? "bg-emerald-300/20 text-emerald-100"
    : status === "REJECTED"
      ? "bg-rose-300/20 text-rose-100"
      : status === "DRAFT"
        ? "bg-amber-300/20 text-amber-100"
        : "bg-cyan-300/20 text-cyan-100";
  const tabs = [
    { id: "overview", label: "Overview", count: null, color: "bg-indigo-600" },
    { id: "pricing", label: "Pricing", count: null, color: "bg-emerald-600" },
    { id: "items", label: "Items", count: quotation?.items?.length || 0, color: "bg-cyan-600" },
    { id: "hotels", label: "Hotels", count: quotation?.hotels?.length || 0, color: "bg-amber-500" },
    { id: "transport", label: "Transport", count: quotation?.vehicles?.length || 0, color: "bg-violet-600" },
    { id: "itinerary", label: "Itinerary", count: quotation?.itinerary?.length || 0, color: "bg-rose-600" },
    { id: "notes", label: "Notes", count: null, color: "bg-sky-600" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      {quotation && !loading && !error && (
        <section className="bg-gradient-to-br from-navy via-indigo-950 to-purple-900 px-4 py-7 text-white sm:px-6 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <Link to={backToQuotations} className="inline-flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white">
              <ArrowLeft size={15} /> Back to quotations
            </Link>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Travel dashboard · Quotation details</p>
                <h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{quotation.tour_name || "Travel quotation"}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-bold text-cyan-100">{quotation.quotation_code || "Quotation"}</span>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${statusColor}`}>
                    {status.replace(/_/g, " ")}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white/80">Version {quotation.version || 1}</span>
                </div>
              </div>
              <div className="min-w-[180px] rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-100">Total quotation</p>
                <p className="mt-1 text-2xl font-extrabold">{formatAmount(quotation.total_amount)}</p>
                <p className="mt-1 text-xs text-white/70">Valid until {formatDate(quotation.valid_until)}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-5xl space-y-4 px-4 pt-6 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-sm font-semibold text-slate-500">
            <LoaderCircle size={18} className="animate-spin text-primary" /> Loading quotation details…
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p>{error}</p>
            <Link to={backToQuotations} className="mt-4 inline-flex font-bold underline">Return to quotations</Link>
          </div>
        ) : quotation ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-card">
              <div className="flex gap-2 overflow-x-auto p-1" role="tablist" aria-label="Quotation detail sections">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`quotation-tab-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                      activeTab === tab.id ? `${tab.color} text-white shadow-md` : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                    {tab.count !== null && <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === tab.id ? "bg-white/20" : "bg-white text-slate-500"}`}>{tab.count}</span>}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "overview" && (
              <div id="quotation-panel-overview" role="tabpanel" aria-labelledby="quotation-tab-overview" className="space-y-4">
                <Section title="Trip details">
                  <dl className="mt-3 grid gap-x-6 sm:grid-cols-2">
                    <Detail label="Travel date" value={formatDate(quotation.travel_date)} />
                    <Detail label="Return date" value={formatDate(quotation.return_date)} />
                    <Detail label="Valid until" value={formatDate(quotation.valid_until)} />
                    <Detail label="Package" value={quotation.package?.name} />
                    <Detail label="Package variant" value={[quotation.variant?.name, quotation.variant?.season_name].filter(Boolean).join(" · ")} />
                    <Detail label="Destination" value={quotation.destination?.name} />
                  </dl>
                </Section>
                <Section title="Customer">
                  <dl className="mt-3 grid gap-x-6 sm:grid-cols-2">
                    <Detail label="Name" value={quotation.customer?.name} />
                    <Detail label="Mobile" value={quotation.customer?.mobile} />
                    <Detail label="Email" value={quotation.customer?.email} />
                  </dl>
                </Section>
              </div>
            )}

            {activeTab === "pricing" && (
              <div id="quotation-panel-pricing" role="tabpanel" aria-labelledby="quotation-tab-pricing" className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Subtotal", value: quotation.subtotal, colors: "border-cyan-200 bg-cyan-50 text-cyan-900" },
                  { label: "Discount", value: quotation.discount_amount, colors: "border-rose-200 bg-rose-50 text-rose-900" },
                  { label: "Tax", value: quotation.tax_amount, colors: "border-amber-200 bg-amber-50 text-amber-900" },
                  { label: "Total", value: quotation.total_amount, colors: "border-indigo-200 bg-indigo-50 text-indigo-900" },
                ].map((price) => (
                  <div key={price.label} className={`rounded-2xl border p-5 ${price.colors}`}>
                    <p className="text-xs font-bold uppercase tracking-wide opacity-75">{price.label}</p>
                    <p className="mt-2 text-2xl font-extrabold">{formatAmount(price.value)}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "items" && (
              <div id="quotation-panel-items" role="tabpanel" aria-labelledby="quotation-tab-items">
                <Section title="Quotation items">
                  {quotation.items?.length ? (
                    <div className="mt-3 divide-y divide-slate-100">
                      {quotation.items.map((item, index) => (
                        <div key={item.id || index} className="flex flex-wrap justify-between gap-3 py-3">
                          <div>
                            <p className="text-sm font-bold text-navy">{item.name || "Quotation item"}</p>
                            {item.description && <p className="mt-1 text-xs text-slate-500">{item.description}</p>}
                            <p className="mt-1 text-xs text-slate-500">Type: {item.item_type || "Other"} · Quantity: {item.quantity ?? 1}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-bold text-slate-800">{formatAmount(item.total_price ?? item.unit_price)}</p>
                            <p className="mt-1 text-xs text-slate-500">Unit: {formatAmount(item.unit_price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="mt-3 text-sm text-slate-500">No quotation items provided.</p>}
                </Section>
              </div>
            )}

            {activeTab === "hotels" && <div id="quotation-panel-hotels" role="tabpanel" aria-labelledby="quotation-tab-hotels"><Section title="Accommodation">
              {quotation.hotels?.length ? (
                <div className="mt-3 space-y-4">
                  {quotation.hotels.map((hotel, index) => (
                    <div key={hotel.id || index} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
                      <h3 className="font-bold text-navy">{hotel.hotel_name || "Hotel"}</h3>
                      <dl className="mt-2 grid gap-x-6 sm:grid-cols-2">
                        <Detail label="Place" value={hotel.place} />
                        <Detail label="Address" value={hotel.address} />
                        <Detail label="Check in" value={formatDate(hotel.check_in)} />
                        <Detail label="Check out" value={formatDate(hotel.check_out)} />
                        <Detail label="Nights / rooms" value={`${hotel.nights ?? "—"} / ${hotel.room_count ?? "—"}`} />
                        <Detail label="Room type" value={hotel.room_type} />
                        <Detail label="Paid by traveller" value={hotel.paid_by_traveller} />
                      </dl>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-3 text-sm text-slate-500">No accommodation details provided.</p>}
            </Section></div>}

            {activeTab === "transport" && <div id="quotation-panel-transport" role="tabpanel" aria-labelledby="quotation-tab-transport"><Section title="Transport">
              {quotation.vehicles?.length ? (
                <div className="mt-3 space-y-4">
                  {quotation.vehicles.map((vehicle, index) => (
                    <div key={vehicle.id || index} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
                      <h3 className="font-bold text-navy">{vehicle.vehicle_name || "Vehicle"}</h3>
                      <dl className="mt-2 grid gap-x-6 sm:grid-cols-2">
                        <Detail label="Vehicle type" value={vehicle.vehicle_type} />
                        <Detail label="Quantity" value={vehicle.quantity} />
                        <Detail label="Start" value={formatDate(vehicle.start_date)} />
                        <Detail label="End" value={formatDate(vehicle.end_date)} />
                        <Detail label="Pickup" value={vehicle.pickup_location} />
                        <Detail label="Drop off" value={vehicle.drop_location} />
                        <Detail label="Registration" value={vehicle.registration_number} />
                        <Detail label="Paid by traveller" value={vehicle.paid_by_traveller} />
                      </dl>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-3 text-sm text-slate-500">No transport details provided.</p>}
            </Section></div>}

            {activeTab === "itinerary" && <div id="quotation-panel-itinerary" role="tabpanel" aria-labelledby="quotation-tab-itinerary"><Section title="Day-by-day itinerary">
              {quotation.itinerary?.length ? (
                <ol className="mt-3 space-y-3">
                  {quotation.itinerary.map((day, index) => (
                    <li key={day.id || index} className="rounded-xl bg-slate-50 p-4">
                      <h3 className="font-bold text-navy">Day {day.day_number || index + 1}: {day.title}</h3>
                      <dl className="mt-2 grid gap-x-6 sm:grid-cols-2">
                        <Detail label="Date" value={formatDate(day.date)} />
                        <Detail label="Overnight location" value={day.overnight_location} />
                        <Detail label="Meal plan" value={day.meal_plan} />
                      </dl>
                      {day.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{day.description}</p>}
                    </li>
                  ))}
                </ol>
              ) : <p className="mt-3 text-sm text-slate-500">No itinerary provided.</p>}
            </Section></div>}

            {activeTab === "notes" && <div id="quotation-panel-notes" role="tabpanel" aria-labelledby="quotation-tab-notes"><Section title="Notes and conditions">
              <dl className="mt-3 grid gap-x-6 sm:grid-cols-2">
                <Detail label="Inclusions" value={quotation.inclusion} />
                <Detail label="Exclusions" value={quotation.exclusion} />
                <Detail label="Important notes" value={quotation.important_notes} />
                <Detail label="Terms and conditions" value={quotation.terms_and_conditions} />
                <Detail label="Decline reason" value={quotation.rejected_reason} />
                <Detail label="Sent" value={formatDate(quotation.sent_at)} />
                <Detail label="Accepted" value={formatDate(quotation.accepted_at)} />
                <Detail label="Rejected" value={formatDate(quotation.rejected_at)} />
              </dl>
            </Section></div>}
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            <FileText size={30} className="mx-auto text-slate-400" />
            <p className="mt-3">Quotation details are unavailable.</p>
          </div>
        )}
      </div>
    </main>
  );
}
