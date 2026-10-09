import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useLayoutEffect } from "react";
import { TravelProvider } from "./contexts/TravelContext";
import Seo from "./components/Seo";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import HomePage from "./pages/HomePage";
import PackageDetailsPage from "./pages/PackageDetailsPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import CustomTourEnquiryPage from "./pages/CustomTourEnquiryPage";
import EnquiriesPage from "./pages/EnquiriesPage";
import EnquiryDetailsPage from "./pages/EnquiryDetailsPage";
import EnquiryQuotationsPage from "./pages/EnquiryQuotationsPage";
import TripsPage from "./pages/TripsPage";
import CustomerTripDetailsPage from "./pages/CustomerTripDetailsPage";
import DocumentsPage from "./pages/DocumentsPage";
import WishlistPage from "./pages/WishlistPage";
import ReferralsPage from "./pages/ReferralsPage";
import InvoicesPage from "./pages/InvoicesPage";
import WalletPage from "./pages/WalletPage";
import PointsPage from "./pages/PointsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ToursExplorePage from "./pages/ToursExplorePage";
import DestinationsPage from "./pages/DestinationsPage";
import DestinationDetailsPage from "./pages/DestinationDetailsPage";
import HotelDetailsPage from "./pages/HotelDetailsPage";
import InviteLandingPage from "./pages/InviteLandingPage";
import { captureReferralFromUrl } from "./api";
import useVisitorTracking from "./hooks/useVisitorTracking";
import PrivacyPolicyPage from "./pages/PrivacyPolicy";
import TermsOfServicePage from "./pages/TermsOfService";
import ContactUsPage from "./pages/ContactUsPage";

import { useTravel } from "./contexts/TravelContext";


function Layout({ children }) {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/invite";
  const hero = {
    "/wishlist": { image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=2000&q=90", eyebrow: "Saved for later", title: "Journeys Worth", accent: "Keeping.", alt: "Scenic travel destination" },
    "/referrals": { image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=2000&q=90", eyebrow: "Bring someone along", title: "Travel is Better", accent: "Together.", alt: "Friends travelling together" },
  }[location.pathname];
  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      {hero && (
        <section className="relative flex min-h-[260px] items-end overflow-hidden px-4 pb-10 pt-16 text-white sm:px-6 lg:px-12">
          <img className="absolute inset-0 h-full w-full object-cover" src={hero.image} alt={hero.alt} />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-dark via-navy/85 to-primary-900/60" />
          <div className="relative z-10 max-w-4xl animate-fade-up">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent-300">{hero.eyebrow}</p>
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl text-white">
              {hero.title} <span className="text-primary-300">{hero.accent}</span>
            </h1>
          </div>
        </section>
      )}
      <div className="flex-1">
        {children}
      </div>
      {!isAuthPage && <Footer />}
    </main>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function VisitorTracking() {
  const { user, authReady } = useTravel();
  useVisitorTracking({ customerId: user?.id || "", ready: authReady });
  return null;
}

function ReferralCapture() {
  const location = useLocation();
  useEffect(() => {
    // If not already on /invite page (which has its own dedicated rich landing UX)
    if (location.pathname !== "/invite") {
      const searchParams = new URLSearchParams(location.search);
      const encoded = searchParams.get("r") || searchParams.get("ref");
      if (encoded) {
        captureReferralFromUrl(encoded).finally(() => {
          searchParams.delete("r");
          searchParams.delete("ref");
          const remaining = searchParams.toString();
          window.history.replaceState({}, "", location.pathname + (remaining ? `?${remaining}` : "") + location.hash);
        });
      }
    }
  }, [location.search, location.pathname, location.hash]);
  return null;
}

function ProtectedRoute({ children }) {
  const { isMember, authReady } = useTravel();
  const location = useLocation();

  if (!authReady) {
    return (
      <>
        <Seo title="Account Portal | Gantabyaa" description="Member account area for Gantabyaa travellers." path={location.pathname} robots="noindex,nofollow" />
        <div className="grid min-h-[60vh] place-items-center bg-slate-50 text-slate-500">
          <p>Loading your profile…</p>
        </div>
      </>
    );
  }

  if (!isMember) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      <Seo title="Your Account | Gantabyaa" description="Manage your Gantabyaa bookings, documents, wishlist and enquiry history." path={location.pathname} robots="noindex,nofollow" />
      {children}
    </>
  );
}

function PublicOnlyRoute({ children }) {
  const { isMember, authReady } = useTravel();
  const location = useLocation();

  if (!authReady) {
    return (
      <>
        <Seo title="Member Access | Gantabyaa" description="Secure account access for Gantabyaa travellers." path={location.pathname} robots="noindex,nofollow" />
        <div className="grid min-h-[60vh] place-items-center bg-slate-50 text-slate-500">
          <p>Checking authorization…</p>
        </div>
      </>
    );
  }

  if (isMember) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <>
      <Seo title="Member Access | Gantabyaa" description="Secure account access for Gantabyaa travellers." path={location.pathname} robots="noindex,nofollow" />
      {children}
    </>
  );
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <VisitorTracking />
      <ReferralCapture />
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/tours" element={<Layout><ToursExplorePage /></Layout>} />
        <Route path="/destinations" element={<Layout><DestinationsPage /></Layout>} />
        <Route path="/destinations/:slug" element={<Layout><DestinationDetailsPage /></Layout>} />
        <Route path="/destinations/:slug/hotels/:hotelId" element={<Layout><HotelDetailsPage /></Layout>} />
        <Route path="/:id" element={<Layout><PackageDetailsPage /></Layout>} />
        <Route path="/custom-tour-enquiry" element={<Layout><CustomTourEnquiryPage /></Layout>} />
        <Route path="/contact" element={<Layout><ContactUsPage /></Layout>} />
        <Route path="/privacy-policy" element={<Layout><PrivacyPolicyPage /></Layout>} />
        <Route path="/terms-of-service" element={<Layout><TermsOfServicePage /></Layout>} />
        <Route path="/leaderboard" element={<Layout><LeaderboardPage /></Layout>} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/my-enquiries" element={<ProtectedRoute><Layout><EnquiriesPage /></Layout></ProtectedRoute>} />
        <Route path="/my-enquiries/:enquiryId/quotations" element={<ProtectedRoute><Layout><EnquiryQuotationsPage /></Layout></ProtectedRoute>} />
        <Route path="/my-enquiries/:enquiryId" element={<ProtectedRoute><Layout><EnquiryDetailsPage /></Layout></ProtectedRoute>} />
        <Route path="/my-trips" element={<ProtectedRoute><Layout><TripsPage /></Layout></ProtectedRoute>} />
        <Route path="/my-trips/:bookingId" element={<ProtectedRoute><Layout><CustomerTripDetailsPage /></Layout></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><Layout><DocumentsPage /></Layout></ProtectedRoute>} />
        <Route path="/bills-invoices" element={<ProtectedRoute><Layout><InvoicesPage /></Layout></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><Layout><WalletPage /></Layout></ProtectedRoute>} />
        <Route path="/points" element={<ProtectedRoute><Layout><PointsPage /></Layout></ProtectedRoute>} />
        <Route path="/wishlist" element={<ProtectedRoute><Layout><WishlistPage /></Layout></ProtectedRoute>} />
        <Route path="/referrals" element={<ProtectedRoute><Layout><ReferralsPage /></Layout></ProtectedRoute>} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Layout>
                <AuthPage />
              </Layout>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <Layout>
                <AuthPage />
              </Layout>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/invite"
          element={
            <Layout>
              <InviteLandingPage />
            </Layout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TravelProvider>
        <AppRoutes />
      </TravelProvider>
    </BrowserRouter>
  );
}
