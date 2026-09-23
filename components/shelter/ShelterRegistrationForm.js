"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Spinner from "@/components/ui/Spinner";
import TideGauge from "@/components/ui/TideGauge";
import { useTranslations } from "@/lib/i18n/LanguageContext";

/* ──────────────────────────────────────────────
   Validation helpers
   ────────────────────────────────────────────── */

function validate(f, t) {
  const errors = {};

  if (!f.name.trim()) errors.name = t("valNameRequired", "Shelter name is required.");

  if (f.lat === "" || f.lat === null || f.lat === undefined) {
    errors.lat = t("valLatRequired", "Latitude is required.");
  } else if (Number(f.lat) < -90 || Number(f.lat) > 90) {
    errors.lat = t("valLatRange", "Latitude must be between -90 and 90.");
  }

  if (f.lng === "" || f.lng === null || f.lng === undefined) {
    errors.lng = t("valLngRequired", "Longitude is required.");
  } else if (Number(f.lng) < -180 || Number(f.lng) > 180) {
    errors.lng = t("valLngRange", "Longitude must be between -180 and 180.");
  }

  if (!f.totalCapacity || Number(f.totalCapacity) <= 0) {
    errors.totalCapacity = t("valCapPositive", "Capacity must be a positive number.");
  }

  if (f.currentOccupancy === "" || f.currentOccupancy === null || f.currentOccupancy === undefined) {
    errors.currentOccupancy = t("valOccRequired", "Current occupancy is required.");
  } else if (Number(f.currentOccupancy) < 0) {
    errors.currentOccupancy = t("valOccNonNeg", "Occupancy cannot be negative.");
  } else if (f.totalCapacity && Number(f.currentOccupancy) > Number(f.totalCapacity)) {
    errors.currentOccupancy = t("valOccExceed", "Occupancy cannot exceed total capacity.");
  }

  if (!f.contactNumber.trim()) {
    errors.contactNumber = t("valContactRequired", "Contact number is required.");
  } else if (!/^[\d\s\-+()]{7,15}$/.test(f.contactNumber.trim())) {
    errors.contactNumber = t("valContactInvalid", "Enter a valid phone number.");
  }

  return errors;
}

const INITIAL = {
  name: "",
  lat: "",
  lng: "",
  totalCapacity: "",
  currentOccupancy: "",
  contactNumber: "",
};

export default function ShelterRegistrationForm({ onSubmit, toast }) {
  const t = useTranslations("shelter");
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const hasAutoLocatedRef = useRef(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  }

  function handleBlur(e) {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }

  const handleUseMyLocation = useCallback((silent = false) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      if (!silent) {
        toast?.({ type: "error", message: t("locationError", "Geolocation is not supported by your browser.") });
      }
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        }));
        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.lat;
          delete copy.lng;
          return copy;
        });
        setGeoLoading(false);
        if (!silent) {
          toast?.({ type: "success", message: t("locationDetected", "Location detected successfully.") });
        }
      },
      (err) => {
        setGeoLoading(false);
        if (!silent) {
          toast?.({
            type: "error",
            message: err.code === 1
              ? t("locationError", "Location permission denied. Please enter coordinates manually.")
              : t("locationError", "Could not detect location. Please enter coordinates manually."),
          });
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [t, toast]);

  /* Auto-detect real-time location once on initial mount (silent) */
  useEffect(() => {
    if (!hasAutoLocatedRef.current && typeof window !== "undefined" && navigator.geolocation) {
      hasAutoLocatedRef.current = true;
      handleUseMyLocation(true);
    }
  }, [handleUseMyLocation]);

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(form, t);
    setErrors(validationErrors);
    setTouched({ name: true, lat: true, lng: true, totalCapacity: true, currentOccupancy: true, contactNumber: true });

    if (Object.keys(validationErrors).length > 0) {
      toast?.({ type: "error", message: t("fixErrorsToast", "Please fix the highlighted errors.") });
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        totalCapacity: Number(form.totalCapacity),
        currentOccupancy: Number(form.currentOccupancy),
        contactNumber: form.contactNumber.trim(),
      });
      toast?.({ type: "success", message: t("successToast", "Shelter registered! It will appear on the map once approved.") });
      setForm(INITIAL);
      setTouched({});
      setErrors({});
    } catch (err) {
      toast?.({ type: "error", message: err?.message || "Failed to register shelter. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const cap = Number(form.totalCapacity) || 0;
  const occ = Number(form.currentOccupancy) || 0;
  const pct = cap > 0 && form.currentOccupancy !== "" ? Math.min(100, Math.round((occ / cap) * 100)) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* ── Shelter Name ── */}
      <Field
        label={t("nameLabel", "Shelter Name")}
        name="name"
        type="text"
        placeholder={t("namePlaceholder", "e.g. Salt Lake Community Hall")}
        value={form.name}
        error={touched.name && errors.name}
        onChange={handleChange}
        onBlur={handleBlur}
        required
      />

      {/* ── Location ── */}
      <div className="space-y-2 p-3 rounded-xl bg-[#F7F4EF] border border-[#E4DCCC] min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="text-xs font-semibold text-[#1C1917]">
            {t("locationLegend", "Location Coordinates")} <span className="text-[#DC2626]">*</span>
          </span>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            className="text-[11px] font-semibold text-[#FF5A1F] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            {geoLoading ? (
              <><Spinner size="sm" /> {t("detecting", "Detecting…")}</>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span>{t("useLocation", "Use My Location")}</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
          <Field
            label=""
            name="lat"
            type="number"
            step="any"
            placeholder={t("latPlaceholder", "Lat (e.g. 22.5726)")}
            value={form.lat}
            error={touched.lat && errors.lat}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
          <Field
            label=""
            name="lng"
            type="number"
            step="any"
            placeholder={t("lngPlaceholder", "Lng (e.g. 88.3639)")}
            value={form.lng}
            error={touched.lng && errors.lng}
            onChange={handleChange}
            onBlur={handleBlur}
            required
          />
        </div>
      </div>

      {/* ── Capacity + Occupancy ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-0">
        <Field
          label={t("capacityLabel", "Total Capacity")}
          name="totalCapacity"
          type="number"
          min="1"
          placeholder={t("capacityPlaceholder", "e.g. 200")}
          value={form.totalCapacity}
          error={touched.totalCapacity && errors.totalCapacity}
          onChange={handleChange}
          onBlur={handleBlur}
          required
        />
        <Field
          label={t("occupancyLabel", "Current Occupancy")}
          name="currentOccupancy"
          type="number"
          min="0"
          placeholder={t("occupancyPlaceholder", "e.g. 45")}
          value={form.currentOccupancy}
          error={touched.currentOccupancy && errors.currentOccupancy}
          onChange={handleChange}
          onBlur={handleBlur}
          required
        />
      </div>

      {/* ── Live Tide-Gauge Preview ── */}
      {pct !== null && (
        <div className="p-3 rounded-xl bg-[#F7F4EF] border border-[#E4DCCC] flex items-center justify-between min-w-0 animate-fade-in">
          <div className="min-w-0">
            <span className="text-[10px] text-[#7A7268] uppercase tracking-wider font-mono block truncate">
              {t("occupancyPreview", "Live Tide-Gauge Preview")}
            </span>
            <div className="text-sm font-bold font-display text-[#1C1917] mt-0.5">
              {occ} / {cap} beds ({pct}%)
            </div>
            <span className={`badge ${pct >= 95 ? "badge-crit" : pct >= 70 ? "badge-warn" : "badge-ok"} text-[9px] mt-1`}>
              {pct >= 95 ? "Full" : pct >= 70 ? "Filling" : "Available"}
            </span>
          </div>

          <div className="pr-2 shrink-0">
            <TideGauge occupancy={occ} capacity={cap} height={60} width={14} />
          </div>
        </div>
      )}

      {/* ── Contact Number ── */}
      <Field
        label={t("contactLabel", "Contact Number")}
        name="contactNumber"
        type="tel"
        placeholder={t("contactPlaceholder", "e.g. +91 98765 43210")}
        value={form.contactNumber}
        error={touched.contactNumber && errors.contactNumber}
        onChange={handleChange}
        onBlur={handleBlur}
        required
      />

      {/* ── Submit CTA ── */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full text-xs font-semibold mt-2"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Spinner size="sm" className="text-white" />
            <span>{t("submittingBtn", "Registering Shelter…")}</span>
          </div>
        ) : (
          <span>{t("submitBtn", "Register Shelter")}</span>
        )}
      </button>
    </form>
  );
}

function Field({ label, name, error, required, ...inputProps }) {
  const id = `field-${name}`;
  return (
    <div className="w-full min-w-0">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-[#1C1917] mb-1 truncate">
          {label}
          {required && <span className="text-[#DC2626] ml-0.5">*</span>}
        </label>
      )}
      <input
        id={id}
        name={name}
        {...inputProps}
        className={`form-input w-full min-w-0 ${error ? "border-[#DC2626] focus:ring-[#DC2626]/20" : ""}`}
      />
      {error && (
        <p className="mt-1 text-[11px] text-[#DC2626] animate-fade-in break-words">{error}</p>
      )}
    </div>
  );
}
