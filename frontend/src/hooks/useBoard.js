import { useState, useEffect, useMemo, useCallback } from "react";
import { get, post, patch } from "../lib/api";
import { toMins } from "../lib/time";

function bucketByDate(list) {
  const map = {};
  for (const slot of list) {
    const key = slot.slot_date;
    if (!map[key]) map[key] = [];
    map[key].push(slot);
  }

  const sorted = Object.keys(map).sort();
  const out = [];
  for (const date of sorted) {
    map[date].sort((a, b) => toMins(a.start_time) - toMins(b.start_time));
    out.push({ date, items: map[date] });
  }
  return out;
}

function tally(list) {
  const c = { all: list.length, scheduled: 0, completed: 0, cancelled: 0 };
  for (const s of list) {
    if (c[s.status] !== undefined) c[s.status] += 1;
  }
  return c;
}

export default function useBoard() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flashId, setFlashId] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const fetchSlots = useCallback(async () => {
    try {
      const data = await get("/api/slots");
      setSlots(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const dateScoped = useMemo(() => {
    if (!dateFilter) return slots;
    return slots.filter((s) => s.slot_date === dateFilter);
  }, [slots, dateFilter]);

  const counts = useMemo(() => tally(dateScoped), [dateScoped]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return dateScoped;
    return dateScoped.filter((s) => s.status === statusFilter);
  }, [dateScoped, statusFilter]);

  const grouped = useMemo(() => bucketByDate(filtered), [filtered]);

  const filtersActive = statusFilter !== "all" || dateFilter !== "";

  async function createSlot(body) {
    const row = await post("/api/slots", body);
    await fetchSlots();
    flashBriefly(row.id);
    return row;
  }

  async function patchSlot(id, body) {
    const row = await patch(`/api/slots/${id}`, body);
    await fetchSlots();
    flashBriefly(id);
    return row;
  }

  function flashBriefly(id) {
    setFlashId(id);
    setTimeout(() => setFlashId(null), 900);
  }

  return {
    slots,
    grouped,
    counts,
    loading,
    error,
    flashId,
    total: slots.length,

    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    filtersActive,
    clearFilters() {
      setStatusFilter("all");
      setDateFilter("");
    },

    createSlot,
    patchSlot,
    refresh: fetchSlots,
  };
}
