import React from "react";
import { Calendar, Users, ArrowRight, X } from "lucide-react";

export default function DepartureDateModal({
  open,
  onClose,
  dateInfo,
  onBookOrEnquire,
  tourTitle = "Tour Package",
}) {
  if (!open || !dateInfo) return null;

  const totalSeats = dateInfo.total_seats != null ? Number(dateInfo.total_seats) : null;
  const availableSeats = dateInfo.available_seats != null ? Number(dateInfo.available_seats) : null;
  const bookedSeats = totalSeats !== null && availableSeats !== null ? Math.max(0, totalSeats - availableSeats) : null;
  const occupancyPercent =
    totalSeats && totalSeats > 0 && availableSeats !== null
      ? Math.min(100, Math.round(((totalSeats - availableSeats) / totalSeats) * 100))
      : null;

  const isSoldOut = availableSeats !== null && availableSeats <= 0;
  const isFewSeats = availableSeats !== null && availableSeats > 0 && availableSeats <= 5;

  const formatDate = (val) => {
    if (!val) return "N/A";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return val;
    }
  };

  return (
    <div
      className="modal-viewport fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-navy/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      style={{ touchAction: "none", overscrollBehavior: "contain" }}
    >
      <div
        className="modal-panel relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-scale-up sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
              <Calendar size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Departure Information</p>
              <h3 className="max-w-[260px] truncate font-display text-lg font-bold text-navy">
                {tourTitle}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {/* Date Schedule Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Departure Date</span>
            <p className="mt-1 text-sm font-bold text-navy">
              {formatDate(dateInfo.departure_date || dateInfo.date)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Return Date</span>
            <p className="mt-1 text-sm font-bold text-navy">
              {formatDate(dateInfo.return_date)}
            </p>
          </div>
        </div>

        {/* Seat Availability Card */}
        <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wide text-navy">Seat Availability</span>
            </div>
            {isSoldOut ? (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-extrabold text-rose-600">
                Sold Out
              </span>
            ) : isFewSeats ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-700 animate-pulse">
                Few Seats Left
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">
                Available
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-white p-3 shadow-sm border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Available Seats</span>
              <p className={`mt-1 text-2xl font-black ${isSoldOut ? "text-rose-500" : isFewSeats ? "text-amber-600" : "text-emerald-600"}`}>
                {availableSeats !== null ? availableSeats : "Open"}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 shadow-sm border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Total Seats</span>
              <p className="mt-1 text-2xl font-black text-navy">
                {totalSeats !== null ? totalSeats : "20+"}
              </p>
            </div>
          </div>

          {occupancyPercent !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-slate-500 font-medium mb-1">
                <span>{bookedSeats} booked</span>
                <span>{occupancyPercent}% filled</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    occupancyPercent >= 90 ? "bg-rose-500" : occupancyPercent >= 60 ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onBookOrEnquire) onBookOrEnquire(dateInfo);
            }}
            className="flex-[1.5] flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary-dark transition"
          >
            <span>Book / Enquire Date</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
