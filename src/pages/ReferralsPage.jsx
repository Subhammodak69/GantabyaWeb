import { useEffect, useState } from "react";
import { Check, ChevronRight, Copy, Folder, Gift, LoaderCircle, X } from "lucide-react";
import { fetchPublicReferralConfig, fetchReferralCode, fetchReferrals, getReferralLink } from "../api";

const formatDate = (value) => {
  const parsed = new Date(value);
  return value && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Not available";
};

const formatReward = (amount, currency = "INR") => {
  const value = Number(amount);
  return Number.isFinite(value)
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value)
    : "Not available";
};

function ReferralField({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-xs font-medium text-slate-700">{value || "Not available"}</dd>
    </div>
  );
}

const getReferralStatusClass = (status) => {
  if (["REWARD_APPROVED", "REWARD_CREDITED", "COMPLETED", "SIGNED_UP", "CONVERTED"].includes(status)) {
    return "bg-green-100 text-success";
  }
  if (["PENDING", "REGISTERED", "BOOKING_COMPLETED", "REWARD_ELIGIBLE"].includes(status)) {
    return "bg-amber-100 text-amber-800";
  }
  if (["EXPIRED", "CANCELLED", "BLOCKED"].includes(status)) {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-slate-100 text-slate-600";
};

const formatStatus = (status) => (status || "PENDING")
  .toLowerCase()
  .replace(/(^|_)([a-z])/g, (_, separator, letter) => `${separator ? " " : ""}${letter.toUpperCase()}`);

export default function ReferralsPage() {
  const [link, setLink] = useState("");
  const [referrals, setReferrals] = useState([]);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [offerConfig, setOfferConfig] = useState(null);
  const [offerLoading, setOfferLoading] = useState(true);
  const [offerError, setOfferError] = useState("");

  useEffect(() => {
    Promise.all([fetchReferralCode(), fetchReferrals()])
      .then(([codeResponse, referralResponse]) => {
        const code = codeResponse?.data?.referral_code;
        if (code) setLink(getReferralLink(code));
        const data = referralResponse?.data;
        setReferrals(Array.isArray(data) ? data : data?.items || data?.results || []);
      })
      .catch((err) => setError(err.message || "Could not load referrals."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let isActive = true;
    fetchPublicReferralConfig()
      .then((response) => {
        const config = response?.data;
        if (config?.default_reward_amount == null || config?.booking_window_days == null) {
          throw new Error("Referral reward details are unavailable.");
        }
        if (isActive) setOfferConfig(config);
      })
      .catch((err) => {
        if (isActive) setOfferError(err.message || "Could not load current referral reward details.");
      })
      .finally(() => {
        if (isActive) setOfferLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedReferral) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedReferral(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedReferral]);

  const copyLink = async () => {
    if (!link) return;
    const message = `Join me on Gantabyaa and plan your next journey: ${link}`;
    try {
      if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
        await navigator.share({
          title: "Join Gantabyaa",
          text: message,
          url: link,
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the referral link.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-36">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
          <div>
            <p className="eyebrow">Refer & Earn</p>
            <h1 className="section-title text-2xl sm:text-3xl">
              Invite <span className="text-primary">Friends</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1">
              Share your invite link and earn a referral reward when a new customer signs up and completes an eligible booking.
            </p>
          </div>
          <span className="text-xs font-bold text-navy bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
            {referrals.length} referral{referrals.length === 1 ? "" : "s"}
          </span>
        </div>

        <section className="card mb-6 p-4 sm:p-5" aria-labelledby="referral-criteria-title">
          <h2 id="referral-criteria-title" className="font-display text-base font-bold text-navy">
            Your referral reward
          </h2>
          {offerLoading ? (
            <p className="mt-3 text-xs text-slate-500">Loading the current referral offer...</p>
          ) : offerError ? (
            <p className="mt-3 text-xs font-medium text-rose-600" role="alert">{offerError}</p>
          ) : offerConfig ? (
            <>
              <div className="mt-3 grid gap-3 rounded-xl bg-primary/5 p-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Reward per eligible referral</p>
                  <p className="mt-1 text-xl font-bold text-primary">{formatReward(offerConfig.default_reward_amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Booking window</p>
                  <p className="mt-1 text-xl font-bold text-navy">{offerConfig.booking_window_days} days</p>
                </div>
              </div>
              <ol className="mt-3 grid gap-3 text-xs leading-relaxed text-slate-600 sm:grid-cols-3">
                <li><span className="font-bold text-navy">1. Invite someone new.</span> Share your referral link with someone who does not already have a Gantabyaa account.</li>
                <li><span className="font-bold text-navy">2. They sign up through your link.</span> The referral must be connected when they create their account; existing accounts cannot be added later.</li>
                <li><span className="font-bold text-navy">3. They complete an eligible booking.</span> Their booking must be created within {offerConfig.booking_window_days} days after the referral is registered. Once the booking is completed, the reward shown above is credited to your wallet.</li>
              </ol>
            </>
          ) : null}
        </section>

        {/* ERROR */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-600">✕</button>
          </div>
        )}

        {/* INVITE HISTORY */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-navy">Referral Activity</h2>
            <span className="text-xs text-slate-400 font-semibold">
              {referrals.length} total
            </span>
          </div>

          {loading ? (
            <div className="card flex items-center justify-center p-12 text-slate-400">
              <LoaderCircle className="animate-spin text-primary" size={26} />
            </div>
          ) : referrals.length ? (
            <div className="card divide-y divide-slate-100">
              {referrals.map((referral) => {
                const customer = referral.referred_customer || {};
                const status = referral.status || "PENDING";
                return (
                  <button
                    key={referral.id}
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`View referral details for ${customer.name || "Invited Traveller"}`}
                    onClick={() => setSelectedReferral(referral)}
                    className="group flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary sm:px-4"
                  >
                    <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Folder size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold text-navy">{customer.name || "Invited Traveller"}</span>
                        <span className={`w-fit rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${getReferralStatusClass(status)}`}>
                          {formatStatus(status)}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-slate-400">
                        Referred {formatDate(referral.created_at)}
                      </span>
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-2 text-right">
                      <span className="text-xs font-bold text-navy">{formatReward(referral.reward_amount, referral.currency)}</span>
                      <ChevronRight className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary" size={17} />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Gift className="mx-auto text-primary-300" size={36} />
              <h3 className="mt-3 font-display text-base font-bold text-navy">No Referrals Yet</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                Copy your unique invite link below and share it on WhatsApp or social media to get started.
              </p>
            </div>
          )}
        </section>
      </div>

      {selectedReferral && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => event.target === event.currentTarget && setSelectedReferral(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="referral-detail-title"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 bg-navy px-5 py-4 text-white sm:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Referral details</p>
                <h2 id="referral-detail-title" className="mt-1 truncate font-display text-lg font-bold">
                  {selectedReferral.referred_customer?.name || "Invited Traveller"}
                </h2>
                <p className="mt-1 text-xs text-white/65">Referred {formatDate(selectedReferral.created_at)}</p>
              </div>
              <button
                type="button"
                aria-label="Close referral details"
                onClick={() => setSelectedReferral(null)}
                className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </header>
            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Referral status</span>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getReferralStatusClass(selectedReferral.status || "PENDING")}`}>
                  {formatStatus(selectedReferral.status)}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <ReferralField label="Referral code" value={selectedReferral.referral_code} />
                <ReferralField label="Customer code" value={selectedReferral.referred_customer?.customer_code} />
                <ReferralField label="Email" value={selectedReferral.referred_customer?.email} />
                <ReferralField label="Mobile" value={selectedReferral.referred_customer?.mobile} />
                <ReferralField label="Reward" value={formatReward(selectedReferral.reward_amount, selectedReferral.currency)} />
                <ReferralField label="Payment method" value={selectedReferral.payment_method} />
                <ReferralField label="Booking" value={selectedReferral.referred_customer?.booking_code || selectedReferral.referred_customer?.booking_id} />
                <ReferralField label="Booking date" value={formatDate(selectedReferral.referred_customer?.booking_date)} />
                <ReferralField label="Transaction date" value={formatDate(selectedReferral.transaction_date)} />
                <ReferralField label="Converted at" value={formatDate(selectedReferral.converted_at)} />
              </dl>
            </div>
          </section>
        </div>
      )}

      {/* FLOATING INVITE CTA BAR */}
      <section className="fixed bottom-4 left-4 right-4 z-40 max-w-3xl mx-auto rounded-2xl bg-navy p-4 text-white shadow-elevated sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white flex-shrink-0">
            <Gift size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">Invite a Fellow Traveller</h2>
            <p className="text-[11px] text-white/60 truncate">Your referral code is encoded securely in the invite link.</p>
          </div>
        </div>

        <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-xs text-white/80 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success flex-shrink-0"></span>
            <span className="truncate">{link ? link : "Generating your invite link..."}</span>
          </div>
          <button
            onClick={copyLink}
            disabled={!link || loading}
            className="btn-accent rounded-xl text-xs font-bold px-4 py-2.5 flex-shrink-0 disabled:opacity-50"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Copied Link!" : "Share Invite"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
