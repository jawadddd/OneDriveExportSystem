"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ExportButton from "../components/ExportButton";
import ExportStatus from "../components/ExportStatus";
import FilesList, { DriveFile } from "../components/FilesList";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeExportIds, setActiveExportIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = JSON.parse(localStorage.getItem("export_ids") || "[]");
      setActiveExportIds(stored);
    }
  }, []);

  const handleExportStarted = (exportId: string) => {
    setActiveExportIds((prev) => [exportId, ...prev]);
  };

  if (status === "loading" || !session) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const userInitial = session.user?.name?.charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M10.5 18H5a3 3 0 0 1-.214-5.995L4.786 12A3.001 3.001 0 0 1 7.5 9.05V9a4.5 4.5 0 0 1 8.862-1.166A3.5 3.5 0 1 1 17.5 14H14" />
                <polyline points="12 12 12 21 9 18 12 21 15 18" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">OneDrive Export</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {userInitial}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-800 leading-tight">{session.user?.name}</p>
                <p className="text-xs text-gray-400">{session.user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Connection banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
          <p className="text-sm text-green-800">
            <span className="font-semibold">OneDrive connected</span>
            <span className="hidden sm:inline"> as </span>
            <span className="font-medium hidden sm:inline">{session.user?.email}</span>
          </p>
        </div>

        {/* Export controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Export to Amazon S3</h2>
              <p className="text-sm text-gray-500 mt-1">
                Export all files, or select specific files below and use Export Selected.
              </p>
            </div>
            <ExportButton onExportStarted={handleExportStarted} mode="all" />
          </div>

          {/* Export jobs */}
          {activeExportIds.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Export Jobs
              </h3>
              {activeExportIds.map((id) => (
                <ExportStatus key={id} exportId={id} />
              ))}
            </div>
          )}
        </div>

        {/* Files section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
          {/* Files header with sticky Export Selected bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your OneDrive Files</h2>
              <p className="text-sm text-gray-500 mt-1">
                Check files to select them, then export individually or in bulk.
              </p>
            </div>
            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
                </span>
                <ExportButton
                  onExportStarted={handleExportStarted}
                  selectedFiles={selectedFiles}
                  mode="selected"
                />
              </div>
            )}
          </div>

          <FilesList onSelectionChange={setSelectedFiles} />
        </div>
      </main>
    </div>
  );
}
