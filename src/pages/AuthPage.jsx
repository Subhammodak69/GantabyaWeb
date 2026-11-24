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
    const rootOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = rootOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

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
    <main className="auth-page relative grid min-h-0 min-w-0 max-w-full place-items-center overflow-hidden bg-navy px-3 py-3 text-white sm:px-6 sm:py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:gap-16 lg:px-20 lg:py-6">
      <Seo
        title={isSignup ? "Create Account | Gantabyaa" : "Member Login | Gantabyaa"}
        description={isSignup ? "Create a Gantabyaa account to save tours, manage enquiries and access your booking dashboard." : "Sign in to your Gantabyaa account to manage trips, documents and travel plans."}
        path={isSignup ? "/signup" : "/login"}
        robots="noindex,nofollow"
      />
      <img className="absolute inset-0 h-full w-full object-cover opacity-40" src={AUTH_BG} alt="Mountain landscape" />
      <div className="absolute inset-0 bg-gradient-to-br from-navy-dark/90 via-navy/75 to-primary-950/70" />

      {/* Left Brand Content */}
      <section className="relative z-10 hidden min-w-0 max-w-xl pl-8 justify-self-start animate-fade-up lg:block">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-8">
          <img src="/gantabyaa-transparent.png" alt="Gantabyaa" className="h-10 w-10 object-contain" />
          <span className="text-base font-bold text-white">Gantabyaa</span>
        </Link>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-accent-300">Member Portal</p>
        <h1 className="font-display text-5xl font-extrabold leading-tight tracking-tight text-white">
          {isSignup ? "Begin Your" : "Welcome Back,"}<br />
          <span className="text-primary-300">{isSignup ? "Dream Journey." : "Traveller."}</span>
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-white/75">
          Access your saved tours, manage bookings, view travel documents, and unlock member-only holiday discounts.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-sm text-white/85">
            <CheckCircle2 size={16} className="text-primary-300" />
            <span>Instant booking & customized itineraries</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-white/85">
            <CheckCircle2 size={16} className="text-primary-300" />
            <span>Secure OTP-based login without remembering passwords</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-white/85">
            <CheckCircle2 size={16} className="text-primary-300" />
            <span>24/7 dedicated support for all your trips</span>
          </div>
        </div>
      </section>

      {/* Right Auth Card */}
      <section className="auth-card relative z-10 min-w-0 max-h-full w-full max-w-[420px] justify-self-center animate-fade-up p-3 text-white sm:p-4">
        <div className="auth-card-header">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">
            {isSignup ? "New Account" : "Sign In"}
          </p>
          <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
            {sent ? "Check Your Messages" : isSignup ? "Create Your Account" : "Access Your Account"}
          </h2>
          <p className="mt-1 text-xs text-white/75">
            {sent ? `We sent a 6-digit OTP code to ${identifier}.` : "Enter your email address to continue."}
          </p>

          {hasReferral && isSignup && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent border border-accent/20">
              <Gift size={14} />
              <span>Special referral invitation applied!</span>
            </div>
          )}
        </div>

        <form className="auth-form mt-5 flex flex-col gap-2.5" onSubmit={submit}>
          {!sent && isSignup && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/90" htmlFor="auth-name">
                Full name
              </label>
              <input
                className="h-10 min-w-0 w-full max-w-full rounded-lg border border-white/70 bg-white/95 px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20 disabled:opacity-60"
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
            <label className="mb-1 block text-xs font-semibold text-white/90" htmlFor="auth-identifier">
              Email address
            </label>
            <input
              type="email"
              inputMode="email"
              required
              className="h-10 min-w-0 w-full max-w-full rounded-lg border border-white/70 bg-white/95 px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20 disabled:opacity-60"
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
              <label className="mb-1 block text-xs font-semibold text-white/90" htmlFor="auth-otp">
                Verification code
              </label>
              <input
                className="h-10 min-w-0 w-full max-w-full rounded-lg border border-white/70 bg-white/95 px-4 text-center text-base font-bold tracking-[0.3em] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20 disabled:opacity-60"
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
            className="btn-primary h-10 w-full justify-center rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={busy}
          >
            {busy ? "Please wait…" : sent ? (isSignup ? "Verify & create account" : "Verify & sign in") : "Send verification code"}
            {!busy && <ArrowRight size={15} />}
          </button>

          {sent && (
            <div className="flex flex-col items-center gap-2">
              <button
                className="text-xs font-semibold text-primary-300 hover:underline disabled:cursor-wait disabled:opacity-60"
                type="button"
                onClick={() => {
                  setSent(false);
                  setOtp("");
                  setError("");
                }}
                disabled={busy}
              >
                Use a different email address
              </button>
              <p className="text-xs text-white/75">
                Didn&apos;t receive the code?{" "}
                <button
                  className="font-semibold text-primary-300 hover:underline disabled:cursor-wait disabled:opacity-60"
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

        <div className="auth-google-divider my-5 flex items-center gap-3 text-xs text-white/65">
          <span className="h-px flex-1 bg-white/25" />
          <span>or sign in with</span>
          <span className="h-px flex-1 bg-white/25" />
        </div>

        {googleBusy ? (
          <div className="flex h-10 items-center justify-center text-xs text-white/75 font-medium">
            Signing in with Google...
          </div>
        ) : (
          <div className="google-auth-shell relative mx-auto flex min-h-[48px] w-full max-w-[280px] items-center justify-center overflow-hidden p-1">
            <div ref={googleButtonRef} className="flex min-h-10 w-full min-w-0 justify-center" />
            {!googleReady && (
              <span className={`absolute flex h-10 items-center justify-center text-center text-xs ${googleError ? "text-rose-300" : "text-white/75"}`}>
                {googleError || "Loading Google sign-in..."}
              </span>
            )}
          </div>
        )}

        <p className="auth-footer mt-4 border-t border-white/20 pt-4 text-center text-sm text-white/75">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <button
            className="font-bold text-primary-300 hover:underline"
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
