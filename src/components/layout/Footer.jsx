import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";

const QUICK_LINKS = [
  { label: "Home", path: "/" },
  { label: "All Tours", path: "/tours" },
  { label: "Custom Tour", path: "/custom-tour-enquiry" },
  { label: "Contact Us", path: "/contact" },
  { label: "Privacy Policy", path: "/privacy-policy" },
  { label: "Terms of Service", path: "/terms-of-service" },
];

const TOUR_CATEGORIES = [
  { label: "Featured Tours", path: "/tours?is_featured=true" },
  { label: "Domestic Tours", path: "/tours?type=DOMESTIC" },
  { label: "International Tours", path: "/tours?type=INTERNATIONAL" },
  { label: "Special Offers", path: "/tours?badge=SPECIAL_OFFER" },
];

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <img src="/gantabyaa-transparent.png" alt="Gantabyaa" className="h-10 w-10 object-contain" />
              <div>
                <h3 className="text-base font-bold leading-none">Gantabyaa</h3>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-primary-300">Since 1994</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-white/70">
              Thoughtful journeys across India and beyond, crafted for the moments you'll remember forever.
              Trusted by 5,000+ travellers over three decades.
            </p>
            {/* Social Icons */}
            <div className="mt-5 flex items-center gap-3">
              <a href="https://www.facebook.com/profile.php?id=61594802771116" target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white/70 transition hover:bg-primary hover:text-white" aria-label="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://www.instagram.com/gantabyaa.travels" target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white/70 transition hover:bg-primary hover:text-white" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white/70 transition hover:bg-primary hover:text-white" aria-label="YouTube">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a
                href="https://wa.me/919932204885"
                target="_blank"
                rel="noopener noreferrer"
                className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white/70 transition hover:bg-[#25D366] hover:text-white"
                aria-label="WhatsApp"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Quick Links</h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map(({ label, path }) => (
                <li key={path}>
                  <Link to={path} className="text-sm text-white/65 transition hover:text-primary-300 hover:translate-x-1 inline-block">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Tour Categories */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Explore Tours</h4>
            <ul className="space-y-2.5">
              {TOUR_CATEGORIES.map(({ label, path }) => (
                <li key={path}>
                  <Link to={path} className="text-sm text-white/65 transition hover:text-primary-300 hover:translate-x-1 inline-block">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Get in Touch</h4>
            <ul className="space-y-3">
              <li>
                <a href="tel:+919932204885" className="flex items-start gap-2.5 text-sm text-white/65 transition hover:text-white">
                  <Phone size={15} className="mt-0.5 flex-shrink-0 text-primary-300" />
                  <span>+91 99322 04885</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@coochbehartravel.com" className="flex items-start gap-2.5 text-sm text-white/65 transition hover:text-white">
                  <Mail size={15} className="mt-0.5 flex-shrink-0 text-primary-300" />
                  <span>info@coochbehartravel.com</span>
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-white/65">
                <MapPin size={15} className="mt-0.5 flex-shrink-0 text-primary-300" />
                <span>Cooch Behar, West Bengal, India</span>
              </li>
            </ul>

            {/* App Download CTA */}
            <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="mb-2 text-xs font-semibold text-white/90">Download Our App</p>
              <p className="mb-3 text-[11px] text-white/50">Plan trips on the go, get exclusive offers</p>
              <div className="flex gap-2">
                <a href="#" className="flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[10px] font-semibold text-white transition hover:bg-white/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302L16.698 14.112l-2.302-2.302 3.302-2.302zM5.864 2.658L16.8 8.991l-2.302 2.302-8.634-8.635z"/></svg>
                  Google Play
                </a>
                <a href="#" className="flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[10px] font-semibold text-white transition hover:bg-white/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  App Store
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-navy-dark">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-white/50 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Gantabyaa · All rights reserved</span>
          <span>Powered by Coochbehar travels</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="transition hover:text-white">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms-of-service" className="transition hover:text-white">Terms of Service</Link>
            <span>·</span>
            <span>Explore · Identify · Reinvent</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
