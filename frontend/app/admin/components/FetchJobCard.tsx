"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useApolloClient } from "@apollo/client/react";
import { motion, AnimatePresence } from "framer-motion";
import { START_FETCH_JOB, GET_ADMIN_JOB, GET_TENANT_USERS } from "@/lib/graphql/queries";
import toast from "react-hot-toast";

interface ExportJob {
  id: string; status: string; totalUsers: number;
  processedUsers: number; totalFiles: number;
  currentUser: string | null; error: string | null;
}

export default function FetchJobCard() {
  const client = useApolloClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  const [startFetch, { loading: starting }] = useMutation(START_FETCH_JOB);
  const { data: jobData, startPolling, stopPolling } = useQuery(GET_ADMIN_JOB, {
    variables: { jobId: activeJobId ?? "" }, skip: !activeJobId,
  });

  const job: ExportJob | null = (jobData as { adminJob?: ExportJob } | undefined)?.adminJob ?? null;
  const isDone      = job?.status === "completed" || job?.status === "failed";
  const isRunning   = job?.status === "processing" || job?.status === "queued";
  const progress    = job && job.totalUsers > 0 ? Math.round((job.processedUsers / job.totalUsers) * 100) : 0;

  useEffect(() => {
    if (!activeJobId) return;
    if (!isDone) { startPolling(2000); return; }
    stopPolling();
    if (job?.status === "completed" && prevStatusRef.current !== "completed") {
      client.refetchQueries({ include: [GET_TENANT_USERS] });
      toast.success("Fetch complete — users table updated");
    }
    prevStatusRef.current = job?.status ?? null;
    return () => stopPolling();
  }, [activeJobId, isDone, job?.status, startPolling, stopPolling, client]);

  async function handleStart() {
    try {
      prevStatusRef.current = null;
      const result = await startFetch();
      const jobId = (result.data as { startFetchJob: { jobId: string } }).startFetchJob.jobId;
      setActiveJobId(jobId);
      toast.success("Fetch job started");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start");
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Phase 1 — Fetch Tenant Data</p>
            <p className="text-xs text-gray-400 mt-0.5">Discovers users &amp; indexes all OneDrive files</p>
          </div>
        </div>
        <button
          onClick={handleStart}
          disabled={starting || isRunning}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {isRunning ? <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                     : <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z"/><path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/></svg>}
          {isRunning ? "Running…" : "Fetch All Files"}
        </button>
      </div>

      <AnimatePresence>
        {job && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 pt-1 border-t border-gray-50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                job.status === "completed" ? "bg-green-100 text-green-700" :
                job.status === "failed"   ? "bg-red-100 text-red-600" :
                job.status === "processing"? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                {job.status === "processing" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/>}
                {job.status}
              </span>
              <span className="text-xs text-gray-500">{job.processedUsers}/{job.totalUsers} users</span>
              {job.totalFiles > 0 && <span className="text-xs text-gray-400">· {job.totalFiles.toLocaleString()} files</span>}
            </div>
            {isRunning && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span><span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <motion.div className="bg-blue-500 h-full rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}/>
                </div>
                {job.currentUser && <p className="text-xs text-gray-400 truncate">↳ {job.currentUser}</p>}
              </div>
            )}
            {job.status === "failed" && job.error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{job.error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
