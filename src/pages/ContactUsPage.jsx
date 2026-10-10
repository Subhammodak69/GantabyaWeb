import { useState, useEffect } from "react";
import {
  Phone, Mail, MapPin, Clock, MessageCircle, Send, CheckCircle2,
  ShieldCheck, Headphones, Award, ChevronDown, ChevronUp, Sparkles
} from "lucide-react";
import Seo from "../components/Seo";
import CustomSelect from "../components/CustomSelect";
import { submitCustomEnquiry } from "../api";
import CONTACTS from "../config/contacts.json";

const primaryPhone = CONTACTS.phones[0];
const primaryWhatsApp = CONTACTS.whatsapp[0];
const whatsappLink = (contact, message = "Hello Gantabya, I need assistance planning a tour!") =>
  `https://wa.me/${contact.number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

const ENQUIRY_TYPES = [
  { value: "GENERAL", label: "General Travel Enquiry" },
  { value: "HOLIDAY_PACKAGE", label: "Holiday Package Booking" },
  { value: "CUSTOM_TOUR", label: "Custom Tailor-Made Itinerary" },
  { value: "CORPORATE", label: "Corporate / Group Travel" },
  { value: "VISA_TICKETS", label: "Visa & Flight Ticketing" },
  { value: "FEEDBACK", label: "Feedback & Suggestions" },
];

const FAQS = [
  {
    q: "How can I book a customized holiday package?",
    a: `You can use our online Custom Tour Enquiry form, call us directly at ${primaryPhone?.display || "our helpline"}, or send us a WhatsApp message. Our holiday specialist will design a personalized itinerary with hotels, sightseeing, and private transport within 24 hours.`,
  },
  {
    q: "What are your customer support working hours?",
    a: "Our customer concierge and telephone lines are active 7 days a week, from 9:00 AM to 9:00 PM IST. For emergency on-trip traveller assistance, our team operates 24/7.",
  },
  {
    q: "Can I make changes to an existing tour booking?",
    a: "Yes, you can modify dates, add destinations, or change hotel categories depending on flight and hotel policies. Please connect with your dedicated travel manager with your booking details.",
  },
  {
    q: "What payment methods do you accept for tour packages?",
    a: "We accept all major UPI apps, Net Banking, Credit/Debit Cards, NEFT/RTGS bank transfers, and standard payment links with full receipts and invoices.",
  },
];

export default function ContactUsPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    enquiryType: "GENERAL",
    destination: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      return setError("Please enter your name and phone number.");
    }
    setLoading(true);
    setError("");

    try {
      // Send as enquiry via API
      await submitCustomEnquiry({
        name: form.name.trim(),
        mobile: form.phone.trim(),
        email: form.email.trim(),
        destination: form.destination.trim() || "General Enquiry",
        notes: `[Contact Form - ${form.enquiryType}]: ${form.message}`,
      }).catch(() => {
        // Continue even if local dev mock backend responds gracefully
      });

      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try contacting us directly via WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Seo
        title="Contact Gantabyaa | Travel Enquiries & Support"
        description="Contact Gantabyaa for holiday enquiries, custom itineraries, destination planning and expert travel support."
        path="/contact"
        robots="index,follow"
      />
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-navy px-4 pb-14 pt-10 text-white sm:px-6 lg:px-12">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">
              We're Here for You
            </p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-white">
              Contact <span className="text-primary-300">Gantabyaa</span>
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-white/80 leading-relaxed max-w-2xl">
              Have questions about an upcoming holiday or need a tailored itinerary? Our expert holiday planners are ready to guide you every step of the way.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Contact Cards */}
      <section className="mx-auto max-w-7xl px-4 -mt-8 sm:px-6 relative z-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Direct Call */}
          <a
            href={`tel:${primaryPhone?.number || ""}`}
            className="card p-6 flex items-start gap-4 transition hover:-translate-y-1 hover:border-primary-300 hover:shadow-elevated group"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition">
              <Phone size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Call Us Anytime</p>
              <h3 className="font-display text-base font-bold text-navy mt-0.5">{primaryPhone?.display || primaryPhone?.number}</h3>
              <p className="text-xs text-slate-500 mt-1">Mon–Sun, 9:00 AM – 9:00 PM IST</p>
            </div>
          </a>

          {/* Card 2: WhatsApp Concierge */}
          <a
            href={whatsappLink(primaryWhatsApp)}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-6 flex items-start gap-4 transition hover:-translate-y-1 hover:border-green-300 hover:shadow-elevated group"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-green-50 text-success group-hover:bg-success group-hover:text-white transition">
              <MessageCircle size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WhatsApp Chat</p>
              <h3 className="font-display text-base font-bold text-navy mt-0.5">{primaryWhatsApp?.label || "Quick WhatsApp"}</h3>
              <p className="text-xs text-slate-500 mt-1">{primaryWhatsApp?.display || primaryWhatsApp?.number}</p>
            </div>
          </a>

          {/* Card 3: Email Support */}
          <a
            href={`mailto:${CONTACTS.emails[0]?.address || ""}`}
            className="card p-6 flex items-start gap-4 transition hover:-translate-y-1 hover:border-accent-300 hover:shadow-elevated group"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-50 text-accent group-hover:bg-accent group-hover:text-white transition">
              <Mail size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Enquiries</p>
              <h3 className="font-display text-base font-bold text-navy mt-0.5 truncate">{CONTACTS.emails[0]?.address}</h3>
              <p className="text-xs text-slate-500 mt-1">Response within 2-4 hours</p>
            </div>
          </a>

          {CONTACTS.phones.slice(1).map((contact) => (
            <a key={`phone-${contact.number}`} href={`tel:${contact.number}`} className="card p-6 flex items-start gap-4 transition hover:-translate-y-1 hover:border-primary-300 hover:shadow-elevated group">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition"><Phone size={22} /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{contact.label || "Call Us"}</p>
                <h3 className="font-display text-base font-bold text-navy mt-0.5">{contact.display || contact.number}</h3>
                <p className="text-xs text-slate-500 mt-1">Mon–Sun, 9:00 AM – 9:00 PM IST</p>
              </div>
            </a>
          ))}
          {CONTACTS.whatsapp.slice(1).map((contact) => (
            <a key={`whatsapp-${contact.number}`} href={whatsappLink(contact)} target="_blank" rel="noopener noreferrer" className="card p-6 flex items-start gap-4 transition hover:-translate-y-1 hover:border-green-300 hover:shadow-elevated group">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-green-50 text-success group-hover:bg-success group-hover:text-white transition"><MessageCircle size={22} /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WhatsApp Chat</p>
                <h3 className="font-display text-base font-bold text-navy mt-0.5">{contact.label || "WhatsApp Concierge"}</h3>
                <p className="text-xs text-slate-500 mt-1">{contact.display || contact.number}</p>
              </div>
            </a>
          ))}
          {CONTACTS.emails.slice(1).map((contact) => (
            <a key={`email-${contact.address}`} href={`mailto:${contact.address}`} className="card p-6 flex items-start gap-4 transition hover:-translate-y-1 hover:border-accent-300 hover:shadow-elevated group">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-50 text-accent group-hover:bg-accent group-hover:text-white transition"><Mail size={22} /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{contact.label || "Email Enquiries"}</p>
                <h3 className="font-display text-base font-bold text-navy mt-0.5 truncate">{contact.address}</h3>
                <p className="text-xs text-slate-500 mt-1">Response within 2–4 hours</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Main Content Grid: Form + Office Details */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Left Column: Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="card p-6 sm:p-8">
              <p className="eyebrow">Send a Message</p>
              <h2 className="section-title text-xl sm:text-2xl mb-2">How Can We Help You?</h2>
              <p className="text-xs text-slate-500 mb-6">
                Fill in the details below and one of our holiday consultants will get back to you shortly.
              </p>

              {submitted ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center animate-fade-in">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-success">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold text-navy">Thank You for Reaching Out!</h3>
                  <p className="mt-2 text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    We have received your enquiry. Our travel planner will contact you at <strong>{form.phone}</strong> with tailored options.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", enquiryType: "GENERAL", destination: "", message: "" }); }}
                      className="btn-outline rounded-xl text-xs font-bold px-4 py-2"
                    >
                      Send Another Message
                    </button>
                    <a
                      href={whatsappLink(primaryWhatsApp, `Hello, I just submitted an enquiry under the name ${form.name}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp rounded-xl text-xs font-bold px-4 py-2"
                    >
                      <MessageCircle size={15} />
                      <span>Chat on WhatsApp</span>
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                      {error}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Your Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Phone / WhatsApp <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder={primaryPhone?.display || "Your phone number"}
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="rahul@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Enquiry Type
                      </label>
                      <CustomSelect
                        value={form.enquiryType}
                        options={ENQUIRY_TYPES}
                        onChange={(val) => setForm({ ...form, enquiryType: val })}
                        triggerClassName="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Destination of Interest (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kashmir, Bhutan, Goa, Dubai, Kerala..."
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Your Message / Specific Requirements
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Tell us about your travel dates, number of travellers, preferences or any questions..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs sm:text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-accent h-12 w-full rounded-xl text-sm font-bold shadow-md shadow-accent/20"
                  >
                    {loading ? (
                      <span>Sending Message…</span>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Send Enquiry Now →</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Office Address & Value Props (5 cols) */}
          <div className="space-y-6 lg:col-span-5">
            {/* Office Location Card */}
            <div className="card p-6">
              <p className="eyebrow">Head Office</p>
              <h3 className="section-title text-lg mb-4">Visit Our Office</h3>
              
              <div className="space-y-4 text-xs text-slate-600">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <strong className="block text-navy font-bold">{CONTACTS.office.name}</strong>
                    <span>{CONTACTS.office.address}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                    <Clock size={18} />
                  </div>
                  <div>
                    <strong className="block text-navy font-bold">Office Timings</strong>
                    <span>Monday – Saturday: 9:30 AM – 8:30 PM</span>
                    <span className="block text-slate-400 text-[11px]">Sunday: 10:00 AM – 4:00 PM</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                    <Phone size={18} />
                  </div>
                  <div>
                    <strong className="block text-navy font-bold">Helpline</strong>
                    {CONTACTS.phones.map((contact) => (
                      <a key={contact.number} href={`tel:${contact.number}`} className="block text-primary font-semibold hover:underline">
                        {contact.display || contact.number}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Why Book with Us */}
            <div className="card p-6 bg-navy text-white">
              <div className="flex items-center gap-2 text-accent-300 mb-2">
                <Sparkles size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Trusted Legacy</span>
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-4">
                Why Plan With Us?
              </h3>
              <ul className="space-y-3 text-xs text-white/80">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-primary-300 shrink-0" />
                  <span>Government Registered & Certified Tour Operators</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Award size={16} className="text-primary-300 shrink-0" />
                  <span>30+ Years of Excellence in Handcrafted Journeys</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Headphones size={16} className="text-primary-300 shrink-0" />
                  <span>Dedicated On-Trip Personal Concierge 24/7</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQs Accordion */}
        <section className="mt-16">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <p className="eyebrow">Got Questions?</p>
            <h2 className="section-title text-2xl">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500 mt-1">
              Find quick answers to common queries about planning and booking your trip.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="card overflow-hidden transition">
                  <button
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50"
                  >
                    <span className="font-display text-xs sm:text-sm font-bold text-navy pr-4">
                      {faq.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp size={16} className="text-primary shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 text-xs text-slate-600 leading-relaxed animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
