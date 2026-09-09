let ctx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      ctx = new AudioCtx();
    }
  }
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function isAudioEnabled() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("sb_sound_enabled") !== "false";
}

export function setAudioEnabled(enabled) {
  if (typeof window !== "undefined") {
    localStorage.setItem("sb_sound_enabled", enabled ? "true" : "false");
  }
}

export function playTick() {
  if (!isAudioEnabled()) return;
  const c = getAudioContext();
  if (!c) return;

  try {
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.03);

    gain.gain.setValueAtTime(0.04, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start();
    osc.stop(c.currentTime + 0.035);
  } catch {}
}

export function playSuccess() {
  if (!isAudioEnabled()) return;
  const c = getAudioContext();
  if (!c) return;

  try {
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(783.99, now + 0.08);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch {}
}

export function playAlert() {
  if (!isAudioEnabled()) return;
  const c = getAudioContext();
  if (!c) return;

  try {
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.setValueAtTime(260, now + 0.06);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch {}
}
