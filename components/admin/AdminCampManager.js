"use client";

import { useState, useEffect } from "react";
import { updateShelterDetails } from "@/lib/shelters";
import Spinner from "@/components/ui/Spinner";

/**
 * AdminCampManager
 * 
 * Allows District Admins to select any relief camp across the disaster grid
 * and modify its operational parameters (occupancy, capacity, status, amenities, contact, notices).
 */
export default function AdminCampManager({ shelters = [], toast }) {
  const [selectedCampId, setSelectedCampId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Edit form state
  const [form, setForm] = useState({
    name: "",
    totalCapacity: 100,
    currentOccupancy: 0,
    status: "approved",
    contactNumber: "",
    address: "",
    waterStatus: "adequate",
    foodStatus: "adequate",
    medicalStatus: "adequate",
    powerStatus: "operational",
    publicNotice: "",
  });

  // Filtered shelters
  const filteredShelters = shelters.filter((s) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Set initial selected camp when list loads
  useEffect(() => {
    if (!selectedCampId && shelters.length > 0) {
      setSelectedCampId(shelters[0].id);
    }
  }, [shelters, selectedCampId]);

  // Load selected camp data into form
  useEffect(() => {
    if (!selectedCampId) return;
    const camp = shelters.find((s) => s.id === selectedCampId);
    if (camp) {
      setForm({
        name: camp.name || "",
        totalCapacity: Number(camp.totalCapacity) || 100,
        currentOccupancy: Number(camp.currentOccupancy) || 0,
        status: camp.status || "approved",
        contactNumber: camp.contactNumber || "",
        address: camp.address || "",
        waterStatus: camp.waterStatus || "adequate",
        foodStatus: camp.foodStatus || "adequate",
        medicalStatus: camp.medicalStatus || "adequate",
        powerStatus: camp.powerStatus || "operational",
        publicNotice: camp.publicNotice || "",
      });
    }
  }, [selectedCampId, shelters]);

  const selectedCamp = shelters.find((s) => s.id === selectedCampId);

  const occupancyRate = form.totalCapacity > 0
    ? Math.min(100, Math.round((form.currentOccupancy / form.totalCapacity) * 100))
    : 0;

  const handleStepper = (delta) => {
    setForm((prev) => {
      const nextVal = Math.max(0, Number(prev.currentOccupancy) + delta);
      return { ...prev, currentOccupancy: nextVal };
    });
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!selectedCampId) {
      toast?.({ type: "error", message: "Please select a relief camp first." });
      return;
    }

    if (!form.name.trim()) {
      toast?.({ type: "error", message: "Camp name cannot be empty." });
      return;
    }

    setIsSaving(true);
    try {
      await updateShelterDetails(selectedCampId, {
        name: form.name.trim(),
        totalCapacity: Number(form.totalCapacity),
        currentOccupancy: Number(form.currentOccupancy),
        status: form.status,
        contactNumber: form.contactNumber.trim(),
        address: form.address.trim(),
        waterStatus: form.waterStatus,
        foodStatus: form.foodStatus,
        medicalStatus: form.medicalStatus,
        powerStatus: form.powerStatus,
        publicNotice: form.publicNotice.trim(),
      });

      toast?.({
        type: "success",
        message: `Camp "${form.name}" updated successfully! Changes are live across the grid.`,
      });
    } catch (err) {
      console.error("Failed to update camp:", err);
      toast?.({
        type: "error",
        message: err.message || "Failed to update camp details.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (shelters.length === 0) {
    return (
      <div className="card-base p-6 text-center space-y-2">
        <p className="text-xs font-semibold text-[#78716C]">
          No relief camps registered in the database yet.
        </p>
      </div>
    );
  }

  return (
    <div className="card-base p-4 sm:p-6 space-y-5 border border-[#DCE8E2]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCE8E2]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FFF2EA] border border-[#FF5A1F]/30 text-[#FF5A1F] flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold font-display text-[#1C1917]">
              Relief Camp Commander & Live Configuration
            </h2>
            <p className="text-xs text-[#6E7973]">
              Select any relief camp to reallocate bed quota, adjust live headcount, change status, and update supplies.
            </p>
          </div>
        </div>

        {/* Camp Counter Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F0F7F4] border border-[#DCE8E2] text-xs font-mono text-[#3D3833] shrink-0 self-start sm:self-auto shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          <span className="font-bold text-[#1C1917]">{shelters.length}</span> Camps Registered
        </div>
      </div>

      {/* ── 1. Camp Selector Dropdown & Quick Search ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F0F7F4] border border-[#DCE8E2] space-y-3 shadow-xs">
        <label className="text-xs font-bold font-display text-[#1C1917] flex items-center justify-between">
          <span>Choose a Relief Camp to Modify:</span>
          {selectedCamp && (
            <span className="text-[10.5px] font-mono text-[#6E7973]">
              ID: {selectedCamp.id.slice(0, 8)}...
            </span>
          )}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Main Select Dropdown */}
          <div className="sm:col-span-2">
            <select
              value={selectedCampId}
              onChange={(e) => setSelectedCampId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#DCE8E2] text-xs font-semibold text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/30 transition-all cursor-pointer shadow-xs"
            >
              {filteredShelters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.currentOccupancy || 0}/{s.totalCapacity || 100} beds • {s.status || "approved"})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Search Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search camp by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white border border-[#DCE8E2] text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/30 transition-all shadow-xs"
            />
            <svg className="w-3.5 h-3.5 text-[#6E7973] absolute left-2.5 top-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── 2. Live Camp Editor Form ── */}
      {selectedCamp && (
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          
          {/* Real-Time Live Occupancy Meter Card */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E5DCCE] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#1C1917]">
                <span>Headcount Meter</span>
                <span className="text-[#78716C] font-mono font-normal">
                  ({form.currentOccupancy} / {form.totalCapacity} beds)
                </span>
              </div>
              <span className={`font-mono font-bold px-2 py-0.5 rounded-md text-[10px] ${
                occupancyRate >= 90 ? "bg-[#FEF2F2] text-[#DC2626]" :
                occupancyRate >= 70 ? "bg-[#FFFBEB] text-[#D97706]" : "bg-[#F0FDF4] text-[#16A34A]"
              }`}>
                {occupancyRate}% Capacity Filled
              </span>
            </div>
            
            <div className="h-2.5 w-full bg-[#FAF8F5] rounded-full overflow-hidden p-0.5 border border-[#E5DCCE]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  occupancyRate >= 90 ? "bg-[#DC2626]" :
                  occupancyRate >= 70 ? "bg-[#D97706]" : "bg-[#16A34A]"
                }`}
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Camp Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-display text-[#1C1917] block">
                Relief Camp Official Name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DCCE] text-xs font-semibold text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/30"
              />
            </div>

            {/* Operational Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-display text-[#1C1917] block">
                Operational Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DCCE] text-xs font-semibold text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/30 cursor-pointer"
              >
                <option value="approved">Approved & Open for Evacuees</option>
                <option value="diverting">Near Capacity (Divert Incoming)</option>
                <option value="pending">Pending Operational Audit</option>
                <option value="closed">Closed / Evacuated</option>
              </select>
            </div>

            {/* Current Occupancy Headcount + Stepper */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-display text-[#1C1917] block">
                Current Evacuee Headcount
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStepper(-10)}
                  className="px-2 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F2EDE4] border border-[#E5DCCE] text-xs font-bold text-[#44403C] transition-all cursor-pointer"
                  title="Decrease 10"
                >
                  -10
                </button>
                <button
                  type="button"
                  onClick={() => handleStepper(-1)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F2EDE4] border border-[#E5DCCE] text-xs font-bold text-[#44403C] transition-all cursor-pointer"
                  title="Decrease 1"
                >
                  -1
                </button>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.currentOccupancy}
                  onChange={(e) => setForm({ ...form, currentOccupancy: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full text-center px-3 py-1.5 rounded-xl bg-white border border-[#E5DCCE] text-xs font-mono font-bold text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/30"
                />
                <button
                  type="button"
                  onClick={() => handleStepper(1)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F2EDE4] border border-[#E5DCCE] text-xs font-bold text-[#44403C] transition-all cursor-pointer"
                  title="Increase 1"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => handleStepper(10)}
                  className="px-2 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F2EDE4] border border-[#E5DCCE] text-xs font-bold text-[#44403C] transition-all cursor-pointer"
                  title="Increase 10"
                >
                  +10
                </button>
              </div>
            </div>

            {/* Total Bed Capacity */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-display text-[#1C1917] block">
                Total Bed Capacity
              </label>
              <input
                type="number"
                min="1"
                required
                value={form.totalCapacity}
                onChange={(e) => setForm({ ...form, totalCapacity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DCCE] text-xs font-mono font-bold text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/30"
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-display text-[#1C1917] block">
                Camp Emergency Phone
              </label>
              <input
                type="tel"
                placeholder="+91 98301 23456"
                value={form.contactNumber}
                onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DCCE] text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/30 font-mono"
              />
            </div>

            {/* Address / Sector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-display text-[#1C1917] block">
                Camp Address / Location Sector
              </label>
              <input
                type="text"
                placeholder="e.g., Sector 4, High Ground Sports Complex"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DCCE] text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/30"
              />
            </div>
          </div>

          {/* ── 3. Critical Facilities & Logistics Toggles - All Options Visible On Phone ── */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5DCCE] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold font-display text-[#1C1917] block">
                Camp Logistics & Life-Support Readiness
              </span>
              <span className="text-[10px] font-mono text-[#6E7973] uppercase font-semibold">
                Tap option to update
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Drinking Water */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E5DCCE] space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold text-xs">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v.01M12 7c-2.76 0-5 2.24-5 5a5 5 0 0010 0c0-2.76-2.24-5-5-5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-3.75 4.5-6.75 8.25-6.75 12a6.75 6.75 0 0013.5 0c0-3.75-3-7.5-6.75-12z" />
                      </svg>
                    </span>
                    <span className="font-bold text-[#1C1917] uppercase text-[11px] tracking-wide">Drinking Water</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                    form.waterStatus === "adequate" ? "bg-[#DCFCE7] text-[#15803D]" :
                    form.waterStatus === "low" ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#FEE2E2] text-[#B91C1C]"
                  }`}>
                    {form.waterStatus === "adequate" ? "Adequate" : form.waterStatus === "low" ? "Low Tanker" : "Critical Dry"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: "adequate", label: "Adequate", activeBg: "bg-[#16A34A] text-white", inactive: "bg-[#F0FDF4] text-[#15803D] border-[#86EFAC]" },
                    { value: "low", label: "Low Tanker", activeBg: "bg-[#D97706] text-white", inactive: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]" },
                    { value: "critical", label: "Critical Dry", activeBg: "bg-[#DC2626] text-white", inactive: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, waterStatus: opt.value })}
                      className={`min-h-[34px] px-1 py-1 rounded-lg border text-[10px] sm:text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        form.waterStatus === opt.value
                          ? `${opt.activeBg} shadow-xs font-black ring-1 ring-black/10`
                          : `${opt.inactive} hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food Rations */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E5DCCE] space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold text-xs">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </span>
                    <span className="font-bold text-[#1C1917] uppercase text-[11px] tracking-wide">Food Rations</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                    form.foodStatus === "adequate" ? "bg-[#DCFCE7] text-[#15803D]" :
                    form.foodStatus === "low" ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#FEE2E2] text-[#B91C1C]"
                  }`}>
                    {form.foodStatus === "adequate" ? "Stocked" : form.foodStatus === "low" ? "Running Low" : "Airdrop Req"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: "adequate", label: "Adequate", activeBg: "bg-[#16A34A] text-white", inactive: "bg-[#F0FDF4] text-[#15803D] border-[#86EFAC]" },
                    { value: "low", label: "Low Stock", activeBg: "bg-[#D97706] text-white", inactive: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]" },
                    { value: "critical", label: "Airdrop Req", activeBg: "bg-[#DC2626] text-white", inactive: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, foodStatus: opt.value })}
                      className={`min-h-[34px] px-1 py-1 rounded-lg border text-[10px] sm:text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        form.foodStatus === opt.value
                          ? `${opt.activeBg} shadow-xs font-black ring-1 ring-black/10`
                          : `${opt.inactive} hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medical Support */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E5DCCE] space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center font-bold text-xs">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </span>
                    <span className="font-bold text-[#1C1917] uppercase text-[11px] tracking-wide">Medical Support</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                    form.medicalStatus === "adequate" ? "bg-[#DCFCE7] text-[#15803D]" :
                    form.medicalStatus === "first_aid" ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#FEE2E2] text-[#B91C1C]"
                  }`}>
                    {form.medicalStatus === "adequate" ? "Doctor In Camp" : form.medicalStatus === "first_aid" ? "First Aid" : "Physician Req"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: "adequate", label: "Doctor", activeBg: "bg-[#16A34A] text-white", inactive: "bg-[#F0FDF4] text-[#15803D] border-[#86EFAC]" },
                    { value: "first_aid", label: "First Aid", activeBg: "bg-[#D97706] text-white", inactive: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]" },
                    { value: "critical", label: "Physician", activeBg: "bg-[#DC2626] text-white", inactive: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, medicalStatus: opt.value })}
                      className={`min-h-[34px] px-1 py-1 rounded-lg border text-[10px] sm:text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        form.medicalStatus === opt.value
                          ? `${opt.activeBg} shadow-xs font-black ring-1 ring-black/10`
                          : `${opt.inactive} hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Power / Generator */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E5DCCE] space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold text-xs">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                    </span>
                    <span className="font-bold text-[#1C1917] uppercase text-[11px] tracking-wide">Power & Grid</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                    form.powerStatus === "operational" ? "bg-[#DCFCE7] text-[#15803D]" :
                    form.powerStatus === "battery" ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#FEE2E2] text-[#B91C1C]"
                  }`}>
                    {form.powerStatus === "operational" ? "Grid Active" : form.powerStatus === "battery" ? "Solar/Battery" : "Grid Offline"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: "operational", label: "Active Grid", activeBg: "bg-[#16A34A] text-white", inactive: "bg-[#F0FDF4] text-[#15803D] border-[#86EFAC]" },
                    { value: "battery", label: "Solar/Bat", activeBg: "bg-[#D97706] text-white", inactive: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]" },
                    { value: "offline", label: "Offline", activeBg: "bg-[#DC2626] text-white", inactive: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, powerStatus: opt.value })}
                      className={`min-h-[34px] px-1 py-1 rounded-lg border text-[10px] sm:text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        form.powerStatus === opt.value
                          ? `${opt.activeBg} shadow-xs font-black ring-1 ring-black/10`
                          : `${opt.inactive} hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. Public Broadcast Notice for Evacuees ── */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-display text-[#1C1917] flex items-center justify-between">
              <span>District Public Advisory for this Camp:</span>
              <span className="text-[10.5px] font-mono text-[#78716C]">Visible to evacuees</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Approach via North Boulevard only. Gate 3 is equipped for special assistance & wheelchairs."
              value={form.publicNotice}
              onChange={(e) => setForm({ ...form, publicNotice: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DCCE] text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]/30"
            />
          </div>

          {/* ── 5. Action Bar ── */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E5DCCE]">
            <span className="text-[11px] font-mono text-[#78716C]">
              Syncs immediately across live maps & mobile apps.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#FF5A1F] hover:bg-[#E04B14] text-white font-bold font-display text-xs shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span>Save Camp Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
