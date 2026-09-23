"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Camera, Check, Eye, EyeOff, Key, Phone, Settings, ShieldCheck, User, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

const AVATAR_PRESETS = [
  { id: "default", label: "Default Avatar", url: "/default-avatar.png" },
  { id: "emblem", label: "Official Seal", url: "/logo-emblem.png" },
  { id: "officer", label: "Official Officer", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
  { id: "volunteer", label: "Field Volunteer", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
  { id: "manager", label: "Storekeeper", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
];

export default function ProfileSettingsModal({ isOpen, onClose, roleInfo }) {
  const { user, role, updateUserProfile } = useAuth();
  const fileInputRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getInitialAvatar = () => {
    if (user?.photoURL && user.photoURL !== "/logo-emblem.png") return user.photoURL;
    if (roleInfo?.avatar && roleInfo.avatar !== "/logo-emblem.png") return roleInfo.avatar;
    return "/default-avatar.png";
  };

  const [displayName, setDisplayName] = useState(user?.displayName || roleInfo?.defaultName || "");
  const [photoURL, setPhotoURL] = useState(getInitialAvatar());
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Re-sync values whenever modal opens or user updates
  useEffect(() => {
    if (isOpen) {
      setDisplayName(user?.displayName || roleInfo?.defaultName || "");
      setPhotoURL(getInitialAvatar());
      setPhone(user?.phone || "");
      setPassword("");
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, user, roleInfo]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Handle local image file upload preview
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 2MB. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoURL(reader.result);
        setErrorMsg("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (password && password.trim().length > 0 && password.trim().length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }

      await updateUserProfile?.({
        displayName: displayName.trim(),
        photoURL,
        phone: phone.trim(),
        password: password.trim() || undefined,
      });

      setSuccessMsg("Profile and credentials updated successfully!");
      setPassword("");
      setTimeout(() => {
        setSuccessMsg("");
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || "Failed to update profile settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xl backdrop-blur-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF5A36] shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-stone-900 leading-tight">
                Account Settings
              </h2>
              <p className="text-xs text-stone-500 font-sans mt-0.5">
                Update your name, profile photo, password & contact
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Avatar / Photo Section */}
          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4">
            <label className="block text-xs font-bold font-display text-stone-800 mb-2">
              Profile Photo
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Current Preview */}
              <div className="relative group shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-400 via-rose-400 to-sky-400 p-0.5 shadow-md">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <Image
                      src={photoURL}
                      alt="Avatar preview"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover rounded-full"
                      unoptimized
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#FF5A36] text-white shadow-md hover:bg-[#E04825] transition-all cursor-pointer"
                  title="Upload from device"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Upload & Presets */}
              <div className="flex-1 w-full text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 shadow-2xs cursor-pointer"
                  >
                    Upload Custom Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <div className="text-[11px] text-stone-500 mb-1.5 font-sans">
                  Or pick a preset:
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setPhotoURL(preset.url)}
                      className={`
                        text-[10px] px-2 py-0.5 rounded-md font-semibold border transition-all cursor-pointer
                        ${photoURL === preset.url
                          ? "bg-orange-50 border-orange-300 text-[#FF5A36]"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                        }
                      `}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Full Name & Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold font-display text-stone-800 mb-1">
                Full Name / Call Sign
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Officer Name"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-stone-900 font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold font-display text-stone-800 mb-1">
                Designation
              </label>
              <div className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 font-medium">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">{roleInfo?.designation || "Authorized Official"}</span>
              </div>
            </div>
          </div>

          {/* Official Email (Read-only) & Phone Number (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold font-display text-stone-800 mb-1">
                Official Account Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || "coordinator@relief.gov"}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-100 text-stone-600 font-mono cursor-not-allowed select-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold font-display text-stone-800 mb-1">
                Phone Number <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-stone-900 font-sans"
                />
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5">
                For dispatch and automated emergency SMS updates
              </p>
            </div>
          </div>

          {/* Password update section */}
          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-3.5">
            <label className="block text-xs font-bold font-display text-stone-800 mb-1">
              Change Password <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep existing password"
                className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-stone-900 font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-stone-400 mt-1">
              Minimum 6 characters. Enter a new password only if you wish to reset it.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200/70">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#FF5A36] to-[#E04825] hover:from-[#E04825] hover:to-[#C7420F] text-white shadow-md border border-[#FF5A36] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
