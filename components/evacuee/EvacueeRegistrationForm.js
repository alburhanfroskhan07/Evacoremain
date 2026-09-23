"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import { useTranslations, useLanguage } from "@/lib/i18n/LanguageContext";
import { useVoice } from "@/lib/VoiceContext";
import { speakVoiceGuidance, stopVoiceGuidance } from "@/lib/voice-guidance";
import VoucherDisplay from "@/components/evacuee/VoucherDisplay";
import { queueOfflineEvacuee, saveVoucherToLocalVault } from "@/lib/offline-sync";
import { saveFamilyPass, getSavedFamilyPasses } from "@/lib/family-passes";
import ShelterMap from "@/components/map/ShelterMap";
import PhotoCaptureUpload from "@/components/evacuee/PhotoCaptureUpload";
import AILoadingState from "@/components/ui/AILoadingState";
import AI_Voice from "@/components/ui/AI_Voice";
import BellToggle from "@/components/ui/BellToggle";

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */

const SPECIAL_NEEDS_CONFIG = [
  {
    value: "medical",
    key: "needsMedical",
    defaultLabel: "Medical Care",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    value: "elderly",
    key: "needsElderly",
    defaultLabel: "Elderly Care",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    value: "infant",
    key: "needsInfant",
    defaultLabel: "Infant / Child",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    value: "disability",
    key: "needsDisability",
    defaultLabel: "Wheelchair / Mobility",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    value: "pregnant",
    key: "needsPregnant",
    defaultLabel: "Maternity / Pregnant",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
];

const INITIAL = {
  name: "",
  familySize: "1",
  lat: 22.5726,
  lng: 88.3639,
  missingFamilyMemberName: "",
  missingPersonPhoto: null,
  evacueePhoto: null,
  specialNeeds: [],
};

/* ──────────────────────────────────────────────
   Validation
   ────────────────────────────────────────────── */

function validate(f, t) {
  const errors = {};
  if (!f.name || !f.name.trim()) errors.name = t("valNameRequired", "Name is required.");
  if (!f.familySize || Number(f.familySize) < 1) errors.familySize = t("valFamilySizeMin", "Family size must be at least 1.");
  const latNum = Number(f.lat);
  const lngNum = Number(f.lng);
  if (isNaN(latNum) || latNum < -90 || latNum > 90) errors.lat = t("valLatRange", "Must be between -90 and 90.");
  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) errors.lng = t("valLngRange", "Must be between -180 and 180.");
  return errors;
}

/**
 * EvacueeRegistrationForm - Master PRD Section 10.5 & 10.6
 *
 * Polished form with AI natural-language intake, Web Speech voice input,
 * auto-routing, and fallback to emergency relief voucher.
 */
export default function EvacueeRegistrationForm({ onSubmit, onAIExtract, toast, onRegistered }) {
  const t = useTranslations("evacuee");
  const { currentLanguage } = useLanguage();
  const { isMuted, isSpeaking, setIsSpeaking } = useVoice();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submissionResult, setSubmissionResult] = useState(null);
  const [intakeMode, setIntakeMode] = useState("express");
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [showMissingRelative, setShowMissingRelative] = useState(false);
  const spokenResultRef = useRef(null);
  const hasAutoLocatedRef = useRef(false);

  /* Multilingual Voice Guidance TTS Trigger (Step F9) - Controlled & Glitch-Free */
  const speakConfirmation = useCallback((result) => {
    if (!result || isMuted) return;

    const isNoCap =
      result.flag === "no_capacity" ||
      (!result.assignedShelterId && !result.assignedShelterName);

    let textToSpeak = "";
    if (isNoCap) {
      textToSpeak = t(
        "voiceVoucherConfirmation",
        "Registration confirmed. Regional shelters are full. An official emergency ration voucher pass has been generated on your screen."
      );
    } else {
      const shelterName =
        result.assignedShelterName || "Regional Relief Facility";
      const distance = result.distanceKm
        ? Number(result.distanceKm).toFixed(1)
        : "1.5";
      textToSpeak = t("voiceConfirmation", {
        shelterName,
        distanceKm: distance,
      });
    }

    speakVoiceGuidance({
      text: textToSpeak,
      locale: currentLanguage || "en",
      isMuted,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, [currentLanguage, isMuted, t, setIsSpeaking]);

  useEffect(() => {
    if (submissionResult && spokenResultRef.current !== submissionResult) {
      spokenResultRef.current = submissionResult;
      speakConfirmation(submissionResult);
    }
  }, [submissionResult, speakConfirmation]);

  /* Live Location Sharing Beacon (Step F21) */
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [sharingStatus, setSharingStatus] = useState("idle");

  useEffect(() => {
    if (!isSharingLocation || !submissionResult?.evacueeId) return;

    const pushLocation = () => {
      if (typeof window === "undefined" || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await fetch("/api/evacuee/update-location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                evacueeId: submissionResult.evacueeId,
                sessionToken: submissionResult.sessionToken,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              }),
            });
            setSharingStatus("active");
          } catch {
            setSharingStatus("error");
          }
        },
        () => setSharingStatus("error"),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    };

    pushLocation();
    const interval = setInterval(pushLocation, 60000); // 60s update interval per Step F21

    return () => clearInterval(interval);
  }, [isSharingLocation, submissionResult]);

  /* AI intake state */
  const [freeText, setFreeText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErrorMsg, setAiErrorMsg] = useState("");
  const [aiFilled, setAiFilled] = useState({});
  /* Voice recognition & Real-Time Extraction state */
  const [voiceLang, setVoiceLang] = useState(
    currentLanguage === "hi" ? "hi-IN" : currentLanguage === "bn" ? "bn-IN" : "en-IN"
  );
  const [listening, setListening] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isInstantAnalyzing, setIsInstantAnalyzing] = useState(false);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const aiDebounceTimerRef = useRef(null);
  const latestTranscriptRef = useRef("");

  /* ──────────────────────────────────────────────
     Instant 0ms Client-Side Natural Language Matcher
     Extracts Name, Family Size, Special Needs & Missing
     Persons in Real-Time as words are uttered or typed
     ────────────────────────────────────────────── */
  function instantClientExtract(text) {
    if (!text || typeof text !== "string") return null;
    const raw = text.trim();
    if (raw.length < 2) return null;

    const lower = raw.toLowerCase();
    const extracted = {};

    // 1. Full Name detection (English, Hindi transliteration, Bengali)
    const explicitPatterns = [
      /(?:mera\s+naam\s+hai|mera\s+naam|amar\s+naam\s+holo|amar\s+naam|my\s+name\s+is|this\s+is|i\s+am|i'm|myself|naam\s+hai|naam\s+holo|naam|nam)\s+([A-Za-z\u0900-\u097F\u0980-\u09FF]+(?:\s+[A-Za-z\u0900-\u097F\u0980-\u09FF]+)?)/i,
      /(?:main|mai|ami)\s+([A-Za-z\u0900-\u097F\u0980-\u09FF]+(?:\s+[A-Za-z\u0900-\u097F\u0980-\u09FF]+)?)\s+(?:bol\s+raha|bol\s+rahi|bolchi|hoon|hun|aachi)/i,
    ];

    for (const pat of explicitPatterns) {
      const m = raw.match(pat);
      if (m && m[1]) {
        let candidate = m[1].replace(/[,।\.\!\?].*$/, "").trim();
        candidate = candidate.replace(/\s+(?:hai|holo|ahe|hobe|hoon|hun|aachi|aache)$/i, "").trim();
        const stopWords = ["with", "and", "from", "near", "aur", "hum", "amra", "log", "jon", "hai", "ahe", "ek", "do", "teen", "four", "five", "living", "in"];
        if (!stopWords.includes(candidate.toLowerCase()) && candidate.length > 1) {
          extracted.name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
          break;
        }
      }
    }

    // If no explicit phrase, check leading name e.g. "Sunil Kumar, 4 people" or "Amit Roy with 3 members"
    if (!extracted.name) {
      const leadingMatch = raw.match(/^([A-Z\u0900-\u097F\u0980-\u09FF][a-z\u0900-\u097F\u0980-\u09FF]+(?:\s+[A-Z\u0900-\u097F\u0980-\u09FF][a-z\u0900-\u097F\u0980-\u09FF]+)?)(?:\s*[,;:\-—|]|\s+(?:with|and|from|aur|amra|hum|sath|having|having\s+a|need|needs|\d))/i);
      if (leadingMatch && leadingMatch[1]) {
        const cand = leadingMatch[1].trim();
        const notNames = ["hello", "namaste", "hi", "help", "emergency", "please", "urgent", "we", "i", "my", "our", "water", "flood"];
        if (!notNames.includes(cand.toLowerCase()) && cand.length > 2) {
          extracted.name = cand.charAt(0).toUpperCase() + cand.slice(1);
        }
      }
    }

    // If single 2-word input like "Sunil Kumar"
    if (!extracted.name) {
      const words = raw.split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && !/\d/.test(raw)) {
        const notNames = ["help", "flood", "water", "sos", "emergency", "shelter", "camp", "hospital"];
        if (!notNames.some((w) => lower.includes(w))) {
          extracted.name = raw.replace(/[,\.!]/g, "").trim();
        }
      }
    }

    // 2. Family Size detection
    const numberWordMap = {
      "one": 1, "ek": 1, "ekjon": 1, "single": 1, "alone": 1, "akela": 1, "eka": 1,
      "two": 2, "do": 2, "dono": 2, "duto": 2, "dujon": 2, "couple": 2,
      "three": 3, "teen": 3, "tin": 3, "tinte": 3, "tinjon": 3, "teenon": 3,
      "four": 4, "char": 4, "chaar": 4, "charte": 4, "charjon": 4,
      "five": 5, "panch": 5, "paanch": 5, "pachta": 5, "panchjon": 5,
      "six": 6, "chhe": 6, "chhoy": 6, "chhota": 6, "chhejon": 6,
      "seven": 7, "saat": 7, "sat": 7, "satjon": 7,
      "eight": 8, "aath": 8, "aat": 8, "aatjon": 8,
      "nine": 9, "nau": 9, "noy": 9, "noyjon": 9,
      "ten": 10, "das": 10, "dosh": 10, "doshjon": 10,
      "eleven": 11, "gyarah": 11, "egaro": 11,
      "twelve": 12, "barah": 12, "baro": 12,
    };

    const digitMatch = lower.match(/\b(\d{1,2})\s*(?:people|person|persons|log|jon|members|member|family\s*members|family|sadasya|jan|sodossho|heads)?\b/i);
    if (digitMatch && Number(digitMatch[1]) > 0 && Number(digitMatch[1]) <= 50) {
      extracted.familySize = String(Number(digitMatch[1]));
    } else {
      const phraseMatch = lower.match(/(?:hum|hamare|amra|family of|total|with|sath)\s+([a-z]+|\d+)\s*(?:log|jon|people|members|member|sadasya)?/i);
      if (phraseMatch && phraseMatch[1]) {
        const word = phraseMatch[1].trim();
        if (numberWordMap[word]) {
          extracted.familySize = String(numberWordMap[word]);
        } else if (!isNaN(Number(word)) && Number(word) > 0) {
          extracted.familySize = String(Number(word));
        }
      } else {
        for (const [w, val] of Object.entries(numberWordMap)) {
          const regex = new RegExp(`\\b${w}\\s+(?:people|person|persons|log|jon|members|member|family|sadasya)\\b`, "i");
          if (regex.test(lower)) {
            extracted.familySize = String(val);
            break;
          }
        }
      }
    }

    // 3. Special Needs detection
    const needs = [];
    if (/(?:wheelchair|wheel\s*chair|mobility|apahij|vikalang|divyang|protibondhi|chal\s*nahi|chalne|pair|hath\s*pair|baisakhi|crutch|crutches|paraly|chair|walker|handicap)/i.test(lower)) {
      needs.push("disability");
    }
    if (/(?:elderly|old\s*age|senior|senior\s*citizen|maaji|maji|dadi|dadaji|dada|nana|nani|baba|maa|pita|buddhe|bujurg|boyoshko|briddho|aged|60\s*plus|70\s*saal|80\s*saal)/i.test(lower)) {
      needs.push("elderly");
    }
    if (/(?:infant|baby|newborn|bacha|baccha|chota\s*bacha|chhota\s*bacha|shishu|chotto|kid|kids|child|children|toddler|doodh|feed)/i.test(lower)) {
      needs.push("infant");
    }
    if (/(?:medical|medicine|dawai|osudh|dawa|aspatal|hospital|doctor|treatment|ill|sick|bimari|bimar|rogi|diabetes|sugar|bp|pressure|dialysis|oxygen|asthma|injur|ghayal|chot|fever|bukhar|tablet|insulin|cardiac|heart)/i.test(lower)) {
      needs.push("medical");
    }
    if (/(?:pregnant|pregnancy|maternity|expectant|garbhavati|pet\s*me\s*bacha|shomvoba|garbhashay|delivery|labour)/i.test(lower)) {
      needs.push("pregnant");
    }
    if (needs.length > 0) {
      extracted.specialNeeds = Array.from(new Set(needs));
    }

    // 4. Missing family member detection
    const missingMatch = lower.match(/(?:missing|kho\s*gaya|kho\s*gayi|mil\s*nahi\s*raha|mil\s*nahi\s*rahi|khuje\s*pachhi\s*na|harie\s*geche|looking\s*for|search\s*for)\s+(?:my\s+|meri\s+|mera\s+|amar\s+)?(?:son|daughter|wife|husband|mother|father|brother|sister|bhai|behen|beta|beti|chele|meye|patni|pati)?\s*[:\s]*([A-Za-z\u0900-\u097F\u0980-\u09FF]{2,25})/i) ||
      raw.match(/([A-Za-z\u0900-\u097F\u0980-\u09FF]{2,25})\s+(?:is\s+missing|kho\s*gaya|kho\s*gayi|harie\s*geche|mil\s*nahi\s*raha)/i);
    if (missingMatch && missingMatch[1]) {
      extracted.missingFamilyMemberName = missingMatch[1].trim();
    }

    return Object.keys(extracted).length > 0 ? extracted : null;
  }

  const applyInstantFields = useCallback((instant) => {
    if (!instant) return;
    const filledKeys = {};
    setForm((prev) => {
      const next = { ...prev };
      if (instant.name) { next.name = instant.name; filledKeys.name = true; }
      if (instant.familySize) { next.familySize = String(instant.familySize); filledKeys.familySize = true; }
      if (instant.missingFamilyMemberName) {
        next.missingFamilyMemberName = instant.missingFamilyMemberName;
        filledKeys.missingFamilyMemberName = true;
      }
      if (instant.specialNeeds && instant.specialNeeds.length > 0) {
        const valid = instant.specialNeeds.filter(
          (n) => n !== "none" && SPECIAL_NEEDS_CONFIG.some((o) => o.value === n)
        );
        if (valid.length > 0) {
          next.specialNeeds = Array.from(new Set([...next.specialNeeds, ...valid]));
          filledKeys.specialNeeds = true;
        }
      }
      return next;
    });
    setAiFilled((p) => ({ ...p, ...filledKeys }));
    setErrors({});
  }, []);

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(",")[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const applyAIResult = useCallback((result, isLive = false) => {
    if (!result || result.couldNotExtract) {
      if (!isLive) {
        const fallbackMsg = t("aiErrorFallback", "Couldn't auto-fill - please fill the form manually.");
        setAiErrorMsg(fallbackMsg);
        toast?.({ type: "warning", message: fallbackMsg });
      }
      return;
    }

    if (result.transcribedText) {
      setFreeText(result.transcribedText);
    }

    applyInstantFields(result);

    if (!isLive) {
      toast?.({
        type: "success",
        message: t("aiSuccessNotice", "Voice processed & form fields auto-filled!"),
      });
    }
  }, [t, toast, applyInstantFields]);

  /* Blazing fast debounced server AI call */
  const triggerFastAIExtract = useCallback(async (textToExtract) => {
    if (!textToExtract || !textToExtract.trim() || !onAIExtract) return;
    try {
      setIsInstantAnalyzing(true);
      const result = await onAIExtract(textToExtract.trim());
      if (result) {
        applyAIResult(result, true);
      }
    } catch (e) {
      console.warn("Live AI extraction notice:", e);
    } finally {
      setIsInstantAnalyzing(false);
    }
  }, [onAIExtract, applyAIResult]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (aiFilled[name]) setAiFilled((p) => ({ ...p, [name]: false }));
    if (errors[name]) setErrors((p) => { const c = { ...p }; delete c[name]; return c; });
  }

  function handleBlur(e) {
    setTouched((p) => ({ ...p, [e.target.name]: true }));
  }

  function toggleSpecialNeed(value) {
    setForm((prev) => {
      const has = prev.specialNeeds.includes(value);
      return {
        ...prev,
        specialNeeds: has
          ? prev.specialNeeds.filter((v) => v !== value)
          : [...prev.specialNeeds, value],
      };
    });
    if (aiFilled.specialNeeds) setAiFilled((p) => ({ ...p, specialNeeds: false }));
  }

  /* Multi-Tier Geolocation Acquisition with Instant Sector Fallback */
  const handleGeo = useCallback((silent = false) => {
    if (typeof window === "undefined" || !window.navigator?.geolocation) {
      setForm((prev) => ({ ...prev, lat: prev.lat || 22.5726, lng: prev.lng || 88.3639 }));
      if (!silent) {
        toast?.({ type: "info", message: "GPS hardware unavailable. Connected to Howrah Sector Hub (22.5726, 88.3639)." });
      }
      return;
    }

    setGeoLoading(true);

    const onGeoSuccess = (pos) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      setForm((prev) => ({ ...prev, lat, lng }));
      setTouched((prev) => ({ ...prev, lat: true, lng: true }));
      setErrors((prev) => { const c = { ...prev }; delete c.lat; delete c.lng; return c; });
      setGeoLoading(false);
      if (!silent) {
        toast?.({ type: "success", message: `Live GPS Locked: ${lat}, ${lng}` });
      }
    };

    const onGeoFallback = () => {
      window.navigator.geolocation.getCurrentPosition(
        onGeoSuccess,
        () => {
          setGeoLoading(false);
          setForm((prev) => ({ ...prev, lat: prev.lat || 22.5726, lng: prev.lng || 88.3639 }));
          setErrors((prev) => { const c = { ...prev }; delete c.lat; delete c.lng; return c; });
          if (!silent) {
            toast?.({
              type: "info",
              message: "Device GPS unavailable or permission blocked. Defaulted to Howrah Relief Sector (22.5726, 88.3639).",
            });
          }
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    };

    try {
      window.navigator.geolocation.getCurrentPosition(
        onGeoSuccess,
        onGeoFallback,
        { enableHighAccuracy: true, timeout: 4000 }
      );
    } catch {
      onGeoFallback();
    }
  }, [toast]);

  /* Auto-acquire real-time GPS coordinates once on initial mount (silent) */
  useEffect(() => {
    if (!hasAutoLocatedRef.current && typeof window !== "undefined" && window.navigator?.geolocation) {
      hasAutoLocatedRef.current = true;
      handleGeo(true);
    }
  }, [handleGeo]);

  // ── Universal MediaRecorder Audio Fallback (Gemini Multimodal) ──
  const startMediaRecorderRecording = useCallback((activeStream) => {
    try {
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
      const recorder = new MediaRecorder(activeStream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        activeStream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setListening(false);

        if (audioChunksRef.current.length > 0) {
          const recordedBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          try {
            setAiLoading(true);
            setAiErrorMsg("");
            const b64 = await blobToBase64(recordedBlob);
            toast?.({ type: "info", message: "Processing voice recording with Gemini AI…" });
            const result = await (onAIExtract ? onAIExtract({ audioBase64: b64, audioMimeType: recordedBlob.type }) : null);
            if (result && !result.couldNotExtract) {
              applyAIResult(result);
            }
          } catch (err) {
            console.warn("Audio extraction fallback:", err);
            toast?.({ type: "error", message: "AI speech parsing failed. Try a sample voice prompt below." });
          } finally {
            setAiLoading(false);
          }
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setListening(true);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 15) {
            recorder.stop();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn("MediaRecorder start failure:", err);
      toast?.({ type: "error", message: "Failed to record audio. Try sample prompts." });
    }
  }, [toast, onAIExtract, applyAIResult]);

  const startListening = useCallback(async () => {
    setRecordingSeconds(0);
    setAiErrorMsg("");
    latestTranscriptRef.current = "";

    const SpeechRec = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

    // Step 1: Use native browser SpeechRecognition if supported (Chrome, Edge, Android Chrome, Safari)
    // Note: Do NOT lock the microphone with getUserMedia before starting SpeechRecognition!
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = voiceLang || (currentLanguage === "hi" ? "hi-IN" : currentLanguage === "bn" ? "bn-IN" : "en-IN");
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setListening(true);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = setInterval(() => {
            setRecordingSeconds((prev) => prev + 1);
          }, 1000);
        };

        recognition.onresult = (event) => {
          let finalTranscript = "";
          let interim = "";
          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += (finalTranscript ? " " : "") + transcript;
            } else {
              interim += transcript;
            }
          }
          const fullText = (finalTranscript + (interim ? " " + interim : "")).trim();
          if (fullText) {
            latestTranscriptRef.current = fullText;
            setFreeText(fullText);

            // Instant live extraction as user speaks
            const instant = instantClientExtract(fullText);
            if (instant) {
              applyInstantFields(instant);
            }
          }
        };

        recognition.onerror = (e) => {
          console.warn("Speech recognition notice:", e.error);
          if (e.error === "no-speech") return;

          setListening(false);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

          if (e.error === "not-allowed" || e.error === "permission-denied") {
            toast?.({
              type: "error",
              message: "Microphone blocked in browser! Please click the lock/tune icon in address bar to Allow microphone.",
            });
          } else if (e.error === "network" || e.error === "service-not-allowed") {
            toast?.({
              type: "warning",
              message: "Browser speech cloud service unavailable. You can type directly or tap a quick sample below!",
            });
          } else if (e.error === "audio-capture") {
            toast?.({
              type: "error",
              message: "No audio captured. Please check your mic connection or use the quick sample prompts.",
            });
          }
        };

        recognition.onend = () => {
          setListening(false);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          const textToParse = latestTranscriptRef.current || freeText;
          if (textToParse && textToParse.trim().length > 2) {
            const instant = instantClientExtract(textToParse);
            if (instant) {
              applyInstantFields(instant);
              toast?.({ type: "success", message: "Voice processed & form details filled!" });
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        return;
      } catch (err) {
        console.warn("Native SpeechRec failed, falling back to MediaRecorder:", err);
      }
    }

    // Step 2: Fallback to MediaRecorder for browsers without native SpeechRecognition (e.g. Firefox)
    if (typeof window !== "undefined" && navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startMediaRecorderRecording(stream);
      } catch (permErr) {
        console.warn("Microphone access error:", permErr);
        toast?.({
          type: "error",
          message: "Microphone access is unavailable. Please click one of the quick sample voice prompts below!",
        });
      }
    } else {
      toast?.({
        type: "warning",
        message: "Microphone is not supported in this browser. Please use the quick sample prompts below!",
      });
    }
  }, [toast, currentLanguage, voiceLang, startMediaRecorderRecording, applyInstantFields, freeText]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (aiDebounceTimerRef.current) clearTimeout(aiDebounceTimerRef.current);
    setListening(false);

    const textToParse = latestTranscriptRef.current || freeText;
    if (textToParse && textToParse.trim().length > 2) {
      const instant = instantClientExtract(textToParse);
      if (instant) {
        applyInstantFields(instant);
        toast?.({ type: "success", message: "Voice details extracted & form auto-filled!" });
      }
      triggerFastAIExtract(textToParse);
    }
  }, [freeText, triggerFastAIExtract, applyInstantFields, toast]);

  useEffect(() => {
    const recTimer = recordingTimerRef.current;
    const debTimer = aiDebounceTimerRef.current;
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {}
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      clearInterval(recTimer);
      clearTimeout(debTimer);
    };
  }, []);

  /* AI Extraction (Manual click) */
  async function handleAIExtract() {
    const text = freeText.trim();
    if (!text) {
      toast?.({ type: "warning", message: "Type or speak your situation first." });
      return;
    }

    setAiLoading(true);
    setAiErrorMsg("");

    // 1. Instant local heuristic extraction
    const localResult = instantClientExtract(text);
    if (localResult) {
      applyAIResult({ couldNotExtract: false, ...localResult }, false);
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI extraction timed out")), 8000)
    );

    try {
      if (onAIExtract) {
        const result = await Promise.race([onAIExtract(text), timeoutPromise]);
        if (result && !result.couldNotExtract) {
          applyAIResult(result);
        } else if (!localResult) {
          throw new Error("Could not extract details");
        }
      }
    } catch (err) {
      if (!localResult) {
        const fallbackMsg = t("aiErrorFallback", "Couldn't auto-fill - please fill the form manually.");
        setAiErrorMsg(fallbackMsg);
        toast?.({ type: "warning", message: fallbackMsg });
      }
    } finally {
      setAiLoading(false);
    }
  }

  /* Submit */
  async function handleSubmit(e) {
    e.preventDefault();
    const v = validate(form, t);
    setErrors(v);
    setTouched({ name: true, familySize: true, lat: true, lng: true });

    if (Object.keys(v).length > 0) {
      toast?.({ type: "error", message: "Please fix the highlighted required fields." });
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const payload = {
      name: form.name.trim(),
      familySize: Number(form.familySize),
      lat: Number(form.lat),
      lng: Number(form.lng),
      missingFamilyMemberName: form.missingFamilyMemberName.trim() || null,
      missingPersonPhoto: form.missingPersonPhoto || null,
      photo: form.evacueePhoto || null,
      specialNeeds: form.specialNeeds.length > 0 ? form.specialNeeds : null,
      rawIntakeText: freeText.trim() || null,
    };

    // ── 24-Hour Device & Network Duplicate Guard ──
    const savedPasses = getSavedFamilyPasses();
    const existingSameName = savedPasses.find((p) => {
      const isSame = p.name?.toLowerCase().trim() === form.name.toLowerCase().trim();
      const isRecent = p.savedAt && (Date.now() - new Date(p.savedAt).getTime() < 24 * 60 * 60 * 1000);
      return isSame && isRecent;
    });

    if (existingSameName) {
      toast?.({
        type: "error",
        message: `'${form.name}' has already been registered from this device within the last 24 hours. Duplicate registrations are restricted for 24 hours.`,
      });
      setSubmitError(`'${form.name}' is already registered on this device within the last 24 hours. Please view your existing Family Pass above.`);
      setSubmitting(false);
      return;
    }

    // If offline, store locally and immediately issue offline voucher pass and assign nearest camp
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      const offlineRes = queueOfflineEvacuee(payload);
      setSubmissionResult(offlineRes);
      saveFamilyPass({
        id: offlineRes.evacueeId || `pass-${Date.now()}`,
        name: payload.name,
        familySize: payload.familySize,
        assignedShelterName: offlineRes.assignedShelterName,
        assignedShelterId: offlineRes.assignedShelterId,
        voucherCode: offlineRes.voucherCode,
        qrCode: offlineRes.voucherCode,
        distanceKm: offlineRes.distanceKm,
        isOffline: true,
      });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("evacore_persona", "evacuee");
        } catch {}
        window.dispatchEvent(new CustomEvent("evacuee-registered"));
      }
      toast?.({
        type: "success",
        message: `Offline pass generated: Routed to nearest camp (${offlineRes.assignedShelterName})!`,
      });
      setSubmitting(false);
      return;
    }

    try {
      let data;
      if (onSubmit) {
        data = await onSubmit(payload);
      } else {
        const res = await fetch("/api/register-evacuee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned status ${res.status}`);
        }

        data = await res.json();
      }

      setSubmissionResult(data);

      saveFamilyPass({
        id: data?.evacueeId || `pass-${Date.now()}`,
        name: payload.name,
        familySize: payload.familySize,
        assignedShelterName: data?.assignedShelterName || (data?.voucherCode ? "Emergency Relief Goods Pass" : null),
        assignedShelterId: data?.assignedShelterId,
        voucherCode: data?.voucherCode,
        qrCode: data?.voucherCode || data?.evacueeId,
        distanceKm: data?.distanceKm,
        reunificationMatches: data?.reunificationMatches || [],
      });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("evacore_persona", "evacuee");
        } catch {}
        window.dispatchEvent(new CustomEvent("evacuee-registered"));
      }
      onRegistered?.();

      if (data?.voucherCode) {
        saveVoucherToLocalVault({
          code: data.voucherCode,
          evacueeName: payload.name,
          status: "active",
          value: "Standard Relief Ration",
        });
        toast?.({
          type: "warning",
          message: "Nearby shelters are at full capacity. Relief ration voucher issued!",
        });
      } else if (data?.assignedShelterId || data?.assignedShelterName) {
        toast?.({
          type: "success",
          message: `Matched to nearest camp: ${data.assignedShelterName || "shelter"}.`,
        });
      } else {
        toast?.({ type: "success", message: t("successToast", "Registration submitted successfully!") });
      }
    } catch (err) {
      console.warn("Evacuee registration submit network error, generating offline pass:", err);
      const isNetwork = err?.name === "TypeError" || err?.message?.includes("fetch");
      if (isNetwork) {
        const offlineRes = queueOfflineEvacuee(payload);
        setSubmissionResult(offlineRes);
        saveFamilyPass({
          id: offlineRes.evacueeId || `off-${Date.now()}`,
          name: payload.name,
          familySize: payload.familySize,
          assignedShelterName: "Emergency Relief Ration Pass",
          voucherCode: offlineRes.voucherCode,
          qrCode: offlineRes.voucherCode,
          isOffline: true,
        });
        onRegistered?.();
        toast?.({
          type: "warning",
          message: "Network unavailable. Emergency Relief QR Pass generated and saved to offline queue.",
        });
        return;
      }

      const errorMsg = err?.message || "Registration failed. Your entered data has been preserved. Please try again.";
      setSubmitError(errorMsg);
      toast?.({ type: "error", message: errorMsg });
    } finally {
      setSubmitting(false);
    }
  }

  const handleApplySample = useCallback((sampleText) => {
    setFreeText(sampleText);
    const instant = instantClientExtract(sampleText);
    if (instant) {
      applyInstantFields(instant);
      toast?.({ type: "success", message: "Sample loaded & form fields auto-filled!" });
    }
  }, [applyInstantFields, toast]);

  function handleReset() {
    stopVoiceGuidance();
    setIsSpeaking(false);
    spokenResultRef.current = null;
    setForm(INITIAL);
    setErrors({});
    setTouched({});
    setFreeText("");
    setAiFilled({});
    setAiErrorMsg("");
    setSubmitError("");
    setSubmissionResult(null);
  }

  /* ────────────────────────────────────────────
     Result States (Section 10.6)
     ──────────────────────────────────────────── */

  if (submissionResult) {
    const isNoCapacity = submissionResult.flag === "no_capacity" || (!submissionResult.assignedShelterId && !submissionResult.assignedShelterName);
    const qrCode = submissionResult.voucherCode || submissionResult.evacueeId || "PASS-" + Date.now();

    return (
      <div className="space-y-4 animate-fade-in text-center max-w-sm mx-auto">
        {/* ── Audio Voice Guidance Bar & Manual Controls ── */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F4EF] border border-[#E4DCCC] text-left">
          <div className="flex items-center gap-2">
            {isSpeaking ? (
              <span className="inline-flex items-center gap-1.5 text-[#0284C7] font-semibold text-xs animate-fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0284C7] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0284C7]" />
                </span>
                <span>Playing Voice Guidance…</span>
              </span>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-[#7A7268]">
                <svg className="w-3.5 h-3.5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                <span>Voice Guidance</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (isSpeaking) {
                stopVoiceGuidance();
                setIsSpeaking(false);
              } else {
                speakConfirmation(submissionResult);
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-white border border-[#E4DCCC] text-[11px] font-bold text-[#1C1917] hover:border-[#FF5A1F] hover:text-[#FF5A1F] transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
          >
            {isSpeaking ? (
              <>
                <svg className="w-3 h-3 text-[#DC2626]" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                <span>Stop Voice</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Replay Voice</span>
              </>
            )}
          </button>
        </div>

        {/* Hazard Blocked Route Warning (Step F7) */}
        {submissionResult.hazardBlocked && (
          <div className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-left space-y-1 animate-fade-in shadow-xs">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <svg className="w-4 h-4 text-[#D97706] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>Caution: Road Hazard Reported On Route</span>
            </div>
            <p className="text-[11px] text-[#B45309] leading-snug">
              The route to this shelter may be affected by a reported road hazard. Consider an alternate route if possible.
            </p>
          </div>
        )}

        {/* Status Notice */}
        {isNoCapacity ? (
          <div className="result-card result-card-warn text-left space-y-1.5">
            <div className="flex items-center gap-2 text-[#D97706] font-bold text-xs font-display">
              <svg className="w-4 h-4 text-[#D97706] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>Regional Shelters At Full Capacity</span>
            </div>
            <p className="text-[11px] text-[#1C1917] leading-relaxed">
              No empty shelter capacity was found in this sector. You have been issued an official <strong>Emergency Relief Ration Pass</strong> with digital QR code.
            </p>
          </div>
        ) : (
          <div className="card-base p-4 shadow-sm text-left border-[#16A34A]/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E7F6EC] text-[#16A34A] flex items-center justify-center font-bold shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <span className="badge badge-ok text-[9px] py-0.5">Verified Available Shelter</span>
                  <h2 className="text-sm font-bold font-display text-[#1C1917]">
                    {submissionResult.assignedShelterName || "Regional Relief Facility"}
                  </h2>
                </div>
              </div>
            </div>

            {/* Quick Metrics & Capacity */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-[#F7F4EF] border border-[#E4DCCC] space-y-0.5">
                <span className="text-[10.5px] text-[#7A7268]">Capacity Status</span>
                <div className="font-bold text-[#166534] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                  {submissionResult.assignedShelterCapacity
                    ? `${submissionResult.assignedShelterCapacity - (submissionResult.assignedShelterOccupancy || 0)} Slots Available`
                    : "Space Available"}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-[#F7F4EF] border border-[#E4DCCC] space-y-0.5">
                <span className="text-[10.5px] text-[#7A7268]">Distance & Road ETA</span>
                <div className="font-bold text-[#FF5A1F]">
                  {submissionResult.distanceKm ? `~${submissionResult.distanceKm} km` : "Nearby"}
                  {submissionResult.durationSeconds ? ` (~${Math.round(submissionResult.durationSeconds / 60)} min)` : ""}
                </div>
              </div>
            </div>

            {/* Action Buttons: Directions & Call Hotline */}
            <div className="flex items-center gap-2 pt-1">
              {submissionResult.assignedShelterLat && submissionResult.assignedShelterLng && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${submissionResult.assignedShelterLat},${submissionResult.assignedShelterLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-[#FF5A1F] text-white text-center font-bold text-xs shadow-xs hover:bg-[#E04B14] transition-all flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.814c-.317-.159-.69-.159-1.006 0L3.622 6.251C3.24 6.442 3 6.832 3 7.258v12.361c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                  <span>Start Navigation</span>
                </a>
              )}

              {submissionResult.assignedShelterContact && (
                <a
                  href={`tel:${submissionResult.assignedShelterContact}`}
                  className="py-2 px-3 rounded-xl bg-white border border-[#E4DCCC] text-[#1C1917] hover:text-[#FF5A1F] text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <span>Call Camp</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Reunification match banner if found */}
        {submissionResult.reunificationMatches && submissionResult.reunificationMatches.length > 0 && (
          <div className="rounded-xl border border-[#7C3AED]/30 bg-[#EFE7FC] p-3 space-y-1.5 animate-fade-in text-left">
            <div className="flex items-center gap-1.5 text-[#7C3AED] font-bold text-xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <span>Family Reunification Match Identified!</span>
            </div>
            {submissionResult.reunificationMatches.map((m, idx) => (
              <div key={idx} className="text-[11px] text-[#1C1917] bg-white/70 p-2 rounded-lg space-y-0.5">
                <div className="font-semibold text-[#7C3AED]">{m.relationship || "Match found"}</div>
                <div>Location: <strong>{m.shelterName || "Relief Facility"}</strong></div>
                {m.contactNumber && (
                  <div className="text-[10px] text-[#78716C] font-mono">Coordinator Contact: {m.contactNumber}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Live Best-Route Navigation Map (Step F19 & F20) ── */}
        {!isNoCapacity && (
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-display text-[#1C1917] flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.814c-.317-.159-.69-.159-1.006 0L3.622 6.251C3.24 6.442 3 6.832 3 7.258v12.361c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
                <span>Live Safe Evacuation Route</span>
              </h3>
              <span className="text-[10px] font-mono text-[#7A7268]">Real-Time GPS Routing</span>
            </div>

            <div className="h-56 rounded-2xl overflow-hidden border border-[#E4DCCC] shadow-xs">
              <ShelterMap
                shelters={[{
                  id: submissionResult.assignedShelterId || "assigned",
                  name: submissionResult.assignedShelterName || "Assigned Relief Camp",
                  lat: submissionResult.assignedShelterLat || (form.lat ? parseFloat(form.lat) + 0.015 : 22.585),
                  lng: submissionResult.assignedShelterLng || (form.lng ? parseFloat(form.lng) + 0.015 : 88.375),
                  currentOccupancy: submissionResult.assignedShelterOccupancy || 85,
                  totalCapacity: submissionResult.assignedShelterCapacity || 400,
                  status: "approved",
                }]}
                routeGeometry={submissionResult.routeGeometry}
                fallbackRouteCoords={[
                  [parseFloat(form.lat) || 22.5726, parseFloat(form.lng) || 88.3639],
                  [
                    submissionResult.assignedShelterLat || (parseFloat(form.lat) || 22.5726) + 0.015,
                    submissionResult.assignedShelterLng || (parseFloat(form.lng) || 88.3639) + 0.015,
                  ],
                ]}
                hazardBlocked={submissionResult.hazardBlocked}
                trackUserLocation={true}
              />
            </div>
          </div>
        )}

        {/* ── Opt-in Live Location Sharing Toggle (Step F21) ── */}
        <div className="p-3.5 rounded-2xl bg-[#F7F4EF] border border-[#E4DCCC] text-left space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[#1C1917]">
                Share my live location with rescue teams
              </div>
              <div className="text-[11px] text-[#7A7268] leading-tight">
                Lets district responders find you if you need help - you can turn this off anytime.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isSharingLocation}
              onClick={() => setIsSharingLocation(!isSharingLocation)}
              className={`
                w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer p-0.5
                ${isSharingLocation ? "bg-[#16A34A]" : "bg-[#D6CEBF]"}
              `}
            >
              <span
                className={`
                  block w-5 h-5 rounded-full bg-white shadow-xs transition-transform
                  ${isSharingLocation ? "translate-x-5" : "translate-x-0"}
                `}
              />
            </button>
          </div>

          {isSharingLocation && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#16A34A] pt-1 border-t border-[#E4DCCC]/70 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]" />
              </span>
              <span>Live GPS telemetry beacon active (updating every 60s)</span>
            </div>
          )}
        </div>

        {/* ALWAYS RENDER QR CODE PASS */}
        <VoucherDisplay
          code={qrCode}
          expiresAt={submissionResult.expiresAt}
        />

        <div className="pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/?tab=camps"
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 no-underline active:scale-95 transition-all select-none"
            >
              <svg className="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M3 20l9-16 9 16M12 4v16M8.5 20l3.5-7 3.5 7" />
              </svg>
              <span>View Relief Camps</span>
            </Link>

            <Link
              href="/"
              className="py-2.5 px-3 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 no-underline active:scale-95 transition-all select-none"
            >
              <svg className="w-4 h-4 text-stone-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              <span>Disaster Grid</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="btn-outline w-full text-xs"
          >
            + Register Another Evacuee
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Network / Submit Error Alert */}
      {submitError && (
        <div className="rounded-2xl border border-[#DC2626]/30 bg-[#FBE7E5] p-3 text-xs text-[#DC2626] flex items-start gap-2 animate-fade-in">
          <svg className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="leading-snug">{submitError}</p>
        </div>
      )}

      {/* ── Mode Switcher Tab Bar ── */}
      <div className="flex p-1.5 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] shadow-xs">
        <button
          type="button"
          onClick={() => setIntakeMode("express")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold font-display transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            intakeMode === "express"
              ? "bg-white text-[#FF5A1F] shadow-xs"
              : "text-[#78716C] hover:text-[#1C1917]"
          }`}
        >
          <svg className="w-4 h-4 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <span>Express AI Voice & Text</span>
        </button>

        <button
          type="button"
          onClick={() => setIntakeMode("stepbystep")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold font-display transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            intakeMode === "stepbystep"
              ? "bg-white text-[#FF5A1F] shadow-xs"
              : "text-[#78716C] hover:text-[#1C1917]"
          }`}
        >
          <svg className="w-4 h-4 text-[#78716C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Step-by-Step Form</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════
          MODE 1: EXPRESS AI VOICE & TEXT INTAKE
         ═══════════════════════════════════════ */}
      {intakeMode === "express" ? (
        <div className="rounded-3xl bg-white border border-[#E5DCCE] p-5 sm:p-6 space-y-4 shadow-sm">
          {/* Header row with Language Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5DCCE]/60">
            <div>
              <h2 className="text-xs font-bold font-display text-[#1C1917] uppercase tracking-wider">
                Fast Voice or Natural Language Intake
              </h2>
              <p className="text-[11px] text-[#78716C] mt-0.5">
                Speak or type in any language. Our client AI parses details instantly.
              </p>
            </div>

            {/* Language Pills */}
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E5DCCE] text-[10.5px] font-bold">
              <button
                type="button"
                onClick={() => setVoiceLang("hi-IN")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  voiceLang === "hi-IN" ? "bg-[#FF5A1F] text-white shadow-xs" : "text-[#78716C] hover:text-[#1C1917]"
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setVoiceLang("bn-IN")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  voiceLang === "bn-IN" ? "bg-[#FF5A1F] text-white shadow-xs" : "text-[#78716C] hover:text-[#1C1917]"
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setVoiceLang("en-IN")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  voiceLang === "en-IN" ? "bg-[#FF5A1F] text-white shadow-xs" : "text-[#78716C] hover:text-[#1C1917]"
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Textarea + Voice Microphone */}
          <div className="relative">
            <textarea
              value={freeText}
              onChange={(e) => {
                const val = e.target.value;
                setFreeText(val);
                if (val.trim()) {
                  const instant = instantClientExtract(val);
                  if (instant) {
                    const filledKeys = {};
                    setForm((prev) => {
                      const next = { ...prev };
                      if (instant.name) { next.name = instant.name; filledKeys.name = true; }
                      if (instant.familySize) { next.familySize = instant.familySize; filledKeys.familySize = true; }
                      if (instant.missingFamilyMemberName) {
                        next.missingFamilyMemberName = instant.missingFamilyMemberName;
                        filledKeys.missingFamilyMemberName = true;
                      }
                      if (instant.specialNeeds && instant.specialNeeds.length > 0) {
                        next.specialNeeds = Array.from(new Set([...next.specialNeeds, ...instant.specialNeeds]));
                        filledKeys.specialNeeds = true;
                      }
                      return next;
                    });
                    setAiFilled((p) => ({ ...p, ...filledKeys }));
                    setErrors({});
                  }
                }
              }}
              placeholder="e.g. 'I am Amit Roy with 4 family members in Howrah near AC Market, my elderly mother needs wheelchair access...'"
              rows={3}
              disabled={aiLoading}
              className="
                w-full px-4 py-3.5 pr-14 text-xs sm:text-sm rounded-2xl resize-none
                bg-[#FAF8F5] text-[#1C1917] placeholder-[#A8A29E]
                border border-[#E5DCCE] outline-none transition-all shadow-inner
                focus:bg-white focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/15
                disabled:opacity-50
              "
            />

            {/* Voice Mic Button */}
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              disabled={aiLoading}
              className={`
                absolute right-3.5 top-3.5 p-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95
                ${listening
                  ? "bg-[#DC2626] text-white animate-pulse"
                  : "bg-white hover:bg-[#FFE9DC] text-[#78716C] hover:text-[#FF5A1F] border border-[#E5DCCE]"
                }
              `}
              title={listening ? "Stop voice recording" : "Speak to AI"}
              aria-label={listening ? "Stop voice recording" : "Speak to AI"}
            >
              {listening ? (
                <div className="w-4 h-4 rounded-xs bg-white" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 01-14 0v-1" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          </div>

          {/* KokonutUI AI Audio Waveform Equalizer & Voice Intake Controller */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#FAF8F5] to-white border border-[#E5DCCE] shadow-inner">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${listening ? "bg-red-500 animate-ping" : "bg-emerald-500"}`} />
                {listening ? "Capturing Acoustic Voice Telemetry..." : "Voice Guidance & Speech Intake"}
              </span>
              <span className="text-[10px] font-mono text-stone-500">
                {listening ? "Recording in Real-Time" : "Tap Mic to Speak"}
              </span>
            </div>
            <AI_Voice
              isRecording={listening}
              onListeningToggle={(nextState) => {
                if (nextState) {
                  startListening();
                } else {
                  stopListening();
                }
              }}
              className="py-1"
            />
          </div>

          <div className="relative">
            {/* Auto-Fill Toolbar */}
            <div className="flex items-center justify-between gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  if (!freeText.trim()) {
                    toast?.({ type: "info", message: "Type or speak your details first, or click a sample below!" });
                    return;
                  }
                  const instant = instantClientExtract(freeText);
                  if (instant) {
                    applyInstantFields(instant);
                    toast?.({ type: "success", message: "Details parsed & form auto-filled successfully!" });
                  } else {
                    triggerFastAIExtract(freeText);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E04B14] text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span>✨ Auto-Fill Form from Text</span>
              </button>

              {freeText && (
                <button
                  type="button"
                  onClick={() => setFreeText("")}
                  className="text-[11px] text-[#78716C] hover:text-[#DC2626] font-medium transition-colors cursor-pointer px-2 py-1"
                >
                  Clear text
                </button>
              )}
            </div>
          </div>

          {/* Quick One-Tap Sample Prompts */}
          <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE]/70 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#78716C]">
              <span className="uppercase tracking-wider">Quick Natural Language Samples (1-Tap Auto-Fill):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleApplySample("मेरा नाम राहुल शर्मा है, हम 4 लोग हैं और मेरी माँ को व्हीलचेयर चाहिए")}
                className="p-2 rounded-xl bg-white hover:bg-[#FFE9DC] border border-[#E5DCCE] text-left text-[11px] transition-all cursor-pointer shadow-2xs active:scale-98 flex items-start gap-2"
              >
                <span className="text-sm shrink-0">🇮🇳</span>
                <div className="min-w-0">
                  <span className="font-bold text-[#FF5A1F] block">हिन्दी (Hindi)</span>
                  <span className="text-[#78716C] line-clamp-1">&quot;मेरा नाम राहुल शर्मा, 4 लोग, व्हीलचेयर चाहिए&quot;</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplySample("আমার নাম অমিত রায়, আমরা ৫ জন আছি আর দিদার ইনসুলিন লাগবে")}
                className="p-2 rounded-xl bg-white hover:bg-[#FFE9DC] border border-[#E5DCCE] text-left text-[11px] transition-all cursor-pointer shadow-2xs active:scale-98 flex items-start gap-2"
              >
                <span className="text-sm shrink-0">🇧🇩</span>
                <div className="min-w-0">
                  <span className="font-bold text-[#FF5A1F] block">বাংলা (Bengali)</span>
                  <span className="text-[#78716C] line-clamp-1">&quot;আমার নাম অমিত রায়, ৫ জন, দিদার ইনসুলিন লাগবে&quot;</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplySample("I am Sunil Sen with 3 family members and an infant baby near Howrah")}
                className="p-2 rounded-xl bg-white hover:bg-[#FFE9DC] border border-[#E5DCCE] text-left text-[11px] transition-all cursor-pointer shadow-2xs active:scale-98 flex items-start gap-2"
              >
                <span className="text-sm shrink-0">🇬🇧</span>
                <div className="min-w-0">
                  <span className="font-bold text-[#FF5A1F] block">English</span>
                  <span className="text-[#78716C] line-clamp-1">&quot;I am Sunil Sen with 3 family members, infant baby&quot;</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleApplySample("Priya Das, 2 people, my brother Rohan is missing in flood")}
                className="p-2 rounded-xl bg-white hover:bg-[#FFE9DC] border border-[#E5DCCE] text-left text-[11px] transition-all cursor-pointer shadow-2xs active:scale-98 flex items-start gap-2"
              >
                <span className="text-sm shrink-0">🔍</span>
                <div className="min-w-0">
                  <span className="font-bold text-[#FF5A1F] block">Missing Person Match</span>
                  <span className="text-[#78716C] line-clamp-1">&quot;Priya Das, 2 people, brother Rohan is missing&quot;</span>
                </div>
              </button>
            </div>
          </div>

          {/* Voice Listening Waveform */}
          {listening && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FEF2F2] border border-[#DC2626]/30 text-xs font-semibold text-[#DC2626] animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DC2626] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DC2626]" />
                </span>
                <span>Listening ({recordingSeconds}s)…</span>
                <div className="flex items-end gap-0.5 h-3 ml-1">
                  <span className="w-1 bg-[#DC2626] rounded-full animate-bounce h-2" />
                  <span className="w-1 bg-[#DC2626] rounded-full animate-bounce h-3 delay-75" />
                  <span className="w-1 bg-[#DC2626] rounded-full animate-bounce h-1.5 delay-150" />
                </div>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="px-3 py-1 rounded-xl bg-[#DC2626] text-white text-xs font-bold cursor-pointer hover:bg-[#B91C1C]"
              >
                Done
              </button>
            </div>
          )}

          {/* KokonutUI AI Voice Intake Loading State */}
          {aiLoading && (
            <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#E5DCCE] shadow-xs animate-fade-in">
              <AILoadingState
                sequences={[
                  {
                    status: "Transcribing AI Voice Speech",
                    lines: [
                      "Capturing acoustic speech wave telemetry...",
                      "Filtering ambient disaster rain & wind noise...",
                      "Routing audio stream to Gemini 2.0 Flash...",
                      "Analyzing multi-lingual phonemes (Bengali/Hindi/English)...",
                      "Extracting head of household identity...",
                    ],
                  },
                  {
                    status: "Extracting Family & Medical Needs",
                    lines: [
                      "Parsing total family member count...",
                      "Detecting elderly & infant vulnerability tags...",
                      "Triaging emergency medical & wheelchair needs...",
                      "Checking missing family member search database...",
                      "Auto-filling verified disaster registration fields...",
                    ],
                  },
                  {
                    status: "Calibrating Safe Evacuation Corridor",
                    lines: [
                      "Locating nearest non-flooded relief shelter...",
                      "Generating offline cryptographic QR relief voucher...",
                      "Syncing records to offline emergency cache...",
                      "Finalizing family intake dossier...",
                    ],
                  },
                ]}
              />
            </div>
          )}

          {/* ── Live Smart Relief Pass Preview Card (Clean Boarding Pass Style) ── */}
          {(form.name || form.familySize || form.specialNeeds.length > 0) && (
            <div className="p-4 rounded-2xl bg-[#F0FDF4] border-2 border-[#16A34A]/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold font-display text-[#166534]">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
                  <span>Live Extracted Relief Pass</span>
                </div>
                <span className="text-[10px] font-mono text-[#16A34A] bg-white px-2 py-0.5 rounded-full border border-[#16A34A]/30">
                  Ready to Issue
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-white border border-[#16A34A]/20">
                  <span className="text-[10px] text-[#78716C] block">Head of Family</span>
                  <span className="font-bold text-[#1C1917] truncate block">{form.name || "Pending..."}</span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-[#16A34A]/20">
                  <span className="text-[10px] text-[#78716C] block">Headcount</span>
                  <span className="font-bold text-[#1C1917] block font-mono">{form.familySize ? `${form.familySize} Members` : "1 Member"}</span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-[#16A34A]/20">
                  <span className="text-[10px] text-[#78716C] block">Special Care</span>
                  <span className="font-bold text-[#FF5A1F] block truncate capitalize">
                    {form.specialNeeds.length > 0 ? form.specialNeeds.join(", ") : "Standard"}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-[#16A34A]/20">
                  <span className="text-[10px] text-[#78716C] block">GPS Corridor</span>
                  <span className="font-bold text-[#16A34A] block truncate font-mono">
                    {form.lat && form.lng ? "Locked (Howrah)" : "Acquiring..."}
                  </span>
                </div>
              </div>

              {/* Express Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 px-4 rounded-2xl bg-[#FF5A1F] hover:bg-[#E04B14] text-white font-bold font-display text-xs sm:text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    <span>Allocating Nearest Safe Shelter…</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Generate Family Relief Pass</span>
                    <span className="text-base">→</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIntakeMode("stepbystep")}
                  className="text-xs text-[#78716C] hover:text-[#FF5A1F] font-medium transition-colors cursor-pointer"
                >
                  Need to review or change details? Open in Step-by-Step Form →
                </button>
              </div>
            </div>
          )}

          {/* Quick Fallback Note */}
          {!form.name && !form.familySize && (
            <div className="text-center py-2">
              <span className="text-xs text-[#78716C]">
                Prefer to fill a standard form?{" "}
                <button
                  type="button"
                  onClick={() => setIntakeMode("stepbystep")}
                  className="text-[#FF5A1F] font-bold hover:underline cursor-pointer"
                >
                  Switch to Step-by-Step Form
                </button>
              </span>
            </div>
          )}
        </div>
      ) : (
        /* ═══════════════════════════════════════
            MODE 2: STEP-BY-STEP FORM (DE-CLUSTERED)
           ═══════════════════════════════════════ */
        <form onSubmit={handleSubmit} noValidate className="space-y-4 animate-fade-in">
          {/* Card 1: Family Household */}
          <div className="rounded-3xl bg-white border border-[#E5DCCE] p-5 sm:p-6 space-y-4 shadow-sm">
            <h2 className="text-xs font-bold font-display text-[#1C1917] uppercase tracking-wider pb-2 border-b border-[#E5DCCE]/60">
              1. Family Household & Contact
            </h2>

            {/* Full Name */}
            <Field
              label={t("fullName", "Head of Household (Full Name)")}
              name="name"
              type="text"
              placeholder="e.g. Sunita Sharma"
              value={form.name}
              error={touched.name && errors.name}
              onChange={handleChange}
              onBlur={handleBlur}
              aiBadge={aiFilled.name}
              aiBadgeText={t("aiSuggested", "AI-suggested")}
              required
            />

            {/* Family Headcount Stepper */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE]">
              <div>
                <span className="text-xs font-bold text-[#1C1917] block font-display">
                  {t("familySize", "Total Family Members")} <span className="text-[#DC2626]">*</span>
                </span>
                <span className="text-[10.5px] text-[#78716C]">
                  Total headcount needing shelter beds & food rations
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(1, (Number(form.familySize) || 1) - 1).toString();
                    setForm((p) => ({ ...p, familySize: next }));
                    setTouched((p) => ({ ...p, familySize: true }));
                  }}
                  className="w-8 h-8 rounded-xl bg-white border border-[#E5DCCE] hover:border-[#FF5A1F] text-[#1C1917] font-bold text-sm flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
                >
                  -
                </button>
                <span className="text-sm sm:text-base font-bold font-mono text-[#1C1917] w-8 text-center">
                  {form.familySize || "1"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = ((Number(form.familySize) || 1) + 1).toString();
                    setForm((p) => ({ ...p, familySize: next }));
                    setTouched((p) => ({ ...p, familySize: true }));
                  }}
                  className="w-8 h-8 rounded-xl bg-white border border-[#E5DCCE] hover:border-[#FF5A1F] text-[#1C1917] font-bold text-sm flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Special Needs & Accommodations */}
          <div className="rounded-3xl bg-white border border-[#E5DCCE] p-5 sm:p-6 space-y-3.5 shadow-sm">
            <h2 className="text-xs font-bold font-display text-[#1C1917] uppercase tracking-wider pb-2 border-b border-[#E5DCCE]/60">
              2. Special Accommodations & Vulnerabilities
            </h2>

            <p className="text-[11px] text-[#78716C]">
              Select any requirements so relief dispatch assigns accessible shelter beds.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPECIAL_NEEDS_CONFIG.map((opt) => {
                const selected = form.specialNeeds.includes(opt.value);
                const label = t(opt.key, opt.defaultLabel);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleSpecialNeed(opt.value)}
                    className={`
                      flex items-center gap-2 p-3 text-xs font-medium rounded-2xl border transition-all cursor-pointer text-left
                      ${selected
                        ? "bg-[#FFF2EA] border-2 border-[#FF5A1F] text-[#C7420F] font-bold shadow-xs"
                        : "bg-[#FAF8F5] border-[#E5DCCE] text-[#78716C] hover:bg-[#F2EDE4]"
                      }
                    `}
                  >
                    <span className={selected ? "text-[#FF5A1F]" : "text-[#78716C]"}>{opt.icon}</span>
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Location & Missing Relatives */}
          <div className="rounded-3xl bg-white border border-[#E5DCCE] p-5 sm:p-6 space-y-4 shadow-sm">
            <h2 className="text-xs font-bold font-display text-[#1C1917] uppercase tracking-wider pb-2 border-b border-[#E5DCCE]/60">
              3. Current Location & Family Reunification
            </h2>

            {/* Clean Location Row */}
            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#1C1917] block font-display">
                  Emergency Rescue Coordinates <span className="text-[#DC2626]">*</span>
                </span>
                {form.lat && form.lng ? (
                  <span className="text-[10.5px] text-[#16A34A] font-mono font-medium block truncate">
                    ✓ Connected: {form.lat}, {form.lng}
                  </span>
                ) : (
                  <span className="text-[10.5px] text-[#78716C] block truncate">
                    Tap to auto-detect nearest emergency camp
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleGeo}
                disabled={geoLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold font-display bg-[#FF5A1F] hover:bg-[#E04B14] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {geoLoading ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    <span>Detecting…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="4" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                    </svg>
                    <span>{form.lat && form.lng ? "Re-detect" : "Detect GPS"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Sector Selector Pills (Ensures instant 1-tap lock even if hardware GPS is blocked) */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-[#78716C] font-mono block">
                Or tap your nearest relief sector:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Howrah Hub", lat: 22.5726, lng: 88.3639 },
                  { name: "Park Circus", lat: 22.5390, lng: 88.3650 },
                  { name: "Salt Lake", lat: 22.5850, lng: 88.4100 },
                  { name: "South 24 Pgs", lat: 22.3500, lng: 88.4000 },
                ].map((s) => {
                  const isSelected = Number(form.lat) === s.lat && Number(form.lng) === s.lng;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, lat: s.lat, lng: s.lng }));
                        setTouched((prev) => ({ ...prev, lat: true, lng: true }));
                        setErrors((prev) => { const c = { ...prev }; delete c.lat; delete c.lng; return c; });
                        toast?.({ type: "success", message: `Sector locked: ${s.name}` });
                      }}
                      className={`text-[10.5px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#FFE9DC] border-[#FF5A1F] text-[#C7420F] font-bold shadow-xs"
                          : "bg-white border-[#E5DCCE] text-[#78716C] hover:text-[#1C1917]"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Manual Coordinates Accordion Toggle */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowManualCoords(!showManualCoords)}
                className="text-[10.5px] text-[#78716C] hover:text-[#FF5A1F] font-medium transition-colors cursor-pointer"
              >
                {showManualCoords ? "Hide manual coordinates" : "Need to enter exact latitude/longitude?"}
              </button>
            </div>

            {showManualCoords && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in">
                <Field
                  label="Latitude"
                  name="lat"
                  type="number"
                  step="any"
                  placeholder="22.5726"
                  value={form.lat}
                  error={touched.lat && errors.lat}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                <Field
                  label="Longitude"
                  name="lng"
                  type="number"
                  step="any"
                  placeholder="88.3639"
                  value={form.lng}
                  error={touched.lng && errors.lng}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
              </div>
            )}

            {/* Optional Missing Relative Accordion */}
            <div className="pt-2 border-t border-[#E5DCCE]/60">
              <button
                type="button"
                onClick={() => setShowMissingRelative(!showMissingRelative)}
                className="w-full py-2 text-xs font-semibold text-[#78716C] hover:text-[#FF5A1F] flex items-center justify-between cursor-pointer transition-colors"
              >
                <span>+ Searching for a Missing Family Member? (Optional)</span>
                <span className="text-sm">{showMissingRelative ? "−" : "+"}</span>
              </button>

              {showMissingRelative && (
                <div className="pt-2 space-y-3 animate-fade-in">
                  <Field
                    label="Missing Person Full Name"
                    name="missingFamilyMemberName"
                    type="text"
                    placeholder="e.g. Rahul Roy"
                    value={form.missingFamilyMemberName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    hint="Cross-references all camp registers to facilitate family reunification."
                  />
                  <PhotoCaptureUpload
                    label="Missing Person Photo (For AI Multimodal Matching)"
                    hint="Attach a photo so AI can run facial and clothing recognition across all relief camp intakes & rescue sightings."
                    initialPhoto={form.missingPersonPhoto}
                    onPhotoCaptured={(photo) =>
                      setForm((prev) => ({ ...prev, missingPersonPhoto: photo }))
                    }
                  />

                  {/* KokonutUI Bell Notification Alert */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#166534] block">Reunification Dispatch Alert</span>
                      <span className="text-[11px] text-[#15803D] block leading-tight">Notify me immediately if this person is identified in any district relief shelter</span>
                    </div>
                    <BellToggle
                      offLabel="Enable Notification"
                      onLabel="Alerts Active"
                      defaultPressed={true}
                      count={1}
                      onChange={(isActive) => {
                        if (isActive) {
                          toast?.({ type: "success", message: "Reunification broadcast alert enabled for this contact!" });
                        }
                      }}
                      className="shrink-0 self-start sm:self-auto"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Optional Evacuee Headshot */}
            <div className="pt-1">
              <PhotoCaptureUpload
                label="Evacuee Headshot / Face Photo (Optional)"
                hint="Attached to your emergency relief pass for instant camp check-in & family verification."
                initialPhoto={form.evacueePhoto}
                onPhotoCaptured={(photo) =>
                  setForm((prev) => ({ ...prev, evacueePhoto: photo }))
                }
              />
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FF5A1F] hover:bg-[#E04B14] text-white font-bold font-display text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Allocating Nearest Safe Shelter…</span>
              </>
            ) : (
              <>
                <span>Submit Registration & Route to Shelter</span>
                <span className="text-base">→</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Field Helper Component
   ────────────────────────────────────────────── */

function Field({ label, name, error, required, aiBadge, aiBadgeText, hint, ...inputProps }) {
  const id = `evacuee-${name}`;
  return (
    <div className="w-full min-w-0">
      {label && (
        <div className="flex items-center justify-between mb-1 min-w-0">
          <label htmlFor={id} className="text-xs font-semibold text-[#1C1917] truncate">
            {label}
            {required && <span className="text-[#DC2626] ml-0.5">*</span>}
          </label>
          {aiBadge && <AIBadge badgeText={aiBadgeText} />}
        </div>
      )}
      <input
        id={id}
        name={name}
        {...inputProps}
        className={`form-input w-full min-w-0 ${error ? "border-[#DC2626] focus:ring-[#DC2626]/20" : ""}`}
      />
      {error && <p className="mt-1 text-[11px] text-[#DC2626] animate-fade-in break-words">{error}</p>}
      {hint && !error && <p className="mt-0.5 text-[10px] text-[#7A7268] break-words">{hint}</p>}
    </div>
  );
}

function AIBadge({ badgeText = "AI-suggested" }) {
  return (
    <span className="badge badge-flare text-[9px] py-0.5 animate-fade-in shrink-0">
      <svg className="w-2.5 h-2.5 mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
      {badgeText}
    </span>
  );
}
