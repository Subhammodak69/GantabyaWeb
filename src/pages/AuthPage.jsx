import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowRight, Gift, CheckCircle2 } from "lucide-react";
import Seo from "../components/Seo";
import { captureReferralFromUrl, getStoredReferralCode, loginGoogle, requestOtp, verifyOtp } from "../api";
import { useTravel } from "../contexts/TravelContext";

const AUTH_BG = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2000&q=90";

export default function AuthPage() {
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasReferral, setHasReferral] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = location.pathname === "/signup";
  const { loginSuccess } = useTravel();
  const searchParams = new URLSearchParams(location.search);
  const referralToken = searchParams.get("r") || searchParams.get("ref");
  const googleButtonRef = useRef(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState("");

  const captureReferral = useCallback(async () => {
    if (referralToken) {
      const res = await captureReferralFromUrl(referralToken);
      if (res) setHasReferral(true);
    } else {
      setHasReferral(Boolean(getStoredReferralCode()));
    }
  }, [referralToken]);

  const loginSuccessRef = useRef(loginSuccess);
  const captureReferralRef = useRef(captureReferral);
  loginSuccessRef.current = loginSuccess;
  captureReferralRef.current = captureReferral;

  useEffect(() => {
    captureReferral();
  }, [captureReferral]);

  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID_WEB;
    if (!clientId) {
      setGoogleError("Google sign-in is not configured.");
      return undefined;
    }
    let initialized = false;
    let renderedWidth = 0;
    let didRender = false;
    let retry;
    let timeout;

    const renderGoogleButton = () => {
      const button = googleButtonRef.current;
      const identity = window.google?.accounts?.id;
      if (!button || !identity) return false;

      const buttonWidth = Math.floor(button.getBoundingClientRect().width);
      if (!buttonWidth) return false;

      if (!initialized) {
        identity.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            if (!credential) return setError("Google sign-in did not return a credential.");
            setGoogleBusy(true);
            setError("");
            try {
              await captureReferralRef.current();
              const response = await loginGoogle(credential);
              await loginSuccessRef.current(response);
              navigate(location.state?.from?.pathname || "/profile", { replace: true });
            } catch (e) {
              setError(e.message || "Google sign-in failed. Please try again.");
            } finally {
              setGoogleBusy(false);
            }
          },
        });
        initialized = true;
      }

      if (buttonWidth !== renderedWidth) {
        button.replaceChildren();
        identity.renderButton(button, {
          theme: "outline",
          size: "large",
          shape: "pill",
          logo_alignment: "left",
          width: buttonWidth,
          text: "continue_with",
        });
        renderedWidth = buttonWidth;
      }

      didRender = true;
      setGoogleReady(true);
      window.clearInterval(retry);
      window.clearTimeout(timeout);
      return true;
    };

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(renderGoogleButton)
      : null;
    if (googleButtonRef.current) resizeObserver?.observe(googleButtonRef.current);

    if (renderGoogleButton()) {
      return () => resizeObserver?.disconnect();
    }

    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    retry = window.setInterval(() => {
      renderGoogleButton();
    }, 100);
    timeout = window.setTimeout(() => {
      if (!didRender) setGoogleError("Google sign-in could not load.");
      window.clearInterval(retry);
    }, 5000);
    if (script) script.addEventListener("load", renderGoogleButton, { once: true });
    const onScriptError = () => {
      setGoogleError("Google sign-in could not load.");
      window.clearInterval(retry);
    };
    script?.addEventListener("error", onScriptError, { once: true });
    return () => {
      resizeObserver?.disconnect();
      window.clearInterval(retry);
      window.clearTimeout(timeout);
      script?.removeEventListener("load", renderGoogleButton);
      script?.removeEventListener("error", onScriptError);
    };
  }, [isSignup, location.state, navigate]);

  const send = async (event) => {
    event.preventDefault();
    const email = identifier.trim();
    if (!email) return setError("Enter your email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (isSignup && !name.trim()) return setError("Enter your full name.");
    setBusy(true);
    setError("");
    try {
      await captureReferral();
      await requestOtp(email, isSignup ? "SIGNUP" : "LOGIN");
      setSent(true);
    } catch (e) {
      setError(e.message || "Failed to send OTP. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError("");
    try {
      await captureReferral();
      await requestOtp(identifier.trim(), isSignup ? "SIGNUP" : "LOGIN");
      setOtp("");
    } catch (e) {
      setError(e.message || "Failed to resend OTP. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    if (!otp.trim()) return setError("Enter the OTP sent to you.");
    setBusy(true);
    setError("");
    try {
      await captureReferral();
      const r = await verifyOtp(identifier.trim(), otp.trim(), isSignup ? name.trim() : "", isSignup ? "SIGNUP" : "LOGIN");
      await loginSuccess(r);
      const returnTo = location.state?.from?.pathname || "/profile";
      navigate(returnTo, { replace: true });
    } catch (e) {
      setError(e.message || "Invalid OTP. Please check and try again.");
    } finally {
      setBusy(false);
    }
  };

  const submit = sent ? verify : send;

  return (
    <main className="relative grid min-h-screen min-w-0 max-w-full overflow-x-hidden overflow-y-auto bg-navy px-4 py-12 text-white sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:items-center lg:gap-16 lg:px-20 lg:py-20">
      <Seo
        title={isSignup ? "Create Account | Gantabyaa" : "Member Login | Gantabyaa"}
        description={isSignup ? "Create a Gantabyaa account to save tours, manage enquiries and access your booking dashboard." : "Sign in to your Gantabyaa account to manage trips, documents and travel plans."}
        path={isSignup ? "/signup" : "/login"}
        robots="noindex,nofollow"
      />
      <img className="absolute inset-0 h-full w-full object-cover opacity-25" src={AUTH_BG} alt="Mountain landscape" />
      <div className="absolute inset-0 bg-gradient-to-br from-navy-dark via-navy/90 to-primary-950/80" />

      {/* Left Brand Content */}
      <section className="relative z-10 hidden min-w-0 max-w-xl animate-fade-up lg:block">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-8">
          <img src="/gantabyaa-transparent.png" alt="Gantabyaa" className="h-10 w-10 object-contain" />
          <span className="text-base font-bold text-white">Gantabyaa</span>
        </Link>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-accent-300">Member Portal</p>
        <h1 className="font-display text-5xl font-extrabold leading-tight tracking-tight text-white">
          {isSignup ? "Begin Your" : "Welcome Back,"}<br />
          <span className="text-primary-300">{isSignup ? "Dream Journey." : "Traveller."}</span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
          Access your saved tours, manage bookings, view travel documents, and unlock member-only holiday discounts.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-xs text-white/85">
            <CheckCircle2 size={16} className="text-primary-300" />
            <span>Instant booking & customized itineraries</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-white/85">
            <CheckCircle2 size={16} className="text-primary-300" />
            <span>Secure OTP-based login without remembering passwords</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-white/85">
            <CheckCircle2 size={16} className="text-primary-300" />
            <span>24/7 dedicated support for all your trips</span>
          </div>
        </div>
      </section>

      {/* Right Auth Card */}
      <section className="relative z-10 min-w-0 w-full max-w-[480px] justify-self-center animate-fade-up rounded-2xl border border-white/20 bg-white p-5 text-slate-900 shadow-2xl sm:p-8">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">
            {isSignup ? "New Account" : "Sign In"}
          </p>
          <h2 className="font-display text-2xl font-bold text-navy">
            {sent ? "Check Your Messages" : isSignup ? "Create Your Account" : "Access Your Account"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {sent ? `We sent a 6-digit OTP code to ${identifier}.` : "Enter your email address to continue."}
          </p>

          {hasReferral && isSignup && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent border border-accent/20">
              <Gift size={14} />
              <span>Special referral invitation applied!</span>
            </div>
          )}
        </div>

        <form className="mt-6 flex flex-col gap-3.5" onSubmit={submit}>
          {!sent && isSignup && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1" htmlFor="auth-name">
                Full Name
              </label>
              <input
                className="h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-medium outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={busy}
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1" htmlFor="auth-identifier">
              Email Address
            </label>
            <input
              type="email"
              inputMode="email"
              required
              className="h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-medium outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              id="auth-identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              disabled={sent || busy}
            />
          </div>

          {sent && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1" htmlFor="auth-otp">
                Enter 6-Digit OTP
              </label>
              <input
                className="h-11 min-w-0 w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-center text-base font-bold tracking-widest outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                id="auth-otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                disabled={busy}
              />
            </div>
          )}

          <button
            className="btn-primary mt-2 h-11 w-full justify-center rounded-xl text-xs font-bold shadow-md disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={busy}
          >
            {busy ? "Please wait…" : sent ? (isSignup ? "Verify & Register" : "Verify & Sign In") : "Get OTP Code"}
            {!busy && <ArrowRight size={15} />}
          </button>

          {sent && (
            <div className="flex flex-col items-center gap-2">
              <button
                className="text-xs font-semibold text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
                type="button"
                onClick={() => {
                  setSent(false);
                  setOtp("");
                  setError("");
                }}
                disabled={busy}
              >
                ← Change Mobile / Email
              </button>
              <p className="text-xs text-slate-500">
                Didn&apos;t receive the code?{" "}
                <button
                  className="font-semibold text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
                  type="button"
                  onClick={resend}
                  disabled={busy}
                >
                  {busy ? "Sending..." : "Resend OTP"}
                </button>
              </p>
            </div>
          )}

          {error && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-600 font-medium" role="alert">{error}</p>}
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>or sign in with</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {googleBusy ? (
          <div className="flex h-11 items-center justify-center text-xs text-slate-500 font-medium">
            Signing in with Google...
          </div>
        ) : (
          <div className="google-auth-shell relative mx-auto flex min-h-[54px] w-full max-w-[280px] items-center justify-center overflow-hidden p-1">
            <div ref={googleButtonRef} className="flex min-h-10 w-full min-w-0 justify-center" />
            {!googleReady && (
              <span className={`absolute flex h-10 items-center justify-center text-center text-xs ${googleError ? "text-rose-500" : "text-slate-400"}`}>
                {googleError || "Loading Google sign-in..."}
              </span>
            )}
          </div>
        )}

        <p className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <button
            className="font-bold text-primary hover:underline"
            type="button"
            onClick={() => navigate(isSignup ? "/login" : "/signup")}
          >
            {isSignup ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </section>
    </main>
  );
}
