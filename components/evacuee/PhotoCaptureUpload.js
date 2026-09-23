"use client";

import { useState, useRef } from "react";

/**
 * PhotoCaptureUpload
 * Reusable camera snapshot & image upload component for Evacuee & Missing Family Member profiles.
 * Compresses images client-side via canvas to ensure ultra-low payload sizes for field connectivity.
 */
export default function PhotoCaptureUpload({
  label = "Upload or Snap Photo",
  hint = "Attach clear face photo for AI area scan & cross-camp family matching",
  onPhotoCaptured,
  initialPhoto = null,
  required = false,
  className = "",
}) {
  const [photoPreview, setPhotoPreview] = useState(initialPhoto);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const compressAndSetPhoto = (file) => {
    if (!file) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxWidth = 800;
          let { width, height } = img;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          setPhotoPreview(compressed);
          onPhotoCaptured?.(compressed);
        } catch {
          setPhotoPreview(e.target.result);
          onPhotoCaptured?.(e.target.result);
        } finally {
          setIsProcessing(false);
        }
      };
      img.onerror = () => setIsProcessing(false);
      img.src = e.target.result;
    };
    reader.onerror = () => setIsProcessing(false);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) compressAndSetPhoto(file);
    if (e.target) e.target.value = "";
  };

  const handleRemove = () => {
    setPhotoPreview(null);
    onPhotoCaptured?.(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold font-display text-[#1C1917] flex items-center gap-1.5">
          <span>{label}</span>
          {required && <span className="text-[#DC2626] font-mono">*</span>}
        </label>
        {photoPreview && (
          <span className="text-[10px] font-mono font-bold text-[#16A34A] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            AI Facial Profile Ready
          </span>
        )}
      </div>

      {hint && <p className="text-[11px] text-[#78716C] leading-snug">{hint}</p>}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />

      {photoPreview ? (
        <div className="relative rounded-2xl border border-[#DCE8E2] bg-[#FAF8F5] p-3 flex items-center gap-3.5 shadow-2xs">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#E5DCCE] shrink-0 border border-[#DCE8E2] shadow-xs">
            <img
              src={photoPreview}
              alt="Person Face"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-1">
              <span className="text-[9px] font-mono text-white font-bold">1:1 Face</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Photo Attached</span>
            </div>
            <p className="text-[10.5px] text-[#78716C] leading-tight">
              Circulated automatically across all registered relief camp check-in points & rescue stations.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="text-[11px] font-bold text-[#FF5A1F] hover:underline cursor-pointer"
              >
                Retake
              </button>
              <span className="text-[#DCE8E2]">|</span>
              <button
                type="button"
                onClick={handleRemove}
                className="text-[11px] font-medium text-[#DC2626] hover:underline cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {/* Camera Snap */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => cameraInputRef.current?.click()}
            className="py-3 px-3 rounded-2xl border border-dashed border-[#FF5A1F]/50 bg-[#FFF2EA]/40 hover:bg-[#FFF2EA] text-[#C7420F] transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-98"
          >
            <div className="w-8 h-8 rounded-xl bg-white border border-[#FF5A1F]/30 flex items-center justify-center text-[#FF5A1F] shadow-2xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>
            <span className="text-xs font-bold">Snap Camera</span>
            <span className="text-[10px] text-[#78716C]">Instant Photo</span>
          </button>

          {/* Upload Gallery */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="py-3 px-3 rounded-2xl border border-dashed border-[#DCE8E2] bg-white hover:bg-[#FAF8F5] text-[#1C1917] transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-98"
          >
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#DCE8E2] flex items-center justify-center text-[#78716C] shadow-2xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <span className="text-xs font-bold">Upload Gallery</span>
            <span className="text-[10px] text-[#78716C]">PNG / JPG file</span>
          </button>
        </div>
      )}
    </div>
  );
}
