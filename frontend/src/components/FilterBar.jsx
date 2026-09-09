import { useState, useRef, useLayoutEffect } from "react";
import { Plus, Command, Calendar, Mic } from "lucide-react";
import { todayISO } from "../lib/time";
import { playTick } from "../lib/audio";

const STATUS_TABS = ["all", "scheduled", "completed", "cancelled"];
const STATUS_LABELS = {
  all: "All",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function FilterBar({
  statusFilter,
  onStatusChange,
  dateFilter,
  onDateChange,
  filtersActive,
  onClearFilters,
  counts,
  onAddClick,
  onOpenCommand,
  onOpenVoice,
}) {
  const today = todayISO();
  const containerRef = useRef(null);
  const tabRefs = useRef({});
  const [pillStyle, setPillStyle] = useState({ left: 3, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    function updatePill() {
      const activeEl = tabRefs.current[statusFilter];
      const containerEl = containerRef.current;
      if (activeEl && containerEl) {
        const containerRect = containerEl.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        setPillStyle({
          left: activeRect.left - containerRect.left,
          width: activeRect.width,
          opacity: 1,
        });
      }
    }

    updatePill();
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [statusFilter, counts]);

  const handleTabClick = (key) => {
    if (key !== statusFilter) {
      playTick();
      onStatusChange(key);
    }
  };

  return (
    <div className="sb-controls">
      <div
        ref={containerRef}
        className="sb-segment"
        role="group"
        aria-label="Filter by status"
      >
        <div
          className="sb-segment-pill"
          style={{
            left: `${pillStyle.left}px`,
            width: `${pillStyle.width}px`,
            opacity: pillStyle.opacity,
          }}
        />

        {STATUS_TABS.map((key) => {
          const isActive = statusFilter === key;
          const count = counts[key] ?? 0;
          return (
            <button
              key={key}
              ref={(el) => {
                if (el) tabRefs.current[key] = el;
              }}
              type="button"
              className={isActive ? "active" : ""}
              onClick={() => handleTabClick(key)}
            >
              <span className="sb-seg-label">{STATUS_LABELS[key]}</span>
              <span className={`sb-seg-badge ${isActive ? "active" : ""}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="sb-date-group">
        <div className="sb-date-input-wrap">
          <Calendar size={14} className="sb-date-icon" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              playTick();
              onDateChange(e.target.value);
            }}
            aria-label="Filter by date"
          />
        </div>

        {dateFilter !== today && (
          <button
            type="button"
            className="sb-textlink"
            onClick={() => {
              playTick();
              onDateChange(today);
            }}
          >
            Today
          </button>
        )}

        {filtersActive && (
          <button
            type="button"
            className="sb-textlink"
            onClick={() => {
              playTick();
              onClearFilters();
            }}
          >
            Clear
          </button>
        )}

        <button
          type="button"
          className="sb-cmd-trigger-btn"
          onClick={() => {
            playTick();
            onOpenCommand?.();
          }}
          title="Open Natural Language Quick Add (Ctrl+K or Cmd+K)"
        >
          <Command size={13} strokeWidth={2.4} />
          <span className="sb-cmd-hint">Quick Add</span>
          <kbd className="sb-kbd">⌘K</kbd>
        </button>

        <button
          type="button"
          className="sb-voice-trigger-btn"
          onClick={() => {
            playTick();
            onOpenVoice?.();
          }}
          title="Dictate appointment with your voice"
        >
          <Mic size={14} />
        </button>

        <button
          type="button"
          className="sb-add-btn"
          onClick={() => {
            playTick();
            onAddClick();
          }}
        >
          <Plus size={16} strokeWidth={2.5} /> Add
        </button>
      </div>
    </div>
  );
}
