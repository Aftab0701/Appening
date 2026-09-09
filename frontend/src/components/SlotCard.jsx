import { Check, Pencil, Ban, RotateCcw } from "lucide-react";
import { fmtTime } from "../lib/time";

const PILL_LABELS = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

const VERB_MAP = {
  added: "Added",
  edited: "Edited",
  completed: "Completed",
  cancelled: "Cancelled",
  restored: "Restored",
};

export default function SlotCard({
  slot,
  isFlashing,
  onComplete,
  onEdit,
  onCancel,
  onRestore,
}) {
  const isCancelled = slot.status === "cancelled";

  let metaText = null;
  if (slot.touched_action && slot.touched_by) {
    const verb = VERB_MAP[slot.touched_action] || "Updated";
    metaText = `${verb} by ${slot.touched_by}`;
  }

  const flashVar = isCancelled
    ? { "--sb-flash": "var(--sb-red-wash)" }
    : { "--sb-flash": "var(--sb-green-wash)" };

  const rowClasses = [
    "sb-slot",
    isCancelled ? "is-cancelled" : "",
    isFlashing ? "is-flash" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={rowClasses} style={isFlashing ? flashVar : undefined}>
      <div className="sb-slot-time">
        {fmtTime(slot.start_time)}<br />
        {fmtTime(slot.end_time)}
      </div>

      <div className="sb-slot-body">
        <p className={`sb-slot-title ${isCancelled ? "is-strike" : ""}`}>
          {slot.title}
        </p>
        {slot.description && (
          <p className="sb-slot-desc">{slot.description}</p>
        )}
        <div>
          <span className={`sb-pill ${slot.status}`}>
            {PILL_LABELS[slot.status]}
          </span>
        </div>
        {metaText && <p className="sb-slot-meta">{metaText}</p>}
      </div>

      <div className="sb-slot-actions">
        {slot.status === "scheduled" && (
          <>
            <button className="sb-icon-btn complete" onClick={onComplete}>
              <Check size={14} /> Complete
            </button>
            <button className="sb-icon-btn" onClick={onEdit}>
              <Pencil size={13} /> Edit
            </button>
            <button className="sb-icon-btn cancel" onClick={onCancel}>
              <Ban size={13} /> Cancel
            </button>
          </>
        )}
        {slot.status === "completed" && (
          <button className="sb-icon-btn" onClick={onEdit}>
            <Pencil size={13} /> Edit
          </button>
        )}
        {slot.status === "cancelled" && (
          <>
            <button className="sb-icon-btn restore" onClick={onRestore}>
              <RotateCcw size={13} /> Restore
            </button>
            <button className="sb-icon-btn" onClick={onEdit}>
              <Pencil size={13} /> Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
