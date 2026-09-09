import { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
} from "lucide-react";
import { toMins, minsToTime, fmtTime, fmtDate, todayISO, addDays } from "../lib/time";
import { playTick } from "../lib/audio";

const START_MIN = 8 * 60;
const END_MIN = 18 * 60;
const TOTAL_MIN = END_MIN - START_MIN;

const TICKS = [
  { hour: 8, label: "8 AM" },
  { hour: 10, label: "10 AM" },
  { hour: 12, label: "12 PM" },
  { hour: 14, label: "2 PM" },
  { hour: 16, label: "4 PM" },
  { hour: 18, label: "6 PM" },
];

export default function TimeStrip({
  slots = [],
  date,
  onDateChange = null,
  selectedRange = null,
  onSelectSlot = null,
  onSelectGap = null,
  compact = false,
}) {
  const today = todayISO();
  const activeDate = date || today;
  const isToday = activeDate === today;

  const daySlots = useMemo(() => {
    return (slots || [])
      .filter((s) => s.slot_date === activeDate && s.status !== "cancelled")
      .sort((a, b) => toMins(a.start_time) - toMins(b.start_time));
  }, [slots, activeDate]);

  const { blocks, gaps, bookedMins } = useMemo(() => {
    let booked = 0;
    const computedBlocks = daySlots.map((s) => {
      const sMin = Math.max(START_MIN, toMins(s.start_time));
      const eMin = Math.min(END_MIN, toMins(s.end_time));
      const dur = Math.max(0, eMin - sMin);
      booked += dur;

      const leftPct = Math.max(0, ((sMin - START_MIN) / TOTAL_MIN) * 100);
      const widthPct = Math.max(3.5, (dur / TOTAL_MIN) * 100);

      return {
        ...s,
        durationMins: dur,
        leftPct,
        widthPct,
      };
    });

    const computedGaps = [];
    let cursor = START_MIN;

    for (const b of computedBlocks) {
      const bStart = toMins(b.start_time);
      const bEnd = toMins(b.end_time);

      if (bStart > cursor) {
        const gapDur = Math.min(bStart, END_MIN) - cursor;
        if (gapDur >= 15) {
          computedGaps.push({
            startMins: cursor,
            endMins: Math.min(bStart, END_MIN),
            leftPct: ((cursor - START_MIN) / TOTAL_MIN) * 100,
            widthPct: (gapDur / TOTAL_MIN) * 100,
            duration: gapDur,
          });
        }
      }
      cursor = Math.max(cursor, bEnd);
    }

    if (cursor < END_MIN) {
      const gapDur = END_MIN - cursor;
      if (gapDur >= 15) {
        computedGaps.push({
          startMins: cursor,
          endMins: END_MIN,
          leftPct: ((cursor - START_MIN) / TOTAL_MIN) * 100,
          widthPct: (gapDur / TOTAL_MIN) * 100,
          duration: gapDur,
        });
      }
    }

    return { blocks: computedBlocks, gaps: computedGaps, bookedMins: booked };
  }, [daySlots]);

  const selectedPct = useMemo(() => {
    if (!selectedRange?.startTime || !selectedRange?.endTime) return null;
    const sMin = toMins(selectedRange.startTime);
    const eMin = toMins(selectedRange.endTime);
    if (eMin <= sMin) return null;

    const left = Math.max(0, ((sMin - START_MIN) / TOTAL_MIN) * 100);
    const width = Math.min(100 - left, ((eMin - sMin) / TOTAL_MIN) * 100);

    return { left, width };
  }, [selectedRange]);

  const bookedHours = (bookedMins / 60).toFixed(1).replace(/\.0$/, "");
  const freeHours = Math.max(0, (TOTAL_MIN - bookedMins) / 60)
    .toFixed(1)
    .replace(/\.0$/, "");

  const stepDay = (delta) => {
    if (onDateChange) {
      playTick();
      onDateChange(addDays(activeDate, delta));
    }
  };

  return (
    <div className={`sb-track-card ${compact ? "compact" : ""}`}>
      {!compact && (
        <div className="sb-track-nav-bar">
          <div className="sb-track-nav-group">
            <button
              type="button"
              className="sb-track-step-btn"
              onClick={() => stepDay(-1)}
              title="Previous day"
              aria-label="Previous day"
            >
              <ChevronLeft size={16} strokeWidth={2.4} />
            </button>

            <div className="sb-track-date-display">
              <Calendar size={13} className="sb-track-cal-icon" />
              <span className="sb-track-date-text">{fmtDate(activeDate)}</span>
              {isToday && <span className="sb-today-tag">Today</span>}
            </div>

            <button
              type="button"
              className="sb-track-step-btn"
              onClick={() => stepDay(1)}
              title="Next day"
              aria-label="Next day"
            >
              <ChevronRight size={16} strokeWidth={2.4} />
            </button>

            {!isToday && onDateChange && (
              <button
                type="button"
                className="sb-textlink sb-track-today-link"
                onClick={() => {
                  playTick();
                  onDateChange(today);
                }}
              >
                Jump to Today
              </button>
            )}
          </div>

          <div className="sb-track-stats">
            <span className="sb-stat-chip booked">{bookedHours}h booked</span>
            <span className="sb-stat-chip free">{freeHours}h free</span>
          </div>
        </div>
      )}

      <div className="sb-track-frame">
        <div className="sb-track-grid-header">
          {TICKS.map((t) => {
            const leftPct = ((t.hour * 60 - START_MIN) / TOTAL_MIN) * 100;
            return (
              <div
                key={t.hour}
                className="sb-track-grid-col"
                style={{ left: `${leftPct}%` }}
              >
                <span className="sb-track-hour-label">{t.label}</span>
                <div className="sb-track-grid-line" />
              </div>
            );
          })}
        </div>

        <div className="sb-track-surface">
          {gaps.map((g, i) => {
            const durText =
              g.duration >= 60
                ? `${(g.duration / 60).toFixed(1).replace(/\.0$/, "")}h`
                : `${g.duration}m`;

            return (
              <button
                key={i}
                type="button"
                className="sb-track-gap-card"
                style={{
                  left: `${g.leftPct}%`,
                  width: `${g.widthPct}%`,
                }}
                title={`Open window: ${fmtTime(minsToTime(g.startMins))} - ${fmtTime(
                  minsToTime(g.endMins)
                )} · Click to schedule`}
                onClick={() => {
                  if (onSelectGap) {
                    playTick();
                    onSelectGap({
                      startTime: minsToTime(g.startMins),
                      endTime: minsToTime(Math.min(g.startMins + 60, g.endMins)),
                      date: activeDate,
                    });
                  }
                }}
              >
                <div className="sb-gap-content">
                  <Plus size={11} strokeWidth={2.6} className="sb-gap-plus" />
                  <span className="sb-gap-label">Available</span>
                  <span className="sb-gap-dur">({durText})</span>
                </div>
              </button>
            );
          })}

          {blocks.map((b) => {
            const isCompleted = b.status === "completed";
            return (
              <div
                key={b.id}
                className={`sb-track-event-card ${
                  isCompleted ? "completed" : "scheduled"
                }`}
                style={{
                  left: `${b.leftPct}%`,
                  width: `${b.widthPct}%`,
                }}
                onClick={() => {
                  if (onSelectSlot) {
                    playTick();
                    onSelectSlot(b);
                  }
                }}
                title={`${b.title} (${fmtTime(b.start_time)} – ${fmtTime(
                  b.end_time
                )}) · Click to edit`}
              >
                <div className="sb-event-stripe" />
                <div className="sb-event-body">
                  <div className="sb-event-title">{b.title}</div>
                  <div className="sb-event-time">
                    {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                  </div>
                </div>
              </div>
            );
          })}

          {selectedPct && (
            <div
              className="sb-track-selection-highlight"
              style={{
                left: `${selectedPct.left}%`,
                width: `${selectedPct.width}%`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
