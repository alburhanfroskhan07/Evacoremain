"use client";

import { UploadCloud } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_STEP_SIZE = 5;
const FILE_SIZES = ["Bytes", "KB", "MB", "GB", "TB"];

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unit = FILE_SIZES[i] || FILE_SIZES[FILE_SIZES.length - 1];
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${unit}`;
};

const UploadIllustration = () => (
  <div className="relative h-16 w-16">
    <svg
      aria-label="Upload illustration"
      className="h-full w-full"
      fill="none"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Upload File Illustration</title>
      <circle
        className="stroke-stone-300 dark:stroke-stone-600"
        cx="50"
        cy="50"
        r="45"
        strokeDasharray="4 4"
        strokeWidth="2"
      >
        <animateTransform
          attributeName="transform"
          dur="60s"
          from="0 50 50"
          repeatCount="indefinite"
          to="360 50 50"
          type="rotate"
        />
      </circle>

      <path
        className="fill-sky-50 stroke-sky-400 dark:fill-sky-950/30 dark:stroke-sky-400"
        d="M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
        strokeWidth="2"
      >
        <animate
          attributeName="d"
          dur="2s"
          repeatCount="indefinite"
          values="
            M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z;
            M30 38H70C75 38 75 43 75 43V68C75 73 70 73 70 73H30C25 73 25 68 25 68V43C25 38 30 38 30 38Z;
            M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
        />
      </path>

      <path
        className="stroke-sky-500 dark:stroke-sky-400"
        d="M30 35C30 35 35 35 40 35C45 35 45 30 50 30C55 30 55 35 60 35C65 35 70 35 70 35"
        fill="none"
        strokeWidth="2"
      />

      <g className="translate-y-2 transform">
        <line
          className="stroke-sky-500 dark:stroke-sky-400"
          strokeLinecap="round"
          strokeWidth="2"
          x1="50"
          x2="50"
          y1="45"
          y2="60"
        >
          <animate
            attributeName="y2"
            dur="2s"
            repeatCount="indefinite"
            values="60;55;60"
          />
        </line>
        <polyline
          className="stroke-sky-500 dark:stroke-sky-400"
          fill="none"
          points="42,52 50,45 58,52"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <animate
            attributeName="points"
            dur="2s"
            repeatCount="indefinite"
            values="42,52 50,45 58,52;42,47 50,40 58,47;42,52 50,45 58,52"
          />
        </polyline>
      </g>
    </svg>
  </div>
);

const UploadingAnimation = ({ progress }) => (
  <div className="relative h-16 w-16">
    <svg
      aria-label={`Upload progress: ${Math.round(progress)}%`}
      className="h-full w-full"
      fill="none"
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Upload Progress Indicator</title>

      <defs>
        <mask id="progress-mask">
          <rect fill="black" height="240" width="240" />
          <circle
            cx="120"
            cy="120"
            fill="white"
            r="120"
            strokeDasharray={`${(progress / 100) * 754}, 754`}
            transform="rotate(-90 120 120)"
          />
        </mask>
      </defs>

      <g
        className="g-spin"
        mask="url(#progress-mask)"
        strokeDasharray="18% 40%"
        strokeWidth="10"
      >
        <circle cx="120" cy="120" opacity="0.95" r="140" stroke="#f4845f" />
        <circle cx="120" cy="120" opacity="0.95" r="120" stroke="#52b788" />
        <circle cx="120" cy="120" opacity="0.95" r="100" stroke="#6c8df6" />
        <circle cx="120" cy="120" opacity="0.95" r="80" stroke="#e0a96d" />
        <circle cx="120" cy="120" opacity="0.95" r="60" stroke="#e26d5c" />
      </g>
    </svg>
  </div>
);

export default function FileUpload({
  onUploadSuccess = () => {},
  onUploadError = () => {},
  acceptedFileTypes = [],
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  currentFile: initialFile = null,
  onFileRemove = () => {},
  uploadDelay = 1500,
  validateFile = () => null,
  className,
}) {
  const [file, setFile] = useState(initialFile);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const uploadIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
    };
  }, []);

  const validateFileSize = useCallback(
    (file) => {
      if (file.size > maxFileSize) {
        return {
          message: `File size exceeds ${formatBytes(maxFileSize)}`,
          code: "FILE_TOO_LARGE",
        };
      }
      return null;
    },
    [maxFileSize]
  );

  const validateFileType = useCallback(
    (file) => {
      if (!acceptedFileTypes?.length) return null;
      const fileType = file.type.toLowerCase();
      if (!acceptedFileTypes.some((type) => fileType.match(type.toLowerCase()))) {
        return {
          message: `File type must be ${acceptedFileTypes.join(", ")}`,
          code: "INVALID_FILE_TYPE",
        };
      }
      return null;
    },
    [acceptedFileTypes]
  );

  const handleError = useCallback(
    (err) => {
      setError(err);
      setStatus("error");
      onUploadError?.(err);

      setTimeout(() => {
        setError(null);
        setStatus("idle");
      }, 3000);
    },
    [onUploadError]
  );

  const simulateUpload = useCallback(
    (uploadingFile) => {
      let currentProgress = 0;
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);

      if (uploadDelay === 0) {
        setStatus("idle");
        onUploadSuccess?.(uploadingFile);
        return;
      }

      uploadIntervalRef.current = setInterval(() => {
        currentProgress += UPLOAD_STEP_SIZE;
        if (currentProgress >= 100) {
          if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
          setProgress(0);
          setStatus("idle");
          setFile(null);
          onUploadSuccess?.(uploadingFile);
        } else {
          setStatus((prev) => {
            if (prev === "uploading") {
              setProgress(currentProgress);
              return "uploading";
            }
            if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
            return prev;
          });
        }
      }, uploadDelay / (100 / UPLOAD_STEP_SIZE));
    },
    [onUploadSuccess, uploadDelay]
  );

  const handleFileSelect = useCallback(
    (selectedFile) => {
      if (!selectedFile) return;
      setError(null);

      const sizeError = validateFileSize(selectedFile);
      if (sizeError) {
        handleError(sizeError);
        return;
      }

      const typeError = validateFileType(selectedFile);
      if (typeError) {
        handleError(typeError);
        return;
      }

      const customError = validateFile?.(selectedFile);
      if (customError) {
        handleError(customError);
        return;
      }

      setFile(selectedFile);
      setStatus("uploading");
      setProgress(0);
      simulateUpload(selectedFile);
    },
    [simulateUpload, validateFileSize, validateFileType, validateFile, handleError]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus((prev) => (prev !== "uploading" ? "dragging" : prev));
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus((prev) => (prev === "dragging" ? "idle" : prev));
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (status === "uploading") return;
      setStatus("idle");
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [status, handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e) => {
      const selectedFile = e.target.files?.[0];
      handleFileSelect(selectedFile || null);
      if (e.target) e.target.value = "";
    },
    [handleFileSelect]
  );

  const triggerFileInput = useCallback(() => {
    if (status === "uploading") return;
    fileInputRef.current?.click();
  }, [status]);

  const resetState = useCallback(() => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    if (onFileRemove) onFileRemove();
  }, [onFileRemove]);

  return (
    <div
      aria-label="File upload"
      className={cn("relative mx-auto w-full max-w-sm", className || "")}
      role="complementary"
    >
      <div className="group relative w-full rounded-2xl bg-white/80 p-0.5 border border-stone-200/80 shadow-md backdrop-blur-md">
        <div className="relative w-full rounded-[14px] bg-stone-50/60 p-2">
          <div
            className={cn(
              "relative mx-auto w-full overflow-hidden rounded-xl border border-stone-200 bg-white/90",
              error ? "border-red-400" : ""
            )}
          >
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-300 pointer-events-none",
                status === "dragging" ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="absolute inset-0 bg-sky-500/10 backdrop-blur-xs" />
            </div>

            <div className="relative h-[220px]">
              <AnimatePresence mode="wait">
                {status === "idle" || status === "dragging" ? (
                  <motion.div
                    animate={{
                      opacity: status === "dragging" ? 0.8 : 1,
                      y: 0,
                      scale: status === "dragging" ? 0.98 : 1,
                    }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center"
                    exit={{ opacity: 0, y: -10 }}
                    initial={{ opacity: 0, y: 10 }}
                    key="dropzone"
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-3">
                      <UploadIllustration />
                    </div>

                    <div className="mb-3 space-y-1">
                      <h3 className="font-bold text-stone-900 text-sm font-display tracking-tight">
                        Drag and drop or select file
                      </h3>
                      <p className="text-stone-500 text-[11px] font-mono">
                        {acceptedFileTypes?.length
                          ? `${acceptedFileTypes.map((t) => t.split("/")[1]).join(", ").toUpperCase()}`
                          : "PNG, JPG or WebP"}{" "}
                        {maxFileSize && `up to ${formatBytes(maxFileSize)}`}
                      </p>
                    </div>

                    <button
                      className="group flex items-center justify-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200 px-4 py-2 font-bold text-stone-800 text-xs font-display transition-all cursor-pointer active:scale-98"
                      onClick={triggerFileInput}
                      type="button"
                    >
                      <span>Choose File</span>
                      <UploadCloud className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                    </button>

                    <input
                      accept={acceptedFileTypes?.join(",")}
                      aria-label="File input"
                      className="sr-only"
                      onChange={handleFileInputChange}
                      ref={fileInputRef}
                      type="file"
                    />
                  </motion.div>
                ) : status === "uploading" ? (
                  <motion.div
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-5"
                    exit={{ opacity: 0, scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    key="uploading"
                  >
                    <div className="mb-3">
                      <UploadingAnimation progress={progress} />
                    </div>

                    <div className="mb-3 space-y-1 text-center">
                      <h3 className="truncate font-bold text-stone-900 text-xs max-w-[200px]">
                        {file?.name}
                      </h3>
                      <div className="flex items-center justify-center gap-2 text-xs font-mono">
                        <span className="text-stone-500">{formatBytes(file?.size || 0)}</span>
                        <span className="font-bold text-sky-600">{Math.round(progress)}%</span>
                      </div>
                    </div>

                    <button
                      className="flex items-center justify-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200 px-4 py-1.5 font-bold text-stone-700 text-xs transition-all cursor-pointer"
                      onClick={resetState}
                      type="button"
                    >
                      Cancel
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 transform rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 shadow-sm"
                  exit={{ opacity: 0, y: -10 }}
                  initial={{ opacity: 0, y: 10 }}
                >
                  <p className="text-red-600 text-xs font-medium">{error.message}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
