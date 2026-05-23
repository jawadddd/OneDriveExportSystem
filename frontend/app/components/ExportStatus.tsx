"use client";

import { useEffect, useRef, useState } from "react";

interface ExportStatusData {
  status: "pending" | "processing" | "completed" | "failed";
  exportId: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  currentFile: string | null;
  error: string | null;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

interface ExportStatusProps {
  exportId: string;
  onDone?: () => void;
}

export default function ExportStatus({ exportId, onDone }: ExportStatusProps) {
  const [data, setData] = useState<ExportStatusData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/export/status/${exportId}`
        );
        if (!res.ok) return;
        const json: ExportStatusData = await res.json();
        setData(json);

        if (json.status === "completed" || json.status === "failed") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onDone?.();
        }
      } catch {
        // ignore transient errors
      }
    };

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [exportId, onDone]);

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
        Loading status...
      </div>
    );
  }

  const pct =
    data.totalFiles > 0
      ? Math.round(((data.processedFiles + data.failedFiles) / data.totalFiles) * 100)
      : 0;

  const statusConfig = {
    pending: { color: "bg-yellow-100 text-yellow-800", icon: "⏳", label: "Queued" },
    processing: { color: "bg-blue-100 text-blue-800", icon: "⚙️", label: "Processing" },
    completed: { color: "bg-green-100 text-green-800", icon: "✅", label: "Completed" },
    failed: { color: "bg-red-100 text-red-800", icon: "❌", label: "Failed" },
  };

  const cfg = statusConfig[data.status];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cfg.icon}</span>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">{exportId.slice(0, 8)}…</span>
      </div>

      {data.status === "processing" && (
        <>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{pct}% complete</span>
            <span>
              {data.processedFiles}/{data.totalFiles} files
            </span>
          </div>
          {data.currentFile && (
            <p className="text-xs text-gray-400 truncate">
              Processing: <span className="font-medium text-gray-600">{data.currentFile}</span>
            </p>
          )}
        </>
      )}

      {data.status === "completed" && (
        <div className="text-sm text-gray-700 space-y-1">
          <p>
            <span className="font-semibold text-green-600">{data.processedFiles}</span> files
            uploaded to S3 successfully.
          </p>
          {data.failedFiles > 0 && (
            <p className="text-red-500 text-xs">{data.failedFiles} file(s) failed to upload.</p>
          )}
        </div>
      )}

      {data.status === "pending" && (
        <p className="text-sm text-gray-500">Your export is queued and will begin shortly...</p>
      )}

      {data.status === "failed" && data.error && (
        <p className="text-sm text-red-600">{data.error}</p>
      )}
    </div>
  );
}
