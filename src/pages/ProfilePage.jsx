import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTravel } from "../contexts/TravelContext";
import { deleteAccount, deleteSession, fetchPackages, fetchSessions, requestOtp, updateMe, uploadFile } from "../api";
import useScrollReveal from "../hooks/useScrollReveal";
import ImageCropModal from "../components/ImageCropModal";
import {
  Edit3, Camera, LogOut, Heart, Files, MessageSquareText, MapPinned,
  X, ChevronRight, Laptop, Smartphone, Eye, Award, Calendar, Gift, ReceiptText, WalletCards
} from "lucide-react";

let profilePackagesPromise;

function loadProfilePackagesOnce() {
  if (!profilePackagesPromise) profilePackagesPromise = fetchPackages();
  return profilePackagesPromise;
}

const STATS = [
  { label: "Journeys Explored", value: "3", icon: MapPinned },
  { label: "Verified Member", value: "Since 2022", icon: Award },
  { label: "Travel Days", value: "42 Days", icon: Calendar },
];

const SETTINGS = [
  { id: "notif", label: "Push Notifications", desc: "Trip reminders, departure alerts & updates" },
  { id: "newsletter", label: "Travel Newsletter", desc: "Curated holiday deals, seasonal packages & stories" },
  { id: "sms", label: "SMS / WhatsApp Alerts", desc: "Instant booking confirmations and concierge messages" },
];

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProfilePage() {
  const { isMember, toggleMember, handleLogout, user, setUser, selectPackage } = useTravel();
  const [packages, setPackages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionActionId, setSessionActionId] = useState("");
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_mobile: "",
    profile_pic: "",
  });

  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [editError, setEditError] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePreview, setProfilePreview] = useState("");
  const [toggles, setToggles] = useState({ notif: true, newsletter: true, sms: true });

  const [rawImageForCrop, setRawImageForCrop] = useState("");
  const [cropModalOpen, setCropModalOpen] = useState(false);

  const revealRef = useScrollReveal();
  const pastTrips = packages.slice(0, 3);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    loadProfilePackagesOnce()
      .then((result) => setPackages(result.items))
      .catch(() => setPackages([]));
  }, []);

  const loadSessions = useCallback(async () => {
    if (!isMember) return;
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const response = await fetchSessions();
      setSessions(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      setSessionsError(error.message || "Could not load active sessions.");
    } finally {
      setSessionsLoading(false);
    }
  }, [isMember]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const toggleSessionExpanded = (id) => {
    setExpandedSessions((current) => ({ ...current, [id]: !current[id] }));
  };

  const revokeSession = async (session) => {
    if (!session?.id || sessionActionId) return;
    const message = session.is_current ? "This will sign you out on this device. Continue?" : "Revoke this active session?";
    if (!window.confirm(message)) return;
    setSessionActionId(session.id);
    setSessionsError("");
    try {
      await deleteSession(session.id);
      if (session.is_current) {
        await handleLogout(false);
        return;
      }
      setSessions((current) => current.filter((item) => item.id !== session.id));
    } catch (error) {
      setSessionsError(error.message || "Could not revoke this session.");
    } finally {
      setSessionActionId("");
    }
  };

  const logoutEverywhere = async () => {
    if (loggingOutAll) return;
    if (!window.confirm("Log out from all active sessions across all devices?")) return;
    setLoggingOutAll(true);
    setSessionsError("");
    try {
      await handleLogout(true);
    } catch (error) {
      setSessionsError(error.message || "Could not log out all sessions.");
      setLoggingOutAll(false);
    }
  };

  const openEditor = () => {
    setProfileForm({
      name: user?.name || "",
      mobile: user?.mobile || "",
      email: user?.email || "",
      address: user?.address || "",
      emergency_contact_name: user?.emergency_contact_name || "",
      emergency_contact_mobile: user?.emergency_contact_mobile || "",
      profile_pic: user?.profile_pic || user?.profile_image || "",
    });
    setProfileFile(null);
    setProfilePreview(user?.profile_pic || user?.profile_image || "");
    setEditError("");
    setEditing(true);
  };

  useEffect(() => {
    if (!editing && !detailsOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [editing, detailsOpen]);

  const chooseProfilePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageForCrop(reader.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleCroppedPhoto = async (croppedFile, previewDataUrl) => {
    setCropModalOpen(false);
    setProfileFile(croppedFile);
    setProfilePreview(previewDataUrl);
    setUploadingPhoto(true);
    setEditError("");
    try {
      const uploadResponse = await uploadFile(croppedFile);
      const profilePic = uploadResponse?.data?.url || uploadResponse?.url || "";
      if (!profilePic) throw new Error("The uploaded image URL was not returned.");
      setProfileForm((current) => ({ ...current, profile_pic: profilePic }));
      setProfilePreview(profilePic);
    } catch (error) {
      setProfileFile(null);
      setEditError(error.message || "Could not upload your profile picture.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeProfilePhoto = () => {
    setProfileFile(null);
    setProfilePreview("");
    setProfileForm((current) => ({ ...current, profile_pic: "" }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!profileForm.name.trim()) return setEditError("Please enter your name.");
    setSaving(true);
    setEditError("");
    try {
      const response = await updateMe({ ...profileForm, name: profileForm.name.trim(), source: "WEBSITE", is_active: true });
      const updatedUser = response?.data?.user || response?.data || response?.user;
      setUser({
        ...user,
        ...(updatedUser || {}),
        profile_pic: profileForm.profile_pic,
        profile_image: profileForm.profile_pic,
        profile_picture: profileForm.profile_pic,
      });
      setEditing(false);
    } catch (error) {
      setEditError(error.message || "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const removeAccount = async () => {
    if (deletingAccount) return;
    const identifier = user?.mobile || user?.email || "";
    if (!identifier) return setEditError("No mobile number or email is available for account verification.");
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) return;
    setDeletingAccount(true);
    setEditError("");
    try {
      await requestOtp(identifier, "DELETE_ACCOUNT");
      const otp = window.prompt(`Enter the OTP sent to ${identifier}.`);
      if (!otp?.trim()) return;
      await deleteAccount({ identifier, otp: otp.trim(), purpose: "LOGIN" });
      await handleLogout(true);
    } catch (error) {
      setEditError(error.message || "Could not delete your account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  const avatarLetter = (user?.name || user?.email || "M")[0]?.toUpperCase() || "M";
  const profileImage = user?.profile_image || user?.profile_picture || user?.profileImage || user?.profile_pic || user?.avatar || user?.photoURL || user?.picture || user?.image || user?.image_url;
  
  const profileDetails = [
    ["Customer Code", user?.customer_code || "COB-VIP"],
    ["Full Name", user?.name],
    ["Mobile Number", user?.mobile || user?.phone],
    ["Email Address", user?.email],
    ["Residential Address", user?.address],
    ["Emergency Contact Name", user?.emergency_contact_name],
    ["Emergency Contact Phone", user?.emergency_contact_mobile],
    ["Member Since", formatDate(user?.created_at) || "2024"],
    ["Account Status", "Active & Verified"],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

  return (
    <div ref={revealRef} className="min-h-screen bg-slate-50 pb-20">
      {/* Top Banner with Thomas Cook Navy Aesthetic */}
      <section className="relative overflow-hidden bg-navy px-4 pb-12 pt-10 text-white sm:px-6 lg:px-12">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            {/* Left: Avatar & Info */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white/30 bg-primary font-display text-3xl font-bold text-white shadow-xl sm:h-24 sm:w-24 sm:text-4xl">
                  {profileImage ? (
                    <img className="h-full w-full object-cover" src={profileImage} alt={user?.name || "Profile"} />
                  ) : (
                    <span>{avatarLetter}</span>
                  )}
                </div>
                <button
                  onClick={openEditor}
                  className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-accent text-white shadow-md transition hover:bg-accent-600"
                  title="Change avatar"
                >
                  <Camera size={14} />
                </button>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
                    {user?.name || "Member Traveller"}
                  </h1>
                  <span className="rounded-md bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Verified Member
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/80">
                  {user?.email || user?.mobile || "Authenticated Account"}
                  {user?.customer_code && <span className="ml-2 font-mono text-primary-200 font-semibold">· {user.customer_code}</span>}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={openEditor}
                id="profile-edit-btn"
                className="btn-accent rounded-xl text-xs font-bold px-4 py-2.5 shadow-md"
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => setDetailsOpen(true)}
                id="profile-view-details-btn"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/25"
              >
                <Eye size={14} />
                <span>View Details</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Pill Strip */}
          <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
            {STATS.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur px-3.5 py-1.5 text-xs text-white/90">
                <Icon size={14} className="text-primary-300" />
                <span className="font-bold">{value}</span>
                <span className="text-white/60 text-[11px]">({label})</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Dashboard */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Quick Nav Cards Strip */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Link
            to="/my-trips"
            className="card p-4 hover:border-primary-300 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition">
                <MapPinned size={20} />
              </span>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4">
              <h3 className="font-display text-sm font-bold text-navy">My Trips</h3>
              <p className="text-[11px] text-slate-400">View upcoming bookings</p>
            </div>
          </Link>

          <Link
            to="/my-enquiries"
            className="card p-4 hover:border-primary-300 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-50 text-accent group-hover:bg-accent group-hover:text-white transition">
                <MessageSquareText size={20} />
              </span>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4">
              <h3 className="font-display text-sm font-bold text-navy">My Enquiries</h3>
              <p className="text-[11px] text-slate-400">Custom tour proposals</p>
            </div>
          </Link>

          <Link
            to="/wishlist"
            className="card p-4 hover:border-primary-300 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition">
                <Heart size={20} />
              </span>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-rose-500 transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4">
              <h3 className="font-display text-sm font-bold text-navy">Saved Wishlist</h3>
              <p className="text-[11px] text-slate-400">Tours saved for later</p>
            </div>
          </Link>

          <Link
            to="/documents"
            className="card p-4 hover:border-primary-300 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
                <Files size={20} />
              </span>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4">
              <h3 className="font-display text-sm font-bold text-navy">Documents</h3>
              <p className="text-[11px] text-slate-400">Passports & tickets vault</p>
            </div>
          </Link>

          <Link
            to="/bills-invoices"
            className="card p-4 hover:border-primary-300 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white transition">
                <ReceiptText size={20} />
              </span>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-green-600 transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4">
              <h3 className="font-display text-sm font-bold text-navy">Bills & invoices</h3>
              <p className="text-[11px] text-slate-400">Payments and receipts</p>
            </div>
          </Link>

          <Link
            to="/wallet"
            className="card p-4 hover:border-primary-300 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary group-hover:bg-primary group-hover:text-white transition">
                <WalletCards size={20} />
              </span>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4">
              <h3 className="font-display text-sm font-bold text-navy">Wallet &amp; transactions</h3>
              <p className="text-[11px] text-slate-400">Balance and payment history</p>
            </div>
          </Link>

          <Link
            to="/referrals"
            className="card p-4 hover:border-primary-300 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition">
                <Gift size={20} />
              </span>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4">
              <h3 className="font-display text-sm font-bold text-navy">Refer & Earn</h3>
              <p className="text-[11px] text-slate-400">Invite friends to travel</p>
            </div>
          </Link>
        </div>

        {/* 2-Column Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left 2 Columns: Personal Details & Past Trips */}
          <div className="space-y-6 lg:col-span-2">
            {/* Personal Details Card */}
            <div className="card p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <p className="eyebrow">Profile Information</p>
                  <h2 className="section-title text-lg sm:text-xl">Personal Details</h2>
                </div>
                <button
                  onClick={openEditor}
                  className="btn-outline rounded-xl text-xs font-bold px-3 py-1.5"
                >
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</span>
                  <p className="mt-0.5 text-xs font-bold text-navy">{user?.name || "Not provided"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile / WhatsApp</span>
                  <p className="mt-0.5 text-xs font-bold text-navy">{user?.mobile || user?.phone || "Not provided"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</span>
                  <p className="mt-0.5 text-xs font-bold text-navy truncate">{user?.email || "Not provided"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Emergency Contact</span>
                  <p className="mt-0.5 text-xs font-bold text-navy">
                    {user?.emergency_contact_name ? `${user.emergency_contact_name} (${user.emergency_contact_mobile || "No phone"})` : "Not provided"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 sm:col-span-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Residential Address</span>
                  <p className="mt-0.5 text-xs font-semibold text-slate-700">{user?.address || "No address on file"}</p>
                </div>
              </div>
            </div>

            {/* Past Journeys & History */}
            <div className="card p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <p className="eyebrow">Trip History</p>
                  <h2 className="section-title text-lg sm:text-xl">Featured Journeys</h2>
                </div>
                <Link to="/tours" className="text-xs font-bold text-primary hover:underline">
                  Browse All Packages →
                </Link>
              </div>

              {pastTrips.length > 0 ? (
                <div className="space-y-3">
                  {pastTrips.map((pack) => (
                    <article
                      key={pack.id}
                      className="group flex cursor-pointer items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 transition hover:border-primary-300 hover:shadow-sm"
                      onClick={() => selectPackage(pack.id)}
                    >
                      <img
                        className="h-16 w-20 shrink-0 rounded-lg object-cover"
                        src={pack.image}
                        alt={pack.title}
                      />
                      <div className="min-w-0 flex-1 px-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          {pack.code || "TOUR"} · {pack.duration}
                        </p>
                        <h3 className="truncate font-display text-xs font-bold text-navy group-hover:text-primary transition-colors">
                          {pack.title}
                        </h3>
                        <span className="block truncate text-[11px] text-slate-400">
                          {pack.destination || pack.route?.slice(0, 2).join(" → ")}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-lg bg-primary-50 p-2 text-primary group-hover:bg-primary group-hover:text-white transition">
                        <ChevronRight size={15} />
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs">No journeys found. Explore our handpicked holiday packages.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Security & Preferences */}
          <div className="space-y-6">
            {/* Preferences */}
            <div className="card p-6">
              <p className="eyebrow">Notifications</p>
              <h2 className="section-title text-base sm:text-lg mb-4">Preferences</h2>
              <div className="divide-y divide-slate-100">
                {SETTINGS.map(({ id, label, desc }) => (
                  <label key={id} className="flex cursor-pointer items-center justify-between gap-3 py-3" id={`pref-${id}`}>
                    <div>
                      <span className="block text-xs font-bold text-navy">{label}</span>
                      <small className="text-[10px] text-slate-400">{desc}</small>
                    </div>
                    <button
                      role="switch"
                      aria-checked={toggles[id]}
                      className={`relative h-5 w-10 shrink-0 rounded-full transition ${
                        toggles[id] ? "bg-primary" : "bg-slate-300"
                      }`}
                      onClick={() => setToggles((t) => ({ ...t, [id]: !t[id] }))}
                      type="button"
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                        toggles[id] ? "left-5" : "left-0.5"
                      }`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {/* Active Sessions Security Card */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="eyebrow">Security</p>
                  <h2 className="section-title text-base sm:text-lg">Active Sessions</h2>
                </div>
                <button
                  type="button"
                  className="text-xs font-bold text-primary hover:underline"
                  onClick={() => setSessionsExpanded((v) => !v)}
                >
                  {sessionsExpanded ? "Hide" : `Show (${sessions.length})`}
                </button>
              </div>

              {sessionsExpanded && (
                <div className="mt-3 space-y-2.5">
                  {sessionsError && (
                    <p className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-600">{sessionsError}</p>
                  )}
                  {sessions.map((session) => {
                    const isExpanded = Boolean(expandedSessions[session.id]);
                    return (
                      <article key={session.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {session.user_agent?.includes("Mobile") ? (
                                <Smartphone size={14} className="text-primary" />
                              ) : (
                                <Laptop size={14} className="text-primary" />
                              )}
                              <h3 className="text-xs font-bold text-navy truncate">
                                {session.actor_type || "Browser Session"}
                              </h3>
                              {session.is_current && (
                                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-success">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {session.user_agent || "Web Browser"}
                            </p>
                          </div>
                          <button
                            onClick={() => revokeSession(session)}
                            disabled={Boolean(sessionActionId) || loggingOutAll}
                            className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition"
                          >
                            {sessionActionId === session.id ? "Revoking…" : session.is_current ? "Sign Out" : "Revoke"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {sessions.length > 1 && (
                    <button
                      onClick={logoutEverywhere}
                      disabled={loggingOutAll}
                      className="w-full mt-2 rounded-xl border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition"
                    >
                      {loggingOutAll ? "Logging Out All…" : "Log Out All Devices"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Account Actions & Sign Out */}
            <div className="card p-6">
              <p className="eyebrow">Account Actions</p>
              <h2 className="section-title text-base sm:text-lg mb-3">Support & Settings</h2>
              <div className="divide-y divide-slate-100 text-xs">
                <Link to="/contact" className="flex items-center justify-between py-2.5 font-semibold text-slate-700 hover:text-primary">
                  <span>Contact Support & Concierge</span>
                  <ChevronRight size={14} className="text-slate-400" />
                </Link>
                <Link to="/privacy-policy" className="flex items-center justify-between py-2.5 font-semibold text-slate-700 hover:text-primary">
                  <span>Privacy Policy</span>
                  <ChevronRight size={14} className="text-slate-400" />
                </Link>
                <Link to="/terms-of-service" className="flex items-center justify-between py-2.5 font-semibold text-slate-700 hover:text-primary">
                  <span>Terms of Service</span>
                  <ChevronRight size={14} className="text-slate-400" />
                </Link>
                <button
                  id="profile-signout-btn"
                  onClick={toggleMember}
                  className="flex w-full items-center justify-between py-3 font-bold text-rose-600 hover:bg-rose-50/50 rounded-lg px-1 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </span>
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={removeAccount}
                  disabled={deletingAccount}
                  className="flex w-full items-center justify-between py-3 font-bold text-rose-600 hover:bg-rose-50/50 rounded-lg px-1 transition disabled:opacity-60"
                >
                  <span>{deletingAccount ? "Deleting Account…" : "Delete Account"}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {editing && (
        <div className="modal-viewport fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/75 p-4 backdrop-blur-sm animate-fade-in" onClick={() => !saving && setEditing(false)}>
          <section className="modal-panel relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-navy px-6 py-4 text-white flex items-center justify-between border-b border-navy-light">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent-300">Account Settings</p>
                <h2 className="text-base font-bold text-white">Edit Your Profile</h2>
              </div>
              <button
                className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"
                onClick={() => setEditing(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form */}
            <form id="profile-edit-form" className="flex-1 overflow-y-auto p-6 space-y-4" onSubmit={saveProfile}>
              {/* Avatar Selector */}
              <div className="flex flex-col items-center gap-2 pb-2">
                <div className="relative grid h-20 w-20 place-items-center rounded-full bg-primary font-display text-2xl font-bold text-white shadow-md">
                  {profilePreview ? (
                    <img className="h-full w-full rounded-full object-cover" src={profilePreview} alt="Profile preview" />
                  ) : (
                    <span>{(user?.name || "M")[0].toUpperCase()}</span>
                  )}
                  <label
                    htmlFor="profile-picture"
                    className="absolute -bottom-1 -right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-accent text-white shadow-md hover:bg-accent-600 transition"
                  >
                    <Camera size={13} />
                  </label>
                </div>
                {profilePreview && (
                   <button
                     type="button"
                     className="text-[11px] font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                     onClick={removeProfilePhoto}
                     disabled={saving || uploadingPhoto}
                   >
                     Remove profile picture
                   </button>
                )}
                <input className="hidden" id="profile-picture" type="file" accept="image/*" onChange={chooseProfilePhoto} disabled={saving || uploadingPhoto} />
                <span className="text-[11px] text-slate-500">
                  {uploadingPhoto ? "Uploading photo…" : "Tap camera icon to change profile photo"}
                </span>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="profile-name">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="profile-name"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="profile-mobile">
                    Mobile Number
                  </label>
                  <input
                    id="profile-mobile"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    value={profileForm.mobile}
                    onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="profile-email">
                    Email Address
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="profile-emergency-name">
                    Emergency Contact Name
                  </label>
                  <input
                    id="profile-emergency-name"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    value={profileForm.emergency_contact_name}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="profile-emergency-mobile">
                    Emergency Contact Phone
                  </label>
                  <input
                    id="profile-emergency-mobile"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                    value={profileForm.emergency_contact_mobile}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_mobile: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="profile-address">
                    Residential Address
                  </label>
                  <textarea
                    id="profile-address"
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 resize-none"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  />
                </div>
              </div>

              {editError && <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">{editError}</p>}
            </form>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                className="btn-ghost text-xs font-semibold"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="profile-edit-form"
                className="btn-primary rounded-xl text-xs font-bold px-5 py-2"
                disabled={saving || uploadingPhoto}
              >
                {saving ? "Saving Changes…" : "Save Profile →"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Image Crop Modal */}
      <ImageCropModal
        imageSrc={rawImageForCrop}
        open={cropModalOpen}
        onCrop={handleCroppedPhoto}
        onCancel={() => setCropModalOpen(false)}
      />

      {/* View Details Modal */}
      {detailsOpen && (
        <div className="modal-viewport fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/75 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setDetailsOpen(false)}>
          <section className="modal-panel relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-navy px-6 py-4 text-white flex items-center justify-between border-b border-navy-light">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent-300">Account Summary</p>
                <h2 className="text-base font-bold text-white">Full Profile Details</h2>
              </div>
              <button
                className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"
                onClick={() => setDetailsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {profileDetails.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">{label}</span>
                  <span className="font-bold text-navy text-right max-w-[280px] break-words">{String(value)}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                className="btn-ghost text-xs font-semibold"
                onClick={() => setDetailsOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-primary rounded-xl text-xs font-bold px-4 py-2"
                onClick={() => { setDetailsOpen(false); openEditor(); }}
              >
                Edit Profile
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
