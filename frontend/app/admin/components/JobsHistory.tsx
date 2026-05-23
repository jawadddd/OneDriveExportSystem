"use client";

import { useQuery } from "@apollo/client/react";
import { GET_ADMIN_JOBS } from "@/lib/graphql/queries";

interface ExportJob {
  id: string; type: string; status: string; triggeredBy: string;
  totalUsers: number; processedUsers: number;
  totalFiles: number; processedFiles: number; failedFiles: number;
  error: string | null; createdAt: string | null; completedAt: string | null;
}

function relativeTime(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function duration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

export default function JobsHistory() {
  const { data, loading } = useQuery(GET_ADMIN_JOBS, { pollInterval: 5000 });
  const jobs: ExportJob[] = (data as { adminJobs?: ExportJob[] } | undefined)?.adminJobs ?? [];

  if (loading && jobs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3 text-sm text-gray-400">
        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0"/>
        Loading history…
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center">
        <p className="text-sm text-gray-400">No jobs run yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Job History</h2>
        <p className="text-xs text-gray-400 mt-0.5">{jobs.length} jobs total</p>
      </div>

      <div className="divide-y divide-gray-50">
        {jobs.map(j => {
          const isFetch = j.type === "fetch";
          const dur = duration(j.createdAt, j.completedAt);

          return (
            <div key={j.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition">
              {/* Type icon */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isFetch ? "bg-blue-50" : "bg-violet-50"}`}>
                {isFetch ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500">
                    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"/>
                    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
                  </svg>
                )}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold ${isFetch ? "text-blue-600" : "text-violet-600"}`}>
                    Phase {isFetch ? "1" : "2"} — {isFetch ? "Fetch" : "Upload"}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    j.status === "completed"  ? "bg-green-100 text-green-700" :
                    j.status === "failed"     ? "bg-red-100 text-red-600" :
                    j.status === "processing" ? "bg-amber-100 text-amber-700" :
                                                "bg-gray-100 text-gray-500"
                  }`}>
                    {j.status === "processing" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"/>}
                    {j.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {isFetch
                    ? `${j.processedUsers}/${j.totalUsers} users · ${j.totalFiles.toLocaleString()} files indexed`
                    : `${j.processedFiles}/${j.totalFiles} files${j.failedFiles > 0 ? ` · ${j.failedFiles} failed` : ""}`}
                </p>
              </div>

              {/* Right: time + duration */}
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-gray-500">{relativeTime(j.createdAt)}</p>
                {dur && <p className="text-xs text-gray-400 mt-0.5">{dur}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
