"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/ui/Spinner";
import {
  subscribeToReunificationAlerts,
  recordReunificationDecision,
  runAIPhotoMatch,
  uploadShelterSighting,
  subscribeToShelterSightings,
} from "@/lib/reunification";
import { subscribeToShelters } from "@/lib/shelters";
import PhotoCaptureUpload from "@/components/evacuee/PhotoCaptureUpload";

/**
 * FamilyVisualMatchManager
 * Dual-Engine Disaster Photo & Reunification Center for Volunteers, Coordinators, and Admins:
 * 1. 📸 Shelter Intake Photo Capture: Snap/upload photos of arriving evacuees to cloud intake database.
 * 2. 🔍 AI Vision Missing Person Search: Upload missing person photo to scan across all camps and pinpoint location.
 */
export default function FamilyVisualMatchManager({
  toast,
  userRole = "coordinator",
  userName = "Field Responder",
  shelterId: defaultShelterId = null,
  shelterName: defaultShelterName = null,
  className = "",
}) {
  // Main Tab: 'intake_capture' (📸 Arrival Intake) | 'ai_search' (🔍 AI Missing Search)
  const [activeTab, setActiveTab] = useState("intake_capture");

  // Shelter state
  const [sheltersList, setSheltersList] = useState([]);
  const [selectedShelterId, setSelectedShelterId] = useState(defaultShelterId || "");
  const [selectedShelterName, setSelectedShelterName] = useState(defaultShelterName || "");

  // Intake Capture Form state
  const [intakePhoto, setIntakePhoto] = useState(null);
  const [evacueeName, setEvacueeName] = useState("");
  const [ageBracket, setAgeBracket] = useState("Adult (18-50)");
  const [gender, setGender] = useState("Not specified");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [isUploadingIntake, setIsUploadingIntake] = useState(false);
  const [recentSightings, setRecentSightings] = useState([]);

  // Missing Person Search state
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'pending' | 'mila' | 'nahi_mila'
  const [actionLoadingMap, setActionLoadingMap] = useState({});
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [searchStep, setSearchStep] = useState("");
  const [missingPersonPhoto, setMissingPersonPhoto] = useState(null);
  const [missingPersonName, setMissingPersonName] = useState("");
  const [missingRelationship, setMissingRelationship] = useState("Family Member");

  // Subscribe to shelters
  useEffect(() => {
    const unsub = subscribeToShelters((list) => {
      const activeList = list || [];
      setSheltersList(activeList);
      if (!selectedShelterId && activeList.length > 0) {
        setSelectedShelterId(activeList[0].id);
        setSelectedShelterName(activeList[0].name);
      }
    });
    return () => unsub && unsub();
  }, [selectedShelterId]);

  // Subscribe to live shelter sightings
  useEffect(() => {
    const unsub = subscribeToShelterSightings((sightings) => {
      setRecentSightings(sightings || []);
    });
    return () => unsub && unsub();
  }, []);

  // Subscribe to reunification alerts
  useEffect(() => {
    const unsub = subscribeToReunificationAlerts((liveList) => {
      setAlerts(liveList || []);
      setLoadingAlerts(false);
    });
    return () => unsub && unsub();
  }, []);

  // Handle Shelter Intake Upload
  const handleUploadIntakePhoto = async (e) => {
    e?.preventDefault();
    if (!intakePhoto) {
      toast?.({ type: "error", message: "Please capture or select a photo of the arriving person." });
      return;
    }

    setIsUploadingIntake(true);
    const activeName =
      sheltersList.find((s) => s.id === selectedShelterId)?.name ||
      selectedShelterName ||
      "Regional Relief Shelter";

    try {
      const res = await uploadShelterSighting({
        shelterId: selectedShelterId || "shelter_general",
        shelterName: activeName,
        photo: intakePhoto,
        evacueeName: evacueeName.trim() || "Unregistered Evacuee",
        ageBracket,
        gender,
        capturedBy: userName,
        role: userRole,
        notes: intakeNotes.trim(),
      });

      if (res?.sighting) {
        setRecentSightings((prev) => [res.sighting, ...prev.filter((s) => s.id !== res.sighting.id)]);
      }

      toast?.({
        type: "success",
        message: `Arrival photo uploaded to cloud! Registered at ${activeName}.`,
      });

      // Reset form
      setIntakePhoto(null);
      setEvacueeName("");
      setIntakeNotes("");
    } catch (err) {
      console.error("Intake upload error:", err);
      toast?.({ type: "error", message: err.message || "Failed to upload arrival photo." });
    } finally {
      setIsUploadingIntake(false);
    }
  };

  // Handle AI Search with Missing Person Photo
  const handleRunAISearch = async () => {
    if (!missingPersonPhoto) {
      toast?.({ type: "error", message: "Please upload or snap a photo of the missing person to scan." });
      return;
    }

    setIsSearchingAI(true);
    setSearchStep("Multimodal Gemini Vision comparing facial contours against shelter intake database...");

    try {
      const res = await runAIPhotoMatch({
        targetPhoto: missingPersonPhoto,
        targetName: missingPersonName.trim() || "Missing Relative",
        relationship: missingRelationship,
      });

      setSearchStep("Biometric confidence computed! Pinpointed camp location...");

      setTimeout(() => {
        const safeId = res.id || res.alertId || `reunif_${Date.now()}`;
        setAlerts((prev) => [{ ...res, id: safeId, alertId: safeId }, ...prev.filter((p) => p.id !== safeId && p.alertId !== safeId)]);
        setIsSearchingAI(false);
        setSearchStep("");
        toast?.({
          type: "success",
          message: `AI Match Pinpointed! Candidate spotted at ${res.matchedShelterName} (${res.matchConfidence}% confidence).`,
        });
      }, 700);
    } catch (err) {
      setIsSearchingAI(false);
      setSearchStep("");
      toast?.({ type: "error", message: err.message || "AI Vision search failed." });
    }
  };

  // 1-Tap Scenario Demo
  const handleTriggerPresetScan = async (scenarioId) => {
    setIsSearchingAI(true);
    setSearchStep("Cross-referencing satellite and shelter intake biometrics...");

    try {
      const res = await runAIPhotoMatch({ sampleScenarioId: scenarioId });
      const safeId = res.id || res.alertId || `reunif_${Date.now()}`;
      setTimeout(() => {
        setAlerts((prev) => [{ ...res, id: safeId, alertId: safeId }, ...prev.filter((p) => p.id !== safeId && p.alertId !== safeId)]);
        setIsSearchingAI(false);
        setSearchStep("");
        toast?.({
          type: "success",
          message: `Candidate Spotted! ${res.targetName} matched at ${res.matchedShelterName}.`,
        });
      }, 700);
    } catch (err) {
      setIsSearchingAI(false);
      setSearchStep("");
      toast?.({ type: "error", message: err.message || "Preset scan failed." });
    }
  };

  // Confirm or reject match
  const handleDecision = async (alertItem, decision) => {
    const alertId = alertItem.id || alertItem.alertId || `reunif_${Date.now()}`;
    if (actionLoadingMap[alertId]) return;

    setActionLoadingMap((prev) => ({ ...prev, [alertId]: decision }));

    try {
      await recordReunificationDecision({
        alertId,
        decision,
        verifiedBy: userName,
        role: userRole,
      });

      setAlerts((prev) =>
        prev.map((a) => {
          const currentId = a.id || a.alertId;
          if (currentId === alertId) {
            return {
              ...a,
              status: decision === "mila" ? "confirmed_found" : "not_found",
              decision,
              reunited: decision === "mila",
              verifiedBy: userName,
              verifiedRole: userRole,
              verifiedAt: new Date().toISOString(),
            };
          }
          return a;
        })
      );

      if (decision === "mila") {
        toast?.({
          type: "success",
          message: `Reunion Confirmed! Family member marked as FOUND (Mila). Notification sent.`,
        });
      } else {
        toast?.({
          type: "info",
          message: `Match rejected (Nahi Mila). AI continues monitoring other camp arrivals.`,
        });
      }
    } catch (err) {
      console.error("Decision error:", err);
      toast?.({ type: "error", message: err.message || "Failed to log decision." });
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [alertId]: null }));
    }
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((item) => {
    const status = item.status || "pending_verification";
    if (activeFilter === "pending") return status === "pending_verification" || status === "open";
    if (activeFilter === "mila") return status === "confirmed_found" || item.reunited === true;
    if (activeFilter === "nahi_mila") return status === "not_found";
    return true;
  });

  return (
    <div className={`card-base p-3.5 sm:p-5 space-y-4 w-full max-w-full overflow-x-hidden min-w-0 border-[#CEE4D8] ${className}`}>
      {/* ── Top Header with Main Tabs ── */}
      <div className="flex flex-col gap-3 border-b border-[#CEE4D8] pb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#FFF2EA] border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] shadow-xs shrink-0">
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold font-display text-[#1C1917] truncate">
                Camp Intake & AI Visual Search
              </h2>
              <span className="px-2 py-0.5 rounded-lg bg-[#ECFDF3] border border-[#BBF7D0] text-[#16A34A] text-[9.5px] font-mono font-bold shrink-0">
                Cloud Sync
              </span>
            </div>
            <p className="text-[11px] text-[#78716C] truncate mt-0.5">
              Snap arriving evacuee photos or scan missing persons via AI.
            </p>
          </div>
        </div>

        {/* ── Dual Mode Navigation Switcher - 2-Column Responsive Grid ── */}
        <div className="w-full grid grid-cols-2 rounded-xl bg-[#F0F7F4] p-1 border border-[#CEE4D8] text-xs font-bold gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("intake_capture")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all cursor-pointer text-center truncate ${
              activeTab === "intake_capture"
                ? "bg-white text-[#1C1917] shadow-xs font-extrabold"
                : "text-[#6E7973] hover:text-[#1C1917]"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <span className="truncate">1. Arrival Intake</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai_search")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all cursor-pointer text-center truncate ${
              activeTab === "ai_search"
                ? "bg-white text-[#1C1917] shadow-xs font-extrabold"
                : "text-[#6E7973] hover:text-[#1C1917]"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-[#16A34A] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <span className="truncate">2. AI Vision Search</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: SHELTER ARRIVAL INTAKE PHOTO CAPTURE
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "intake_capture" && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] space-y-3.5">
            <div>
              <h3 className="text-base font-bold font-display text-[#1C1917] flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#FF5A1F]/10 text-[#FF5A1F] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </span>
                <span>Camp Arrival Photo Intake</span>
              </h3>
              <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
                Volunteers, Coordinators, and Admins can snap or upload arrival photos of evacuees to the cloud intake ledger. The AI system indexes faces for automated cross-camp missing person matching.
              </p>
            </div>

            {/* Shelter Dropdown Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">
                  Relief Shelter / Camp Location:
                </label>
                <select
                  value={selectedShelterId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedShelterId(id);
                    const name = sheltersList.find((s) => s.id === id)?.name || id;
                    setSelectedShelterName(name);
                  }}
                  className="w-full text-xs font-medium bg-white border border-[#DCE8E2] rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:border-[#FF5A1F]"
                >
                  {sheltersList.length > 0 ? (
                    sheltersList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.currentOccupancy || 0}/{s.totalCapacity || 100})
                      </option>
                    ))
                  ) : (
                    <option value="shelter_salt_lake">Salt Lake Stadium Sector 4 Relief Hub</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">
                  Arriving Person Name (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Ghosh (ya Unknown agar nahi pata)"
                  value={evacueeName}
                  onChange={(e) => setEvacueeName(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-[#DCE8E2] rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Age Bracket:</label>
                <select
                  value={ageBracket}
                  onChange={(e) => setAgeBracket(e.target.value)}
                  className="w-full text-xs bg-white border border-[#DCE8E2] rounded-xl px-3 py-2 text-[#1C1917]"
                >
                  <option value="Child (0-12)">Child (0-12 yrs)</option>
                  <option value="Teen (13-17)">Teen (13-17 yrs)</option>
                  <option value="Adult (18-50)">Adult (18-50 yrs)</option>
                  <option value="Elderly (50+)">Senior / Elderly (50+ yrs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Gender:</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full text-xs bg-white border border-[#DCE8E2] rounded-xl px-3 py-2 text-[#1C1917]"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                  <option value="Not specified">Not specified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1C1917] mb-1">Arrival Notes / Tent #:</label>
                <input
                  type="text"
                  placeholder="e.g. Rescued via raft, Tent B-4"
                  value={intakeNotes}
                  onChange={(e) => setIntakeNotes(e.target.value)}
                  className="w-full text-xs bg-white border border-[#DCE8E2] rounded-xl px-3 py-2 text-[#1C1917]"
                />
              </div>
            </div>

            {/* Photo Capture Camera & Upload */}
            <div className="pt-1">
              <PhotoCaptureUpload
                label="Snap or Upload Arriving Person Photo"
                hint="Capture a clear face or crowd snapshot. Compressed automatically for field upload."
                initialPhoto={intakePhoto}
                onPhotoCaptured={setIntakePhoto}
              />
            </div>

            {/* Action CTA */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isUploadingIntake || !intakePhoto}
                onClick={handleUploadIntakePhoto}
                className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isUploadingIntake ? (
                  <>
                    <Spinner size="sm" />
                    <span>Uploading to Cloud Registry…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span>Save & Upload to Cloud Intake</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Live Gallery of Recent Arriving Photos ── */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-display uppercase tracking-wider text-[#78716C] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                <span>Live Shelter Intake Gallery ({recentSightings.length} Logged)</span>
              </h4>
              <span className="text-[10px] font-mono text-[#78716C]">
                Available for District AI Search
              </span>
            </div>

            {recentSightings.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500">
                No arrival photos logged yet for this sector. Snap a photo above to add to the cloud registry.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {recentSightings.slice(0, 8).map((sight) => (
                  <div
                    key={sight.id}
                    className="p-2 rounded-xl bg-white border border-[#DCE8E2] shadow-2xs space-y-1.5 flex flex-col justify-between"
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                      <img
                        src={sight.photo}
                        alt={sight.evacueeName || "Evacuee"}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[9px] backdrop-blur-xs">
                        {sight.ageBracket || "Intake"}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1C1917] truncate">
                        {sight.evacueeName || "Unidentified Person"}
                      </div>
                      <div className="text-[10px] text-[#FF5A1F] font-semibold truncate">
                        {sight.shelterName || "Relief Hub"}
                      </div>
                      <div className="text-[9px] text-[#78716C] truncate mt-0.5">
                        By {sight.capturedBy} ({sight.role})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: AI VISION MISSING PERSON SEARCH
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "ai_search" && (
        <div className="space-y-4 animate-fade-in">
          {/* Missing Person Scanner Box */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-[#1C1917] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </span>
                  <span>AI Vision Search: Missing Person Photo</span>
                </h3>
                <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
                  Upload or snap a missing person&apos;s photo. AI Vision scans across all relief shelters arrival photos and biometric records to locate which camp they are in.
                </p>
              </div>
              <span className="text-[10px] font-mono text-[#FF5A1F] font-bold bg-white px-2.5 py-1 rounded-lg border border-[#FF5A1F]/30 shrink-0 shadow-2xs">
                Gemini 2.0 Flash
              </span>
            </div>

            {/* Quick 1-Tap Demo Scenarios for Hackathon Presentation */}
            <div className="space-y-1.5">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#78716C]">
                1-Tap Demo Missing Records (Click to test instant cross-camp match):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isSearchingAI}
                  onClick={() => handleTriggerPresetScan("priya_das")}
                  className="p-2.5 rounded-xl border border-[#DCE8E2] bg-white hover:border-[#FF5A1F] text-left transition-all cursor-pointer flex items-center gap-2.5 shadow-2xs active:scale-98 disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-[#DCE8E2]">
                    <img
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80"
                      alt="Priya"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1C1917] truncate">Priya Das (14y)</div>
                    <div className="text-[10px] text-[#16A34A] font-bold">94% Match · Salt Lake</div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isSearchingAI}
                  onClick={() => handleTriggerPresetScan("sunita_ghosh")}
                  className="p-2.5 rounded-xl border border-[#DCE8E2] bg-white hover:border-[#FF5A1F] text-left transition-all cursor-pointer flex items-center gap-2.5 shadow-2xs active:scale-98 disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-[#DCE8E2]">
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80"
                      alt="Sunita"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1C1917] truncate">Sunita Ghosh (52y)</div>
                    <div className="text-[10px] text-[#16A34A] font-bold">89% Match · Howrah</div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isSearchingAI}
                  onClick={() => handleTriggerPresetScan("amit_mondal")}
                  className="p-2.5 rounded-xl border border-[#DCE8E2] bg-white hover:border-[#FF5A1F] text-left transition-all cursor-pointer flex items-center gap-2.5 shadow-2xs active:scale-98 disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-[#DCE8E2]">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                      alt="Amit"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1C1917] truncate">Amit Mondal (28y)</div>
                    <div className="text-[10px] text-[#16A34A] font-bold">91% Match · Rescued</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Missing Person Photo Upload */}
            <div className="pt-2 border-t border-[#E5DCCE] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">
                    Missing Person Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Das"
                    value={missingPersonName}
                    onChange={(e) => setMissingPersonName(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-[#DCE8E2] rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1">
                    Relationship:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Brother, Mother, Child"
                    value={missingRelationship}
                    onChange={(e) => setMissingRelationship(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-[#DCE8E2] rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>
              </div>

              <PhotoCaptureUpload
                label="Upload or Snap Missing Person Photo"
                hint="Upload any clear face photo from WhatsApp, phone gallery, or family ID."
                initialPhoto={missingPersonPhoto}
                onPhotoCaptured={setMissingPersonPhoto}
              />

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  disabled={isSearchingAI || !missingPersonPhoto}
                  onClick={handleRunAISearch}
                  className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSearchingAI ? (
                    <>
                      <Spinner size="sm" />
                      <span>Scanning District Relief Camps…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      <span>Search Across All Shelters with AI Vision</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {isSearchingAI && (
              <div className="p-3 rounded-xl bg-white border border-[#FF5A1F]/30 flex items-center gap-3">
                <Spinner size="sm" />
                <span className="text-xs font-mono font-medium text-[#C7420F] animate-pulse">
                  {searchStep || "Processing multimodal AI vision..."}
                </span>
              </div>
            )}
          </div>

          {/* ── Status Metric Bar & Filter Tabs ── */}
          <div className="w-full overflow-x-auto no-scrollbar pb-1">
            <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#F0F7F4] border border-[#CEE4D8] text-xs whitespace-nowrap">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeFilter === "all" ? "bg-white text-[#1C1917] shadow-xs" : "text-[#6E7973]"
                }`}
              >
                All Matches ({alerts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("pending")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeFilter === "pending" ? "bg-[#FFF2EA] text-[#C7420F] shadow-xs" : "text-[#6E7973]"
                }`}
              >
                Pending Review ({alerts.filter((a) => a.status === "pending_verification" || a.status === "open").length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("mila")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeFilter === "mila" ? "bg-[#F0FDF4] text-[#15803D] shadow-xs" : "text-[#6E7973]"
                }`}
              >
                Found / Mila ({alerts.filter((a) => a.status === "confirmed_found" || a.reunited === true).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("nahi_mila")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeFilter === "nahi_mila" ? "bg-[#FEF2F2] text-[#DC2626] shadow-xs" : "text-[#6E7973]"
                }`}
              >
                Rejected ({alerts.filter((a) => a.status === "not_found").length})
              </button>
            </div>
          </div>

          {/* ── Alert Cards List ── */}
          {loadingAlerts ? (
            <div className="py-8 text-center">
              <Spinner size="md" />
              <div className="text-xs text-[#78716C] font-mono mt-2">Loading match sightings…</div>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#DCE8E2] text-[#78716C] space-y-1">
              <p className="text-xs font-bold text-[#1C1917]">No active match reports under this filter.</p>
              <p className="text-[11px]">Upload a missing person photo or click a demo scenario above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((item, idx) => {
                const safeKey = item.id || item.alertId || `alert_${idx}`;
                const isDeciding = Boolean(actionLoadingMap[safeKey]);
                const isConfirmed = item.status === "confirmed_found" || item.reunited === true;
                const isRejected = item.status === "not_found";

                return (
                  <div
                    key={safeKey}
                    className={`p-4 rounded-2xl border transition-all ${
                      isConfirmed
                        ? "bg-[#F0FDF4] border-[#86EFAC]"
                        : isRejected
                        ? "bg-[#FEF2F2]/60 border-[#FECACA]"
                        : "bg-white border-[#DCE8E2] shadow-xs"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Left: Side-by-Side Photos */}
                      <div className="flex items-center gap-2 shrink-0 self-center md:self-start">
                        {/* Reported Missing Photo */}
                        <div className="text-center space-y-1">
                          <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden border border-[#DCE8E2] bg-stone-100 shadow-xs relative">
                            {item.targetPhoto ? (
                              <img src={item.targetPhoto} alt="Missing" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">No Photo</div>
                            )}
                            <span className="absolute bottom-1 inset-x-1 py-0.5 rounded bg-black/75 text-[9px] font-mono text-white text-center">
                              Missing
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-[#1C1917] truncate max-w-[96px]">
                            {item.targetName}
                          </div>
                        </div>

                        {/* Match Indicator */}
                        <div className="flex flex-col items-center justify-center gap-1 text-center shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-[#ECFDF3] border border-[#BBF7D0] text-[#16A34A] text-[10px] font-mono font-black">
                            {item.matchConfidence || 88}%
                          </span>
                          <svg className="w-4 h-4 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                          </svg>
                          <span className="text-[9px] font-mono text-[#78716C]">AI Match</span>
                        </div>

                        {/* Camp Intake Photo */}
                        <div className="text-center space-y-1">
                          <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden border border-[#16A34A]/40 bg-stone-100 shadow-xs relative">
                            {item.candidatePhoto ? (
                              <img src={item.candidatePhoto} alt="Camp Evacuee" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">Camp Sighting</div>
                            )}
                            <span className="absolute bottom-1 inset-x-1 py-0.5 rounded bg-[#16A34A]/90 text-[9px] font-mono text-white text-center">
                              Camp Sighting
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-[#1C1917] truncate max-w-[96px]">
                            {item.candidateName || "Camp Evacuee"}
                          </div>
                        </div>
                      </div>

                      {/* Right: Detailed Match Intelligence & Actions */}
                      <div className="flex-1 space-y-2.5 min-w-0">
                        {/* Shelter Location Tag */}
                        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF2EA] border border-[#FF5A1F]/30 text-[#C7420F] font-bold text-xs max-w-full">
                              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                              </svg>
                              <span className="truncate">Spotted at: {item.matchedShelterName || "Regional Relief Shelter"}</span>
                            </div>
                            {item.contactNumber && (
                              <span className="text-[11px] font-mono text-[#78716C] flex items-center gap-1">
                                <svg className="w-3 h-3 text-[#FF5A1F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                </svg>
                                <span>{item.contactNumber}</span>
                              </span>
                            )}
                          </div>

                          {/* Status Badge */}
                          {isConfirmed ? (
                            <span className="badge badge-success text-[10px] font-bold px-2.5 py-1 inline-flex items-center gap-1">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              <span>Reunion Confirmed</span>
                            </span>
                          ) : isRejected ? (
                            <span className="badge bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-[10px] font-bold px-2.5 py-1 inline-flex items-center gap-1">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Match Rejected</span>
                            </span>
                          ) : (
                            <span className="badge badge-warn text-[10px] font-bold px-2.5 py-1 inline-flex items-center gap-1">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Pending Verification</span>
                            </span>
                          )}
                        </div>

                        {/* Reasoning / AI Insights */}
                        <p className="text-xs text-[#1C1917] leading-relaxed bg-[#F7F4EF] p-2.5 rounded-xl border border-[#E5DCCE]">
                          {item.reasoning || item.visualAnalysis?.locationContext}
                        </p>

                        {/* Verification Action Buttons: Mila / Nahi Mila */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/80">
                          <div className="text-[11px] text-[#78716C]">
                            {isConfirmed
                              ? `Verified by ${item.verifiedBy || "Field Coordinator"}`
                              : isRejected
                              ? `Closed by ${item.verifiedBy || "Field Coordinator"}`
                              : "Did you locate this person at the shelter?"}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Nahi Mila Button */}
                            <button
                              type="button"
                              disabled={isDeciding}
                              onClick={() => handleDecision(item, "nahi_mila")}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isRejected
                                  ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                                  : "bg-stone-100 hover:bg-[#FEF2F2] text-stone-600 hover:text-[#DC2626] border border-stone-200 hover:border-[#FECACA]"
                              }`}
                            >
                              {isDeciding && actionLoadingMap[safeKey] === "nahi_mila" ? (
                                <Spinner size="sm" />
                              ) : (
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              <span>Nahi Mila</span>
                            </button>

                            {/* Mila Button */}
                            <button
                              type="button"
                              disabled={isDeciding}
                              onClick={() => handleDecision(item, "mila")}
                              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                                isConfirmed
                                  ? "bg-[#16A34A] text-white border border-[#15803D]"
                                  : "bg-gradient-to-r from-[#16A34A] to-[#15803D] hover:from-[#15803D] hover:to-[#166534] text-white border border-[#16A34A]"
                              }`}
                            >
                              {isDeciding && actionLoadingMap[safeKey] === "mila" ? (
                                <Spinner size="sm" />
                              ) : (
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                              <span>Mila (Confirm Found)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
