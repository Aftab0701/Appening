import { todayISO, addDays, toMins, minsToTime } from "./time";

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function normalizeVoiceText(input) {
  if (!input) return "";
  return input
    .trim()
    .replace(/\bp\.m\.?/gi, "pm")
    .replace(/\ba\.m\.?/gi, "am")
    .replace(/\bP\.M\.?/g, "pm")
    .replace(/\bA\.M\.?/g, "am")
    .replace(/\bo'clock\b/gi, "")
    .replace(/^(?:please\s+)?(?:schedule|book|create|add|set up|plan)(?:\s+(?:a|an|the))?(?:\s+(?:meeting|appointment|call|sync))?\s+(?:for|with|about)?/i, "")
    .replace(/\s+/g, " ");
}

function parseHourMinute(hStr, mStr, ampmStr) {
  let h = parseInt(hStr, 10);
  const m = mStr ? parseInt(mStr, 10) : 0;
  const ap = ampmStr ? ampmStr.toLowerCase().trim() : "";

  if (ap === "pm") {
    if (h < 12) h += 12;
  } else if (ap === "am") {
    if (h === 12) h = 0;
  } else {
    if (h >= 1 && h <= 6) {
      h += 12;
    }
  }

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseAppointmentQuery(rawQuery) {
  if (!rawQuery || !rawQuery.trim()) {
    return {
      title: "",
      date: todayISO(),
      startTime: "09:00",
      endTime: "10:00",
      isValid: false,
      hasParsedTime: false,
    };
  }

  let text = normalizeVoiceText(rawQuery);
  let targetDate = todayISO();
  let startTime = "";
  let endTime = "";

  const today = new Date();

  if (/\b(?:day after tomorrow)\b/i.test(text)) {
    targetDate = addDays(todayISO(), 2);
    text = text.replace(/\b(?:day after tomorrow)\b/gi, " ");
  } else if (/\btomorrow\b/i.test(text)) {
    targetDate = addDays(todayISO(), 1);
    text = text.replace(/\btomorrow\b/gi, " ");
  } else if (/\btoday\b/i.test(text)) {
    targetDate = todayISO();
    text = text.replace(/\btoday\b/gi, " ");
  } else {
    for (let i = 0; i < DAYS.length; i++) {
      const regex = new RegExp(`\\b(?:on|this|next)?\\s*(${DAYS[i]})\\b`, "i");
      const match = regex.exec(text);
      if (match) {
        const currentDay = today.getDay();
        let diff = i - currentDay;
        if (diff <= 0) diff += 7;
        targetDate = addDays(todayISO(), diff);
        text = text.replace(match[0], " ");
        break;
      }
    }
  }

  const rangeRegex =
    /(?:from\s+)?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
  const rangeMatch = rangeRegex.exec(text);

  if (rangeMatch) {
    const [_, h1, m1, ap1, h2, m2, ap2] = rangeMatch;
    const effectiveAp1 = ap1 || (ap2 && parseInt(h1, 10) < 12 ? ap2 : "");
    const effectiveAp2 = ap2 || effectiveAp1;

    startTime = parseHourMinute(h1, m1, effectiveAp1);
    endTime = parseHourMinute(h2, m2, effectiveAp2);
    text = text.replace(rangeMatch[0], " ");
  } else {
    const singleRegex = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
    const singleMatch = singleRegex.exec(text);
    if (singleMatch && (singleMatch[3] || singleMatch[0].includes("at"))) {
      const [_, h, m, ap] = singleMatch;
      startTime = parseHourMinute(h, m, ap);
      const startMins = toMins(startTime);
      endTime = minsToTime(startMins + 60);
      text = text.replace(singleMatch[0], " ");
    }
  }

  const hasParsedTime = Boolean(startTime && endTime);
  if (!startTime || !endTime) {
    startTime = "09:00";
    endTime = "10:00";
  } else if (toMins(endTime) <= toMins(startTime)) {
    endTime = minsToTime(toMins(startTime) + 60);
  }

  let title = text
    .replace(/\b(?:on|at|for|with|from)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) {
    title = rawQuery.trim() || "New Appointment";
  }

  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    title,
    date: targetDate,
    startTime,
    endTime,
    isValid: Boolean(title.trim()),
    hasParsedTime,
  };
}
