import { useEffect, useState } from "react";
import { Check, Copy, Gift, LoaderCircle } from "lucide-react";
import { fetchReferralCode, fetchReferrals, getReferralLink } from "../api";

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

export default function ReferralsPage() {
  const [link, setLink] = useState("");
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

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
              Share a private invite link with friends and family to gift them discounts on their next journey.
            </p>
          </div>
          <span className="text-xs font-bold text-navy bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
            {referrals.length} referral{referrals.length === 1 ? "" : "s"}
          </span>
        </div>

        <section className="card mb-6 p-4 sm:p-5" aria-labelledby="referral-criteria-title">
          <h2 id="referral-criteria-title" className="font-display text-base font-bold text-navy">
            How to earn a referral reward
          </h2>
          <ol className="mt-3 grid gap-3 text-xs leading-relaxed text-slate-600 sm:grid-cols-3">
            <li><span className="font-bold text-navy">1. Invite someone new.</span> Share your referral link with a person who does not already have a Gantabyaa account.</li>
            <li><span className="font-bold text-navy">2. They sign up through your link.</span> The referral must be connected when they create their account; existing accounts cannot be added later.</li>
            <li><span className="font-bold text-navy">3. They complete a booking.</span> The referral is reviewed after booking completion. A reward is given only if it is approved; its amount and booking window follow the referral settings.</li>
          </ol>
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
                return (
                <article key={referral.id} className="p-4 transition hover:bg-slate-50 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-navy">{customer.name || "Invited Traveller"}</h3>
                      <p className="mt-1 text-[11px] text-slate-400">Referred {formatDate(referral.created_at)}</p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      referral.status === "COMPLETED" || referral.status === "SIGNED_UP" || referral.status === "CONVERTED"
                        ? "bg-green-100 text-success"
                        : referral.status === "PENDING" || referral.status === "REGISTERED"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {referral.status || "Pending"}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-slate-100 pt-3 sm:grid-cols-3 lg:grid-cols-4">
                    <ReferralField label="Referral code" value={referral.referral_code} />
                    <ReferralField label="Customer code" value={customer.customer_code} />
                    <ReferralField label="Email" value={customer.email} />
                    <ReferralField label="Mobile" value={customer.mobile} />
                    <ReferralField label="Reward" value={formatReward(referral.reward_amount, referral.currency)} />
                    <ReferralField label="Payment method" value={referral.payment_method} />
                    <ReferralField label="Booking" value={customer.booking_code || customer.booking_id} />
                    <ReferralField label="Booking date" value={formatDate(customer.booking_date)} />
                    <ReferralField label="Transaction date" value={formatDate(referral.transaction_date)} />
                    <ReferralField label="Converted at" value={formatDate(referral.converted_at)} />
                  </dl>
                </article>
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
