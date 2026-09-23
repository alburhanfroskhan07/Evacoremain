"use client";

import { createContext, useContext, useState } from "react";
import { stopVoiceGuidance } from "./voice-guidance";

const VoiceContext = createContext({
  isMuted: false,
  toggleMute: () => {},
  isSpeaking: false,
  setIsSpeaking: () => {},
});

export function VoiceProvider({ children }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        stopVoiceGuidance();
        setIsSpeaking(false);
      }
      return next;
    });
  };

  return (
    <VoiceContext.Provider value={{ isMuted, toggleMute, isSpeaking, setIsSpeaking }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  return useContext(VoiceContext);
}
