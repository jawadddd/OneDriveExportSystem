"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { DriveFile } from "./FilesList";

interface ExportButtonProps {
  onExportStarted: (exportId: string) => void;
  selectedFiles?: DriveFile[];
  mode?: "all" | "selected";
}

export default function ExportButton({
  onExportStarted,
  selectedFiles = [],
  mode = "all",
}: ExportButtonProps) {
  const { data: session } = useSession();
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);

  const startExport = async (exportMode: "all" | "selected") => {
    if (!session?.accessToken) {
      toast.error("No active session. Please sign in again.");
      return;
    }

    const isSelected = exportMode === "selected";
    if (isSelected) setLoadingSelected(true);
    else setLoadingAll(true);

    try {
      const body = isSelected
        ? JSON.stringify({ selectedFiles })
        : JSON.stringify({});

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/export/start`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body,
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start export");
      }

      const data = await res.json();

      const label = isSelected
        ? `Exporting ${selectedFiles.length} file(s) to S3`
        : "Export started! Processing all files.";
      toast.success(label);
      onExportStarted(data.exportId);

      if (typeof window !== "undefined") {
        const prev = JSON.parse(localStorage.getItem("export_ids") || "[]");
        localStorage.setItem(
          "export_ids",
          JSON.stringify([data.exportId, ...prev].slice(0, 10))
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start export");
    } finally {
      setLoadingAll(false);
      setLoadingSelected(false);
    }
  };

  const hasSelection = selectedFiles.length > 0;

  if (mode === "selected") {
    return (
      <button
        onClick={() => startExport("selected")}
        disabled={loadingSelected || !hasSelection}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-xl transition-colors shadow-md cursor-pointer text-sm"
      >
        {loadingSelected ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Starting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Export Selected ({selectedFiles.length})
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={() => startExport("all")}
      disabled={loadingAll}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-xl transition-colors shadow-md cursor-pointer text-sm"
    >
      {loadingAll ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          Starting Export...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Export All to S3
        </>
      )}
    </button>
  );
}
