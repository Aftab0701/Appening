import { useState, useRef, useCallback, useEffect } from "react";
import {
  CalendarCheck,
  ChevronDown,
  LogOut,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import useBoard from "../hooks/useBoard";
import FilterBar from "./FilterBar";
import TimeStrip from "./TimeStrip";
import SlotList from "./SlotList";
import SlotModal from "./SlotModal";
import CommandPalette from "./CommandPalette";
import Toast from "./Toast";
import { greetingFor, initialsOf, fmtDate, fmtTime, todayISO } from "../lib/time";
import { isAudioEnabled, setAudioEnabled, playTick, playSuccess } from "../lib/audio";

export default function BoardShell({ user, onSignOut }) {
  const board = useBoard();
  const {
    slots,
    grouped,
    counts,
    loading,
    flashId,
    total,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    filtersActive,
    clearFilters,
    createSlot,
    patchSlot,
  } = board;

  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [initialTimes, setInitialTimes] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [autoStartVoice, setAutoStartVoice] = useState(false);
  const [soundOn, setSoundOn] = useState(isAudioEnabled());
  const [toast, setToast] = useState(null);

  const shellRef = useRef(null);

  useGSAP(
    () => {
      if (!shellRef.current) return;
      gsap.from(shellRef.current, {
        y: 10,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
      });
    },
    { scope: shellRef }
  );

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setAudioEnabled(next);
    if (next) playTick();
  }

  function flash(type, message) {
    setToast({ type, message, key: Date.now() });
  }
  const dismissToast = useCallback(() => setToast(null), []);

  function openAdd(prefill = null) {
    setEditingSlot(null);
    setInitialTimes(prefill);
    setModalOpen(true);
  }

  function openEdit(slot) {
    setEditingSlot(slot);
    setInitialTimes(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingSlot(null);
    setInitialTimes(null);
  }

  async function handleSave(formData, existingId) {
    const who = user?.name || "Aftab";

    if (existingId) {
      await patchSlot(existingId, {
        ...formData,
        touched_by: who,
        touched_action: "edited",
      });
      flash("success", "Appointment updated.");
    } else {
      await createSlot({
        ...formData,
        touched_by: who,
      });
      flash(
        "success",
        `Appointment added for ${fmtDate(formData.slot_date)} at ${fmtTime(
          formData.start_time
        )}.`
      );
    }
  }

  async function handleComplete(slot) {
    try {
      await patchSlot(slot.id, {
        status: "completed",
        touched_by: user?.name || "Aftab",
        touched_action: "completed",
      });
      playSuccess();
      flash("success", `"${slot.title}" marked as completed.`);
    } catch (err) {
      flash("error", err.message);
    }
  }

  async function handleCancel(slot) {
    try {
      await patchSlot(slot.id, {
        status: "cancelled",
        touched_by: user?.name || "Aftab",
        touched_action: "cancelled",
      });
      playTick();
      flash("success", `"${slot.title}" cancelled.`);
    } catch (err) {
      flash("error", err.message);
    }
  }

  async function handleRestore(slot) {
    try {
      await patchSlot(slot.id, {
        status: "scheduled",
        touched_by: user?.name || "Aftab",
        touched_action: "restored",
      });
      playTick();
      flash("success", `"${slot.title}" restored to scheduled.`);
    } catch (err) {
      flash("error", err.message);
    }
  }

  function handleSignOut() {
    localStorage.removeItem("sb_session");
    setMenuOpen(false);
    onSignOut();
  }

  if (loading) {
    return (
      <div className="sb-splash">
        <div className="sb-mark">
          <CalendarCheck size={22} strokeWidth={2.25} color="#fff" />
        </div>
        <Loader2 size={20} className="sb-spin" color="#6E6E73" />
      </div>
    );
  }

  const firstName = user.name.split(" ")[0];
  const filtered = board.grouped.reduce((n, g) => n + g.items.length, 0);
  const activeTimelineDate = dateFilter || todayISO();

  return (
    <div className="sb-app" ref={shellRef}>
      <div className="sb-topbar">
        <div className="sb-brand">
          <div className="sb-mark sb-brand-mark">
            <CalendarCheck size={16} strokeWidth={2.5} />
          </div>
          <span className="sb-brand-name">Slate</span>
        </div>

        <div className="sb-topbar-actions">
          <button
            type="button"
            className={`sb-sound-btn ${soundOn ? "active" : ""}`}
            onClick={toggleSound}
            title={soundOn ? "Mute interface sounds" : "Enable tactile sounds"}
            aria-label="Toggle interface audio feedback"
          >
            {soundOn ? (
              <Volume2 size={16} strokeWidth={2.2} />
            ) : (
              <VolumeX size={16} strokeWidth={2.2} />
            )}
          </button>

          <div className="sb-account">
            <button
              className="sb-avatar-btn"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="sb-avatar">{initialsOf(user.name)}</span>
              <span className="sb-avatar-name">{firstName}</span>
              <ChevronDown size={14} color="#6E6E73" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="sb-menu-backdrop"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="sb-menu">
                  <div className="sb-menu-id">
                    <div className="sb-menu-id-name">{user.name}</div>
                    <div className="sb-menu-id-email">{user.email}</div>
                  </div>
                  <button className="sb-signout" onClick={handleSignOut}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="sb-shell">
        <h1 className="sb-greeting">{greetingFor()}, {firstName}.</h1>
        <p className="sb-greeting-sub">
          {filtersActive
            ? `Showing ${filtered} of ${total} appointments.`
            : `${total} appointment${total === 1 ? "" : "s"} on the board.`}
        </p>

        <FilterBar
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          dateFilter={dateFilter}
          onDateChange={setDateFilter}
          filtersActive={filtersActive}
          onClearFilters={clearFilters}
          counts={counts}
          onAddClick={() => openAdd()}
          onOpenCommand={() => {
            setAutoStartVoice(false);
            setCommandPaletteOpen(true);
          }}
          onOpenVoice={() => {
            setAutoStartVoice(true);
            setCommandPaletteOpen(true);
          }}
        />

        <TimeStrip
          slots={slots}
          date={activeTimelineDate}
          onDateChange={setDateFilter}
          onSelectSlot={openEdit}
          onSelectGap={(gap) => openAdd(gap)}
        />

        <SlotList
          grouped={grouped}
          flashId={flashId}
          filtersActive={filtersActive}
          onClearFilters={clearFilters}
          onComplete={handleComplete}
          onEdit={openEdit}
          onCancel={handleCancel}
          onRestore={handleRestore}
        />
      </div>

      {modalOpen && (
        <SlotModal
          editingSlot={editingSlot}
          initialTimes={initialTimes}
          allSlots={slots}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => {
          setCommandPaletteOpen(false);
          setAutoStartVoice(false);
        }}
        existingSlots={slots}
        onCreateSlot={createSlot}
        autoStartVoice={autoStartVoice}
      />

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
