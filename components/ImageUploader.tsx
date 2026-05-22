"use client";

import { useState, useRef, useCallback } from "react";

interface UploadResult {
  success: boolean;
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  error?: string;
}

interface ImageUploaderProps {
  onUploadComplete?: (result: UploadResult) => void;
  className?: string;
  maxSizeMB?: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export default function ImageUploader({
  onUploadComplete,
  className = "",
  maxSizeMB = 10,
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<{ format: string; bytes: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setPreview(null);
    setUploadedUrl(null);
    setPublicId(null);
    setError(null);
    setUploadInfo(null);
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed: JPG, PNG, WebP, GIF, SVG`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large. Maximum size is ${maxSizeMB}MB.`;
    }
    return null;
  };

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    resetState();
    setIsUploading(true);

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result: UploadResult = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Upload failed");
      }

      setUploadedUrl(result.secure_url || null);
      setPublicId(result.public_id || null);
      setUploadInfo(
        result.format && result.bytes
          ? { format: result.format, bytes: result.bytes }
          : null
      );
      onUploadComplete?.(result);
    } catch (err: any) {
      setError(err.message || "Something went wrong during upload.");
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCopyUrl = () => {
    if (uploadedUrl) {
      navigator.clipboard.writeText(uploadedUrl);
    }
  };

  return (
    <div className={`w-full max-w-lg mx-auto ${className}`}>
      {/* Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-8
          transition-all duration-300 ease-out
          flex flex-col items-center justify-center gap-4
          min-h-[200px]
          ${isDragging
            ? "border-indigo-400 bg-indigo-50/80 scale-[1.02] shadow-lg shadow-indigo-100"
            : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50/50"
          }
          ${isUploading ? "pointer-events-none opacity-70" : ""}
        `}
      >
        {/* Upload Icon */}
        {!preview && !uploadedUrl && (
          <>
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center
              transition-all duration-300
              ${isDragging ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"}
            `}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">
                {isDragging ? "Drop your image here" : "Click or drag to upload"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG, WebP, GIF or SVG · Max {maxSizeMB}MB
              </p>
            </div>
          </>
        )}

        {/* Loading State */}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 rounded-2xl z-10">
            <div className="w-10 h-10 border-[3px] border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 mt-3 font-medium">Uploading…</p>
          </div>
        )}

        {/* Preview / Uploaded Image */}
        {(preview || uploadedUrl) && !isUploading && (
          <div className="relative w-full">
            <img
              src={uploadedUrl || preview || ""}
              alt="Uploaded preview"
              className="w-full max-h-64 object-contain rounded-xl"
            />
            {/* Success badge */}
            {uploadedUrl && (
              <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Uploaded
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
        id="image-upload-input"
      />

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Upload Result Info */}
      {uploadedUrl && (
        <div className="mt-4 space-y-3">
          {/* URL display */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Image URL
              </span>
              <button
                onClick={handleCopyUrl}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                </svg>
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-600 break-all font-mono leading-relaxed">
              {uploadedUrl}
            </p>
          </div>

          {/* Meta info row */}
          <div className="flex items-center gap-3">
            {publicId && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg font-mono">
                {publicId}
              </span>
            )}
            {uploadInfo && (
              <>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg uppercase font-semibold">
                  {uploadInfo.format}
                </span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg font-medium">
                  {formatBytes(uploadInfo.bytes)}
                </span>
              </>
            )}
          </div>

          {/* Upload another button */}
          <button
            onClick={() => {
              resetState();
              fileInputRef.current?.click();
            }}
            className="w-full py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors duration-200"
          >
            Upload Another Image
          </button>
        </div>
      )}
    </div>
  );
}
