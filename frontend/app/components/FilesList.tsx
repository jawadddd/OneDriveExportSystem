"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  path: string;
  mimeType: string;
  lastModified: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📽️";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "🗜️";
  return "📁";
}

interface FilesListProps {
  onSelectionChange: (selected: DriveFile[]) => void;
}

export default function FilesList({ onSelectionChange }: FilesListProps) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Keep a stable ref so we never need onSelectionChange in dependency arrays
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  // Single place that notifies the parent — runs after every selection or file-list change
  useEffect(() => {
    onSelectionChangeRef.current(files.filter((f) => selectedIds.has(f.id)));
  }, [selectedIds, files]);

  const fetchFiles = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError(null);
    setSelectedIds(new Set()); // triggers the effect above → parent receives []
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/files`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch files");
      }
      const data = await res.json();
      setFiles(data.files);
      setCached(data.cached);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]); // onSelectionChange removed from deps

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const toggleOne = (file: DriveFile) => {
    // Pure updater — no side effects inside setState
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(file.id) ? next.delete(file.id) : next.add(file.id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)));
    }
  };

  const allSelected = files.length > 0 && selectedIds.size === files.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < files.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
        <p className="text-sm">Fetching your OneDrive files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-500">
        <p className="text-sm">{error}</p>
        <button onClick={fetchFiles} className="mt-3 text-xs text-blue-600 underline cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No files found in your OneDrive.
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            {files.length} file{files.length !== 1 ? "s" : ""}
            {cached && <span className="ml-1 text-xs text-gray-400">(cached)</span>}
          </p>
          {selectedIds.size > 0 && (
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={() => { setSelectedIds(new Set()); onSelectionChange([]); }}
              className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              Clear selection
            </button>
          )}
          <button onClick={fetchFiles} className="text-xs text-blue-600 hover:underline cursor-pointer">
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Path
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Size
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {files.map((file) => {
                const isSelected = selectedIds.has(file.id);
                return (
                  <tr
                    key={file.id}
                    onClick={() => toggleOne(file)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(file)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        <span>{fileIcon(file.mimeType)}</span>
                        <span className="truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-xs hidden sm:table-cell">
                      /{file.path || ""}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                      {formatBytes(file.size)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
