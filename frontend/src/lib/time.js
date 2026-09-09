export function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(isoDate, delta = 1) {
  const parsed = new Date(`${isoDate}T00:00:00`);
  parsed.setDate(parsed.getDate() + delta);
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fmtDate(isoDate) {
  const parsed = new Date(`${isoDate}T00:00:00`);
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function fmtTime(raw) {
  if (!raw) return "";

  const parts = raw.split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const suffix = h >= 12 ? "PM" : "AM";

  h = h % 12;
  if (h === 0) h = 12;

  return `${h}:${m} ${suffix}`;
}

export function toMins(t) {
  const bits = t.split(":");
  return parseInt(bits[0], 10) * 60 + parseInt(bits[1], 10);
}

export function slotsOverlap(aStart, aEnd, bStart, bEnd) {
  return toMins(aStart) < toMins(bEnd) && toMins(bStart) < toMins(aEnd);
}

export function greetingFor() {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function initialsOf(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  return (
    (words[0]?.[0] || "") + (words[1]?.[0] || "")
  ).toUpperCase();
}

export function minsToTime(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function findAvailableSlot(daySlots, durationMins = 60, startHour = 8, endHour = 18, excludeId = null) {
  const windowStart = startHour * 60;
  const windowEnd = endHour * 60;

  const active = (daySlots || [])
    .filter((s) => s.id !== excludeId && s.status !== "cancelled")
    .map((s) => ({
      start: toMins(s.start_time),
      end: toMins(s.end_time),
      title: s.title,
    }))
    .sort((a, b) => a.start - b.start);

  let cursor = windowStart;

  for (const slot of active) {
    if (slot.end <= cursor) continue;
    if (slot.start - cursor >= durationMins) {
      return {
        startTime: minsToTime(cursor),
        endTime: minsToTime(cursor + durationMins),
      };
    }
    cursor = Math.max(cursor, slot.end);
  }

  if (windowEnd - cursor >= durationMins) {
    return {
      startTime: minsToTime(cursor),
      endTime: minsToTime(cursor + durationMins),
    };
  }

  return null;
}
