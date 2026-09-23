"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * LanguageToggle component
 * Allows users to toggle between English, Hindi, and Bengali.
 * Can be rendered as a compact button group or a clean dropdown.
 *
 * @param {Object} props
 * @param {'pills' | 'dropdown'} [props.variant='pills']
 * @param {string} [props.className='']
 */
export default function LanguageToggle({ variant = "pills", className = "" }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleSelectLanguage = (langCode) => {
    setOpen(false);
    if (langCode === language) return;

    // 1. Update React LanguageContext
    setLanguage(langCode);

    // 2. Persist in cookie and localStorage for Next.js middleware & client
    try {
      document.cookie = `NEXT_LOCALE=${langCode}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem("app_language", langCode);
    } catch {}

    // 3. Compute target URL with new locale prefix
    const currentPath = pathname || (typeof window !== "undefined" ? window.location.pathname : "/");
    const segments = currentPath.split("/").filter(Boolean);

    if (segments.length > 0 && ["en", "hi", "bn"].includes(segments[0])) {
      segments[0] = langCode;
    } else {
      segments.unshift(langCode);
    }

    const newPath = "/" + segments.join("/");
    const search = typeof window !== "undefined" ? window.location.search : "";
    const targetUrl = newPath + search;

    // 4. Navigate cleanly so Next.js server & client load the dictionary seamlessly
    if (typeof window !== "undefined") {
      window.location.href = targetUrl;
    } else {
      router.push(targetUrl);
    }
  };

  if (variant === "dropdown") {
    const currentLang = supportedLanguages.find((l) => l.code === language) || supportedLanguages[0];

    return (
      <div className={`relative inline-block text-left shrink-0 ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="
            inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold
            bg-stone-100/90 hover:bg-stone-200/90 border border-stone-200
            text-stone-800 transition-all duration-200 cursor-pointer shadow-2xs shrink-0
          "
          aria-haspopup="true"
          aria-expanded={open}
          aria-label="Select Language"
        >
          <svg className="w-3.5 h-3.5 text-stone-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 000 20M12 2a14.5 14.5 0 010 20M2 12h20" />
          </svg>
          <span className="font-bold text-xs text-stone-800 uppercase font-mono">{currentLang.code}</span>
          <svg
            className={`w-3 h-3 text-stone-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div
            className="
              absolute right-0 top-full mt-1.5 w-36 rounded-xl bg-white/95 backdrop-blur-xl
              border border-stone-200 shadow-[0_12px_28px_-4px_rgba(0,0,0,0.12)] py-1.5 z-50 animate-fade-in
            "
          >
            {supportedLanguages.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`
                    w-full flex items-center justify-between px-3 py-1.5 text-xs text-left
                    transition-colors cursor-pointer
                    ${isSelected
                      ? "bg-orange-50 text-[#FF5A1F] font-bold"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                    }
                  `}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="text-[10px] font-mono uppercase text-stone-600 bg-stone-100 px-1 py-0.5 rounded border border-stone-200">
                      {lang.code}
                    </span>
                    <span>{lang.nativeName}</span>
                  </span>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Default: Segmented pills
  return (
    <div
      role="group"
      aria-label="Language selector"
      className={`inline-flex items-center p-0.5 rounded-xl bg-[#FAF8F5] border border-[#E2D7C3] ${className}`}
    >
      {supportedLanguages.map((lang) => {
        const isSelected = lang.code === language;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => handleSelectLanguage(lang.code)}
            aria-pressed={isSelected}
            title={lang.label}
            className={`
              px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer
              ${isSelected
                ? "bg-[#FF5A1F] text-white shadow-xs"
                : "text-[#78716C] hover:text-[#1C1917]"
              }
            `}
          >
            {lang.nativeName}
          </button>
        );
      })}
    </div>
  );
}
