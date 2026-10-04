import { useTravel } from "../../contexts/TravelContext";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  UserRound, ChevronDown, User, Award, MessageSquareText, MapPinned, Files, ReceiptText,
  Heart, Gift, LoaderCircle, Phone, Headphones, Menu, X,
  Search, Globe, LogOut, WalletCards
} from "lucide-react";

function ProfileAvatar({ src }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (!src || imageFailed) {
    return <UserRound size={18} strokeWidth={1.8} aria-hidden="true" />;
  }
  return <img src={src} alt="Profile" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />;
}

const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "All Tours", path: "/tours" },
  { label: "Destinations", path: "/destinations" },
  { label: "Leaderboard", path: "/leaderboard" },
  { label: "Custom Tour", path: "/custom-tour-enquiry" },
  { label: "Contact Us", path: "/contact" },
];

const PROFILE_MENU = [
  { label: "Profile", path: "/profile", Icon: User },
  { label: "Wishlist", path: "/wishlist", Icon: Heart },
  { label: "Enquiries", path: "/my-enquiries", Icon: MessageSquareText },
  { label: "Trips", path: "/my-trips", Icon: MapPinned },
  { label: "Wallet & transactions", path: "/wallet", Icon: WalletCards },
  { label: "Travel points", path: "/points", Icon: Award },
];

export default function Header() {
  const { goHome, isMember, authReady, user, handleLogout } = useTravel();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileImage = user?.profile_image || user?.profile_picture || user?.profileImage || user?.profile_pic || user?.avatar || user?.photoURL || user?.picture || user?.image || user?.image_url;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname, location.search]);

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/" && !location.search;
    }
    const [targetPath, targetQuery] = path.split("?");
    if (location.pathname !== targetPath) {
      return false;
    }
    if (targetQuery) {
      const targetParams = new URLSearchParams(targetQuery);
      const currentParams = new URLSearchParams(location.search);
      for (const [key, val] of targetParams.entries()) {
        if (currentParams.get(key) !== val) return false;
      }
      return true;
    }
    const currentParams = new URLSearchParams(location.search);
    return !currentParams.get("type");
  };

  return (
    <>
      {/* Top Utility Strip */}
      <div className="bg-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs sm:px-6">
          <div className="flex items-center gap-4">
            <a href="tel:+919932204885" className="flex items-center gap-1.5 transition hover:text-primary-200">
              <Phone size={12} />
              <span className="hidden sm:inline">+91 99322 04885</span>
            </a>
            <a
              href="https://wa.me/919932204885?text=Hello%20Gantabya%2C%20I%20need%20help%20planning%20a%20trip!"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#25D366] transition hover:text-[#1EBE5A]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/contact" className="flex items-center gap-1.5 transition hover:text-primary-200">
              <Headphones size={12} />
              <span className="hidden sm:inline">Contact Us</span>
            </Link>
            <span className="hidden text-white/30 sm:inline">|</span>
            <span className="hidden items-center gap-1 text-white/70 sm:flex">
              <Globe size={11} />
              <span>EN</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className={`sticky top-0 z-50 border-b bg-white transition-shadow duration-300 ${scrolled ? "shadow-header" : ""}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <button
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button className="group flex items-center gap-2.5 text-left" onClick={goHome} id="nav-brand">
              <img src="/gantabyaa-transparent.png" alt="Gantabyaa" className="h-9 w-9 object-contain transition group-hover:scale-105" />
              <span className="hidden text-sm font-bold leading-none tracking-tight text-navy sm:inline">
                Gantabyaa<br />
                <b className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">Travel</b>
              </span>
            </button>
          </div>

          {/* Center: Nav Links (Desktop) */}
          <nav className="hidden items-center gap-1 lg:flex" role="navigation">
            {NAV_LINKS.map(({ label, path }) => (
              <Link
                key={path}
                to={path}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive(path)
                    ? "bg-primary-50 text-primary font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right: Auth/Profile */}
          <div className="flex items-center gap-2">
            <Link
              to="/tours"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-primary lg:hidden"
              aria-label="Search tours"
            >
              <Search size={18} />
            </Link>

            {!authReady ? (
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-400" aria-label="Loading account" role="status">
                <LoaderCircle size={16} className="animate-spin" />
              </span>
            ) : isMember ? (
              <div className="relative">
                <button
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-slate-700 shadow-sm transition hover:border-primary-300 hover:shadow-md"
                  onClick={() => setProfileOpen((value) => !value)}
                  id="nav-profile-btn"
                  aria-label="Open profile menu"
                  aria-expanded={profileOpen}
                >
                  <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-md bg-primary-50 text-primary">
                    <ProfileAvatar src={profileImage} />
                  </span>
                  <ChevronDown size={13} className={`text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-12 w-48 animate-slide-down overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-elevated" role="menu">
                    {user?.name && (
                      <div className="mb-1.5 border-b border-slate-100 px-3 pb-2 pt-1">
                        <p className="truncate text-sm font-semibold text-navy">{user.name}</p>
                        <p className="truncate text-[11px] text-slate-400">{user.email || user.mobile}</p>
                      </div>
                    )}
                    {PROFILE_MENU.map(({ label, path, Icon }) => (
                      <button
                        key={path}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-primary-50 hover:text-primary"
                        onClick={() => { setProfileOpen(false); navigate(path); }}
                        role="menuitem"
                      >
                        <Icon size={15} className="text-primary" />
                        {label}
                      </button>
                    ))}
                    <div className="my-1 border-t border-slate-100 pt-1">
                      <button
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                        onClick={() => { setProfileOpen(false); handleLogout(false); }}
                        role="menuitem"
                      >
                        <LogOut size={15} />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn-primary rounded-lg px-4 py-2 text-xs"
                onClick={() => navigate("/login")}
                id="nav-login-btn"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-72 animate-slide-in-left overflow-y-auto bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <img src="/gantabyaa-transparent.png" alt="Gantabyaa" className="h-8 w-8 object-contain" />
                  <span className="text-sm font-bold text-navy">Gantabyaa</span>
                </div>
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="p-3">
                {NAV_LINKS.map(({ label, path }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive(path)
                        ? "bg-primary-50 text-primary font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
                <hr className="my-3 border-slate-100" />
                {isMember && (
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    onClick={() => { setMobileMenuOpen(false); handleLogout(false); }}
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                )}
                <a
                  href="https://wa.me/919932204885?text=Hello%20Gantabya%2C%20I%20need%20help%20planning%20a%20trip!"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[#25D366] transition hover:bg-green-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Chat on WhatsApp
                </a>
                <a
                  href="tel:+919932204885"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Phone size={16} className="text-primary" />
                  +91 99322 04885
                </a>
              </nav>
            </div>
          </>
        )}
      </header>

      {/* Click-away for profile menu */}
      {profileOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
      )}
    </>
  );
}
