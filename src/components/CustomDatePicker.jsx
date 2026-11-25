import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays } from "lucide-react";
import CustomSelect from "./CustomSelect";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, month) => ({
  label: new Date(2024, month, 1).toLocaleDateString("en-IN", { month: "long" }),
  value: month,
}));

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = parseDate(value);
  return date
    ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CustomDatePicker({
  id,
  value = "",
  onChange,
  placeholder = "Select a date",
  className = "",
  triggerClassName = "",
  ariaLabel = "Choose date",
  minDate = "",
  maxDate = "",
}) {
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const selectedDate = parseDate(value);
  const [visibleMonth, setVisibleMonth] = useState(
    () => selectedDate || new Date()
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const currentYear = new Date().getFullYear();
  const firstYear = Math.min(minDate ? parseDate(minDate)?.getFullYear() ?? currentYear - 10 : currentYear - 10, year);
  const lastYear = Math.max(maxDate ? parseDate(maxDate)?.getFullYear() ?? currentYear + 10 : currentYear + 10, year);
  const yearOptions = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => {
    const optionYear = firstYear + index;
    return { label: String(optionYear), value: optionYear };
  });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const popoverWidth = 288;
      const popoverHeight = 340;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - popoverWidth - 12));
      const top = rect.bottom + popoverHeight + 12 <= window.innerHeight
        ? rect.bottom + 8
        : Math.max(12, rect.top - popoverHeight - 8);
      setPosition({ top, left });
    };

    const handlePointerDown = (event) => {
      if (
        !triggerRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    updatePosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const calendar = open && position && createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={ariaLabel}
      className="fixed z-[10020] w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
      style={position}
    >
      <div className="mb-2 grid grid-cols-[1fr_5.5rem] gap-2">
        <CustomSelect
          value={month}
          options={MONTH_OPTIONS}
          onChange={(nextMonth) => setVisibleMonth(new Date(year, Number(nextMonth), 1))}
          ariaLabel="Select month"
          placeholder="Month"
          triggerClassName="h-8 px-2 text-xs"
        />
        <CustomSelect
          value={year}
          options={yearOptions}
          onChange={(nextYear) => setVisibleMonth(new Date(Number(nextYear), month, 1))}
          ariaLabel="Select year"
          placeholder="Year"
          triggerClassName="h-8 px-2 text-xs"
        />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="py-1 text-[10px] font-bold uppercase text-slate-400">
            {weekday}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, index) => (
          <span key={`empty-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const date = new Date(year, month, day);
          const dateValue = toDateValue(date);
          const isSelected = dateValue === value;
          const isToday = dateValue === toDateValue(new Date());
          const isDisabled = (minDate && dateValue < minDate) || (maxDate && dateValue > maxDate);
          return (
            <button
              key={day}
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-label={date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              onClick={() => {
                onChange?.(dateValue);
                setOpen(false);
              }}
              className={`grid h-8 w-8 place-items-center justify-self-center rounded-lg text-xs font-medium transition ${
                isDisabled
                  ? "cursor-not-allowed text-slate-300"
                  : isSelected
                  ? "bg-primary text-white"
                  : isToday
                    ? "border border-primary text-primary hover:bg-primary-50"
                    : "text-slate-700 hover:bg-primary-50 hover:text-primary"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open && selectedDate) setVisibleMonth(selectedDate);
          setOpen((current) => !current);
        }}
        className={`flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-xs font-medium text-slate-800 transition hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${triggerClassName}`}
      >
        <span className={value ? "" : "text-slate-400"}>{formatDate(value) || placeholder}</span>
        <CalendarDays size={16} className="shrink-0 text-slate-400" />
      </button>
      {calendar}
    </div>
  );
}
