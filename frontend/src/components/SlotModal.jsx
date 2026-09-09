import { useState, useRef, useEffect, useMemo } from "react";
import { X, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { todayISO, toMins, slotsOverlap, fmtTime, findAvailableSlot } from "../lib/time";
import { playTick, playSuccess } from "../lib/audio";
import TimeStrip from "./TimeStrip";

const BLANK_FORM = {
  title: "",
  description: "",
  slot_date: todayISO(),
  start_time: "",
  end_time: "",
};

export default function SlotModal({
  editingSlot,
  initialTimes = null,
  allSlots = [],
  onSave,
  onClose,
}) {
  const isEdit = editingSlot !== null;

  const [form, setForm] = useState(() => {
    if (isEdit) {
      return {
        title: editingSlot.title,
        description: editingSlot.description || "",
        slot_date: editingSlot.slot_date,
        start_time: editingSlot.start_time,
        end_time: editingSlot.end_time,
      };
    }
    return {
      ...BLANK_FORM,
      slot_date: initialTimes?.date || todayISO(),
      start_time: initialTimes?.startTime || "",
      end_time: initialTimes?.endTime || "",
    };
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const sheetRef = useRef(null);
  const titleInput = useRef(null);

  useEffect(() => {
    if (titleInput.current) titleInput.current.focus();
  }, []);

  useGSAP(
    () => {
      if (!sheetRef.current) return;
      gsap.from(sheetRef.current, {
        scale: 0.94,
        y: 12,
        opacity: 0,
        duration: 0.32,
        ease: "power3.out",
      });
    },
    { scope: sheetRef }
  );

  function patch(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setServerError("");
  }

  const conflictSlot = useMemo(() => {
    if (!form.slot_date || !form.start_time || !form.end_time) return null;
    if (toMins(form.end_time) <= toMins(form.start_time)) return null;

    const daySlots = (allSlots || []).filter(
      (s) =>
        s.slot_date === form.slot_date &&
        s.id !== editingSlot?.id &&
        s.status !== "cancelled"
    );

    return (
      daySlots.find((s) =>
        slotsOverlap(form.start_time, form.end_time, s.start_time, s.end_time)
      ) || null
    );
  }, [form.slot_date, form.start_time, form.end_time, allSlots, editingSlot]);

  const suggestedSlot = useMemo(() => {
    if (!conflictSlot) return null;
    const duration = Math.max(
      15,
      toMins(form.end_time) - toMins(form.start_time)
    );
    const daySlots = (allSlots || []).filter(
      (s) =>
        s.slot_date === form.slot_date &&
        s.id !== editingSlot?.id &&
        s.status !== "cancelled"
    );
    return findAvailableSlot(daySlots, duration, 8, 18, editingSlot?.id);
  }, [conflictSlot, form.slot_date, form.start_time, form.end_time, allSlots, editingSlot]);

  function validate() {
    const errs = {};

    if (!form.title.trim()) {
      errs.title = "Add a title for this appointment.";
    }
    if (!form.slot_date) {
      errs.date = "Choose a date.";
    }
    if (!form.start_time || !form.end_time) {
      errs.time = "Choose a start and end time.";
    } else if (toMins(form.end_time) <= toMins(form.start_time)) {
      errs.time = "End time must be after the start time.";
    }

    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (conflictSlot) {
      setServerError(
        `This time overlaps with "${conflictSlot.title}". Please adjust the time or apply the suggested slot.`
      );
      return;
    }

    setSaving(true);
    try {
      await onSave(form, isEdit ? editingSlot.id : null);
      playSuccess();
      onClose();
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="sb-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sb-modal" role="dialog" aria-modal="true" ref={sheetRef}>
        <div className="sb-modal-head">
          <h2 className="sb-modal-title">
            {isEdit ? "Edit appointment" : "Add appointment"}
          </h2>
          <button className="sb-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {serverError && <div className="sb-form-banner">{serverError}</div>}

          <div className={`sb-field ${errors.title ? "has-error" : ""}`}>
            <label htmlFor="sb-title">Title</label>
            <input
              id="sb-title"
              type="text"
              ref={titleInput}
              value={form.title}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="e.g. Zepto Machine Coding Round or Hackathon Sync"
            />
            {errors.title && <div className="sb-error-text">{errors.title}</div>}
          </div>

          <div className="sb-field">
            <label htmlFor="sb-desc">Description</label>
            <textarea
              id="sb-desc"
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              placeholder="e.g. Google Meet link, DSA topics to review, or Indiranagar cafe"
            />
          </div>

          <div className={`sb-field ${errors.date ? "has-error" : ""}`}>
            <label htmlFor="sb-date">Date</label>
            <input
              id="sb-date"
              type="date"
              value={form.slot_date}
              onChange={(e) => patch("slot_date", e.target.value)}
            />
            {errors.date && <div className="sb-error-text">{errors.date}</div>}
          </div>

          <div className="sb-modal-ribbon-wrap">
            <div className="sb-modal-ribbon-head">
              <span>Day Availability (8 AM – 6 PM)</span>
              <span className="sb-modal-ribbon-sub">Click open gap to auto-fill</span>
            </div>
            <TimeStrip
              compact
              slots={allSlots}
              date={form.slot_date}
              selectedRange={{
                startTime: form.start_time,
                endTime: form.end_time,
              }}
              onSelectGap={(gap) => {
                patch("start_time", gap.startTime);
                patch("end_time", gap.endTime);
              }}
            />
          </div>

          <div className="sb-row2">
            <div className={`sb-field ${errors.time ? "has-error" : ""}`}>
              <label htmlFor="sb-start">Start time</label>
              <input
                id="sb-start"
                type="time"
                step="900"
                value={form.start_time}
                onChange={(e) => patch("start_time", e.target.value)}
              />
            </div>
            <div className={`sb-field ${errors.time ? "has-error" : ""}`}>
              <label htmlFor="sb-end">End time</label>
              <input
                id="sb-end"
                type="time"
                step="900"
                value={form.end_time}
                onChange={(e) => patch("end_time", e.target.value)}
              />
            </div>
          </div>

          {errors.time && (
            <div
              className="sb-error-text"
              style={{ marginTop: -8, marginBottom: 15 }}
            >
              {errors.time}
            </div>
          )}

          {conflictSlot && (
            <div className="sb-conflict-card">
              <div className="sb-conflict-top">
                <AlertTriangle size={15} className="sb-conflict-icon" />
                <div className="sb-conflict-msg">
                  <strong>Collision with "{conflictSlot.title}"</strong>
                  <span>
                    ({fmtTime(conflictSlot.start_time)} –{" "}
                    {fmtTime(conflictSlot.end_time)})
                  </span>
                </div>
              </div>

              {suggestedSlot ? (
                <div className="sb-conflict-suggest">
                  <span>
                    Next open slot today:{" "}
                    <strong>
                      {fmtTime(suggestedSlot.startTime)} –{" "}
                      {fmtTime(suggestedSlot.endTime)}
                    </strong>
                  </span>
                  <button
                    type="button"
                    className="sb-btn-suggest"
                    onClick={() => {
                      playTick();
                      patch("start_time", suggestedSlot.startTime);
                      patch("end_time", suggestedSlot.endTime);
                    }}
                  >
                    <Sparkles size={13} /> Apply Suggestion
                  </button>
                </div>
              ) : (
                <div className="sb-conflict-no-slot">
                  No other openings found for this duration between 8 AM and 6 PM today.
                </div>
              )}
            </div>
          )}

          <div className="sb-modal-actions">
            <button
              type="button"
              className="sb-btn-secondary"
              onClick={onClose}
            >
              Discard
            </button>
            <button
              type="submit"
              className="sb-btn-primary"
              disabled={saving || Boolean(conflictSlot)}
            >
              {saving && <Loader2 size={15} className="sb-spin" />}
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
