import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import SlotCard from "./SlotCard";
import { fmtDate, todayISO } from "../lib/time";

export default function SlotList({
  grouped,
  flashId,
  filtersActive,
  onClearFilters,
  onComplete,
  onEdit,
  onCancel,
  onRestore,
}) {
  const listRef = useRef(null);
  const today = todayISO();

  useGSAP(() => {
    if (!listRef.current) return;
    const cards = listRef.current.querySelectorAll(".sb-slot");
    if (cards.length === 0) return;

    gsap.from(cards, {
      y: 8,
      opacity: 0,
      duration: 0.35,
      stagger: 0.04,
      ease: "power2.out",
      clearProps: "all",
    });
  }, { dependencies: [grouped], scope: listRef });

  if (grouped.length === 0) {
    return (
      <div className="sb-empty">
        <p>No appointments match these filters.</p>
        {filtersActive && (
          <button className="sb-textlink" onClick={onClearFilters}>
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={listRef}>
      {grouped.map((group) => (
        <div className="sb-date-group-block" key={group.date}>
          <div className="sb-date-head">
            <span className="sb-date-label">{fmtDate(group.date)}</span>
            {group.date === today && <span className="sb-today-tag">Today</span>}
          </div>
          <div className="sb-slot-list">
            {group.items.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                isFlashing={flashId === slot.id}
                onComplete={() => onComplete(slot)}
                onEdit={() => onEdit(slot)}
                onCancel={() => onCancel(slot)}
                onRestore={() => onRestore(slot)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
