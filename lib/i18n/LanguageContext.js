"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { dictionaries } from "./dictionaries";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeName: "English", short: "EN" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी", short: "हि" },
  { code: "bn", label: "Bengali", nativeName: "বাংলা", short: "বাং" },
];

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  dictionary: dictionaries.en,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export function LanguageProvider({ children, initialLocale = "en" }) {
  const [language, setLanguageState] = useState(initialLocale);

  // Sync state with initialLocale when route/page changes
  useEffect(() => {
    if (initialLocale && dictionaries[initialLocale]) {
      setLanguageState(initialLocale);
      document.documentElement.lang = initialLocale;
      try {
        localStorage.setItem("app_language", initialLocale);
      } catch {}
    }
  }, [initialLocale]);

  const setLanguage = (langCode) => {
    if (dictionaries[langCode]) {
      setLanguageState(langCode);
      try {
        localStorage.setItem("app_language", langCode);
        document.cookie = `NEXT_LOCALE=${langCode}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = langCode;
      } catch {
        // ignore
      }
    }
  };

  const dictionary = useMemo(() => {
    return dictionaries[language] || dictionaries.en;
  }, [language]);

  /**
   * Helper function to retrieve nested translation keys.
   * e.g., t('nav.dashboard') or t('evacuee.title')
   */
  const t = useMemo(() => {
    return (path, fallback) => {
      if (!path) return "";
      const keys = path.split(".");
      
      // Try current language dictionary first
      let current = dictionary;
      for (const key of keys) {
        if (current && typeof current === "object" && key in current) {
          current = current[key];
        } else {
          current = undefined;
          break;
        }
      }

      if (typeof current === "string") return current;

      // Fallback to English dictionary
      let fallbackCurrent = dictionaries.en;
      for (const key of keys) {
        if (fallbackCurrent && typeof fallbackCurrent === "object" && key in fallbackCurrent) {
          fallbackCurrent = fallbackCurrent[key];
        } else {
          fallbackCurrent = undefined;
          break;
        }
      }

      if (typeof fallbackCurrent === "string") return fallbackCurrent;

      return fallback !== undefined ? fallback : path;
    };
  }, [dictionary]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dictionary,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language state and translation function
 */
export function useLanguage() {
  return useContext(LanguageContext);
}

/**
 * next-intl compatible hook style
 * e.g. const t = useTranslations('evacuee');
 * t('title') -> resolves to t('evacuee.title')
 */
export function useTranslations(namespace) {
  const { t } = useLanguage();
  return (key, fallback) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return t(fullKey, fallback);
  };
}
