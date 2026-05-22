"use client";

import { useState } from "react";

interface SyncStats {
  fetched: number;
  upserted: number;
  deleted: number;
  errors: number;
  duration_ms: number;
}

interface SyncButtonProps {
  className?: string;
  onSyncComplete?: (stats: SyncStats) => void;
}

export default function SyncButton({ className = "", onSyncComplete }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    stats?: SyncStats;
    error?: string;
  } | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setResult(null);

    try {
      const res = await fetch("/api/sync-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteStale: true }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setResult({
          success: false,
          error: data.error || "Sync failed unexpectedly.",
        });
      } else {
        setResult({ success: true, stats: data.stats });
        onSyncComplete?.(data.stats);
        // Auto-reload to refresh gallery with new data
        setTimeout(() => window.location.reload(), 2500);
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || "Network error during sync.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={`${className}`}>
      {/* Sync Button */}
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="
          relative inline-flex items-center gap-2.5 px-6 py-3
          rounded-xl font-semibold text-sm
          bg-gradient-to-r from-emerald-500 to-teal-500
          text-white shadow-lg shadow-emerald-500/25
          hover:shadow-xl hover:shadow-emerald-500/30
          hover:-translate-y-0.5
          transition-all duration-300
          disabled:opacity-60 disabled:cursor-not-allowed
          disabled:hover:translate-y-0 disabled:hover:shadow-lg
        "
      >
        {isSyncing ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Syncing…
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Sync from Cloudinary
          </>
        )}
      </button>

      {/* Result Toast */}
      {result && (
        <div
          className={`
            mt-4 p-4 rounded-xl border backdrop-blur-sm
            transition-all duration-500 animate-in slide-in-from-top-2
            ${
              result.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }
          `}
        >
          {result.success && result.stats ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-semibold">Sync completed successfully!</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{result.stats.fetched}</p>
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Fetched</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{result.stats.upserted}</p>
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Synced</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{result.stats.deleted}</p>
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Cleaned</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">
                    {(result.stats.duration_ms / 1000).toFixed(1)}s
                  </p>
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Duration</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">{result.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
