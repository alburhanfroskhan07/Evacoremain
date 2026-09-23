"use client";

/**
 * Multilingual Voice Guidance Helper - Robust, Glitch-Free Web Speech TTS Engine
 *
 * Fixes:
 * 1. Chromium V8 Garbage Collection bug (persisting activeUtterance in module scope)
 * 2. Asynchronous voice list initialization via onvoiceschanged listener
 * 3. Cancel-to-speak race condition with microtask debounce
 * 4. Automatic speech unfreezing for paused browser audio
 * 5. Multi-lingual regional fallback for Hindi (hi-IN), Bengali (bn-IN), English (en-IN)
 */

const LOCALE_BCP47_MAP = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
};

// Module-level reference to prevent V8 Garbage Collector from killing speech in the middle
let activeUtterance = null;
let speechPingInterval = null;
let cachedVoices = [];

function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
    };
  }
}

/**
 * Speak a localized sentence with clean audio synthesis
 */
export function speakVoiceGuidance({
  text,
  locale = "en",
  isMuted = false,
  onStart,
  onEnd,
}) {
  if (isMuted) return;
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;

  try {
    // Clear any active speech and ping interval
    if (speechPingInterval) {
      clearInterval(speechPingInterval);
      speechPingInterval = null;
    }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const targetLang = LOCALE_BCP47_MAP[locale] || "en-IN";
    const voices = cachedVoices.length > 0 ? cachedVoices : loadVoices();

    // Look for matching regional voice
    const matchingVoice = voices.find(
      (v) =>
        v.lang === targetLang ||
        v.lang?.toLowerCase() === targetLang.toLowerCase() ||
        v.lang?.replace("_", "-").toLowerCase().startsWith(locale.toLowerCase())
    );

    // Give browser cancel 50ms to settle to prevent Chrome speech synthesis race condition
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLang;
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        const cleanup = () => {
          if (speechPingInterval) {
            clearInterval(speechPingInterval);
            speechPingInterval = null;
          }
          activeUtterance = null;
          onEnd?.();
        };

        utterance.onstart = () => {
          onStart?.();
          // Chrome keeps long speech alive with periodic ping
          speechPingInterval = setInterval(() => {
            if (typeof window !== "undefined" && window.speechSynthesis) {
              if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
              }
            }
          }, 10000);
        };

        utterance.onend = cleanup;
        utterance.onerror = (e) => {
          if (e?.error !== "canceled" && e?.error !== "interrupted") {
            console.warn("Speech synthesis notice:", e?.error);
          }
          cleanup();
        };

        // Pin to module-level reference so garbage collector does not kill it mid-speech
        activeUtterance = utterance;

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis trigger notice:", err?.message);
        onEnd?.();
      }
    }, 60);
  } catch (err) {
    console.warn("Speech synthesis notice:", err?.message);
    onEnd?.();
  }
}

/**
 * Cancel any ongoing speech cleanly
 */
export function stopVoiceGuidance() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      if (speechPingInterval) {
        clearInterval(speechPingInterval);
        speechPingInterval = null;
      }
      activeUtterance = null;
      window.speechSynthesis.cancel();
    } catch {
      // Silent catch
    }
  }
}
