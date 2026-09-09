import { useState, useEffect, useRef, useMemo } from "react";
import {
  Command,
  Sparkles,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Mic,
  Loader2,
} from "lucide-react";
import { parseAppointmentQuery } from "../lib/nlp";
import { slotsOverlap, fmtDate, fmtTime, toMins, findAvailableSlot } from "../lib/time";
import { playTick, playSuccess, playAlert } from "../lib/audio";
import { isSpeechSupported, createSpeechRecognizer } from "../lib/voice";

export default function CommandPalette({
  isOpen,
  onClose,
  existingSlots = [],
  onCreateSlot,
  autoStartVoice = false,
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customTimes, setCustomTimes] = useState(null);

  const inputRef = useRef(null);
  const recognizerRef = useRef(null);

  useEffect(() => {
    setSpeechSupported(isSpeechSupported());
  }, []);

  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        try {
          recognizerRef.current.abort();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setError(null);
      setCustomTimes(null);
      setTimeout(() => inputRef.current?.focus(), 60);

      if (autoStartVoice && isSpeechSupported()) {
        startVoice();
      }
    } else {
      stopVoice();
      setSaving(false);
    }
  }, [isOpen, autoStartVoice]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        stopVoice();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  function startVoice() {
    if (isListening) {
      stopVoice();
      return;
    }

    playTick();
    setError(null);
    setCustomTimes(null);

    const rec = createSpeechRecognizer({
      onStart: () => setIsListening(true),
      onTranscript: (text) => {
        setQuery(text);
        setCustomTimes(null);
      },
      onEnd: () => setIsListening(false),
      onError: (msg) => {
        setIsListening(false);
        setError(msg);
      },
    });

    if (rec) {
      recognizerRef.current = rec;
      try {
        rec.start();
      } catch (err) {
        setIsListening(false);
        setError("Could not start voice recognition.");
      }
    }
  }

  function stopVoice() {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {}
      recognizerRef.current = null;
    }
    setIsListening(false);
  }

  const parsed = useMemo(() => {
    return parseAppointmentQuery(query);
  }, [query]);

  const effectiveStartTime = customTimes?.startTime || parsed.startTime;
  const effectiveEndTime = customTimes?.endTime || parsed.endTime;

  const { conflict, suggestedSlot } = useMemo(() => {
    if (!parsed.isValid) return { conflict: null, suggestedSlot: null };

    const daySlots = existingSlots.filter(
      (s) => s.slot_date === parsed.date && s.status !== "cancelled"
    );

    let conflictFound = null;
    for (const slot of daySlots) {
      if (
        slotsOverlap(
          effectiveStartTime,
          effectiveEndTime,
          slot.start_time,
          slot.end_time
        )
      ) {
        conflictFound = slot;
        break;
      }
    }

    let suggestion = null;
    if (conflictFound) {
      const dur = Math.max(
        15,
        toMins(effectiveEndTime) - toMins(effectiveStartTime)
      );
      suggestion = findAvailableSlot(daySlots, dur, 8, 18);
    }

    return { conflict: conflictFound, suggestedSlot: suggestion };
  }, [parsed, existingSlots, effectiveStartTime, effectiveEndTime]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    stopVoice();

    if (!parsed.title || !parsed.title.trim()) {
      setError("Please say or type a meeting title.");
      playAlert();
      return;
    }

    if (conflict) {
      if (suggestedSlot) {
        setCustomTimes(suggestedSlot);
        setError(null);
      } else {
        setError(
          `Time conflicts with "${conflict.title}" (${fmtTime(conflict.start_time)} – ${fmtTime(conflict.end_time)}).`
        );
        playAlert();
        return;
      }
    }

    setSaving(true);
    setError(null);

    const slotPayload = {
      title: parsed.title,
      description: `Created via Voice / Quick Add`,
      slot_date: parsed.date,
      start_time: customTimes?.startTime || parsed.startTime,
      end_time: customTimes?.endTime || parsed.endTime,
    };

    try {
      await onCreateSlot(slotPayload);
      playSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create appointment.");
      playAlert();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="sb-cmd-backdrop" onClick={onClose}>
      <div
        className="sb-cmd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <form onSubmit={handleSubmit} className="sb-cmd-form">
          <div className="sb-cmd-input-row">
            <Command size={18} className="sb-cmd-icon" />
            <input
              ref={inputRef}
              type="text"
              className="sb-cmd-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
                setCustomTimes(null);
              }}
              placeholder={
                isListening
                  ? "Listening... Speak title and time"
                  : 'Try "Swiggy Tech Interview tomorrow 2pm to 3:30pm"...'
              }
            />

            {speechSupported && (
              <button
                type="button"
                className={`sb-siri-mic-btn ${isListening ? "listening" : ""}`}
                onClick={startVoice}
                title={isListening ? "Stop listening" : "Dictate appointment with your voice"}
              >
                {isListening ? (
                  <div className="sb-siri-wave">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <Mic size={15} />
                )}
              </button>
            )}

            {query && (
              <button
                type="button"
                className="sb-cmd-clear-btn"
                onClick={() => {
                  setQuery("");
                  setCustomTimes(null);
                }}
              >
                <X size={14} />
              </button>
            )}
            <kbd className="sb-cmd-esc">ESC</kbd>
          </div>
        </form>

        {isListening && (
          <div className="sb-siri-listening-banner">
            <div className="sb-siri-pulse-dot" />
            <span>Listening to voice... Say your title, day, and time.</span>
          </div>
        )}

        {query.trim() && (
          <div className="sb-cmd-preview">
            <div className="sb-cmd-preview-head">
              <Sparkles size={13} className="sb-cmd-sparkle" />
              <span>Parsed Intent</span>
            </div>

            <div className="sb-cmd-chips">
              <div className="sb-cmd-chip">
                <span className="sb-chip-label">Title</span>
                <strong>{parsed.title}</strong>
              </div>
              <div className="sb-cmd-chip">
                <Calendar size={12} />
                <span>{fmtDate(parsed.date)}</span>
              </div>
              <div className="sb-cmd-chip">
                <Clock size={12} />
                <span>
                  {fmtTime(effectiveStartTime)} – {fmtTime(effectiveEndTime)}
                </span>
              </div>
            </div>

            {conflict ? (
              <div className="sb-cmd-status-box conflict">
                <div className="sb-cmd-conflict-header">
                  <AlertTriangle size={14} />
                  <span>
                    Conflicts with <strong>{conflict.title}</strong> (
                    {fmtTime(conflict.start_time)} – {fmtTime(conflict.end_time)})
                  </span>
                </div>
                {suggestedSlot && (
                  <div className="sb-cmd-conflict-action">
                    <span>Next open: {fmtTime(suggestedSlot.startTime)} – {fmtTime(suggestedSlot.endTime)}</span>
                    <button
                      type="button"
                      className="sb-cmd-apply-suggest"
                      onClick={() => {
                        playTick();
                        setCustomTimes(suggestedSlot);
                      }}
                    >
                      Apply Opening ✨
                    </button>
                  </div>
                )}
              </div>
            ) : parsed.isValid ? (
              <div className="sb-cmd-status available">
                <CheckCircle2 size={14} />
                <span>Time slot available · Ready to book</span>
              </div>
            ) : null}
          </div>
        )}

        {error && <div className="sb-cmd-error">{error}</div>}

        <div className="sb-cmd-footer">
          <span className="sb-cmd-footer-hint">Suggestions:</span>
          <div className="sb-cmd-suggestions">
            <button
              type="button"
              className="sb-sugg-pill"
              onClick={() => {
                playTick();
                setQuery("Swiggy Tech Round tomorrow 2pm to 3:30pm");
                setCustomTimes(null);
              }}
            >
              "Swiggy Tech Round tomorrow 2pm-3:30pm"
            </button>
            <button
              type="button"
              className="sb-sugg-pill"
              onClick={() => {
                playTick();
                setQuery("Smart India Hackathon sprint today 5pm to 6:30pm");
                setCustomTimes(null);
              }}
            >
              "Hackathon sprint today 5pm-6:30pm"
            </button>
            <button
              type="button"
              className="sb-sugg-pill"
              onClick={() => {
                playTick();
                setQuery("Chai with Rohan on Saturday 4pm to 5pm");
                setCustomTimes(null);
              }}
            >
              "Chai with Rohan on Saturday 4pm"
            </button>
          </div>

          <div className="sb-cmd-action-wrap">
            <button
              type="button"
              className="sb-cmd-submit-btn"
              disabled={!parsed.title || saving}
              onClick={handleSubmit}
            >
              {saving && <Loader2 size={14} className="sb-spin" />}
              {saving ? "Creating…" : "Create Appointment ↵"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
