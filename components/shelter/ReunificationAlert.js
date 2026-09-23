"use client";

import { useState } from "react";
import { useTranslations } from "@/lib/i18n/LanguageContext";

/**
 * ReunificationAlert component
 * Dismissible banner shown on the coordinator dashboard when a family match is detected.
 *
 * @param {Object} props
 * @param {Object|null} props.match - Object containing match details
 * @param {string} props.match.evacueeName - Name of the registered person / missing family member
 * @param {string} props.match.matchedAtShelterName - Shelter name where the matching member was located
 * @param {string} [props.match.relationship] - Optional relationship (e.g. "Spouse", "Child", "Parent")
 * @param {string} [props.match.contactNumber] - Optional shelter/coordinator contact number
 * @param {string} [props.match.timestamp] - Optional time of detection
 * @param {Function} [props.onDismiss] - Callback when alert is dismissed
 * @param {Function} [props.onConfirm] - Callback when coordinator confirms reunion
 */
export default function ReunificationAlert({
  match,
  onDismiss,
  onConfirm,
  className = "",
}) {
  const [dismissed, setDismissed] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const t = useTranslations("reunification");
  const tCoord = useTranslations("coordinator");

  if (!match || dismissed) {
    return null;
  }

  const {
    evacueeName = "Family Member",
    matchedAtShelterName = "Neighboring Camp",
    relationship,
    contactNumber,
    timestamp,
  } = match;

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.(match);
  }

  function handleConfirm() {
    setActionDone(true);
    onConfirm?.(match);
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        relative overflow-hidden rounded-2xl border border-[#D97706]/40
        bg-gradient-to-r from-[#FFFBEB] via-[#FAF8F5] to-[#FFFFFF]
        p-4 sm:p-5 shadow-md shadow-[#D97706]/10 backdrop-blur-md
        animate-fade-in transition-all duration-300 ${className}
      `}
    >
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left icon + content */}
        <div className="flex items-start gap-3.5">
          {/* Badge Icon */}
          <div className="shrink-0 w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#D97706]/30 flex items-center justify-center text-[#D97706] shadow-xs">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-ping" />
                {t("alertBadge", "Family Reunification Match")}
              </span>
              {timestamp && (
                <span className="text-xs text-[#78716C] font-mono">
                  {timestamp}
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold font-display text-[#1C1917]">
              {t("title", "Possible Family Match Found!")}
            </h3>

            <p className="text-xs text-[#44403C] leading-relaxed max-w-2xl">
              <strong className="text-[#1C1917] font-semibold">{evacueeName}</strong>
              {relationship ? ` (${relationship})` : ""} was located and checked in at{" "}
              <strong className="text-[#1C1917] font-semibold">{matchedAtShelterName}</strong>.
            </p>

            {contactNumber && (
              <p className="text-xs text-[#78716C] pt-0.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span>{t("contact", "Shelter Contact")}:</span>{" "}
                <a
                  href={`tel:${contactNumber}`}
                  className="text-[#FF5A1F] hover:underline font-mono font-semibold"
                >
                  {contactNumber}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Right action buttons + dismiss */}
        <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto justify-end pt-2 sm:pt-0">
          {contactNumber && (
            <a
              href={`tel:${contactNumber}`}
              className="
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]
                hover:bg-[#FEF3C7] transition-colors cursor-pointer no-underline
              "
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              <span>{t("actionCall", "Call Shelter")}</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={actionDone}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              transition-colors cursor-pointer
              ${actionDone
                ? "bg-[#ECFDF3] text-[#16A34A] border border-[#BBF7D0] cursor-default"
                : "btn-primary text-xs py-1.5 px-3"
              }
            `}
          >
            {actionDone ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Reunited</span>
              </>
            ) : (
              <span>{tCoord("markReunited", "Mark Reunited")}</span>
            )}
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t("actionDismiss", "Dismiss")}
            title={t("actionDismiss", "Dismiss alert")}
            className="
              p-1.5 rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#F2ECE1]
              transition-colors cursor-pointer
            "
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
