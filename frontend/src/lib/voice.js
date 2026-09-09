
export function isSpeechSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    window.mozSpeechRecognition ||
    window.msSpeechRecognition
  );
}

export function createSpeechRecognizer({
  onTranscript,
  onStart,
  onEnd,
  onError,
}) {
  if (!isSpeechSupported()) {
    onError?.("Voice recognition is not supported in this browser.");
    return null;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    onStart?.();
  };

  recognition.onresult = (event) => {
    let fullTranscript = "";
    for (let i = 0; i < event.results.length; i++) {
      fullTranscript += event.results[i][0].transcript + " ";
    }
    const clean = fullTranscript.trim();
    if (clean) {
      onTranscript?.(clean);
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "no-speech") {
      onError?.("No speech detected. Please try again.");
    } else if (event.error === "not-allowed") {
      onError?.("Microphone permission denied.");
    } else {
      onError?.(`Speech error: ${event.error}`);
    }
  };

  recognition.onend = () => {
    onEnd?.();
  };

  return recognition;
}
