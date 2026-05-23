"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { motion, AnimatePresence } from "framer-motion";
import { START_UPLOAD_JOB, GET_ADMIN_JOB } from "@/lib/graphql/queries";
import toast from "react-hot-toast";

interface ExportJob {
  id: string; status: string;
  totalFiles: number; processedFiles: number;
  failedFiles: number; currentFile: string | null; error: string | null;
}

export default function UploadJobCard() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [startUpload, { loading: starting }] = useMutation(START_UPLOAD_JOB);
  const { data: jobData, startPolling, stopPolling } = useQuery(GET_ADMIN_JOB, {
    variables: { jobId: activeJobId ?? "" }, skip: !activeJobId,
  });

  const job: ExportJob | null = (jobData as { adminJob?: ExportJob } | undefined)?.adminJob ?? null;
  const isDone      = job?.status === "completed" || job?.status === "failed";
  const isRunning   = job?.status === "processing" || job?.status === "queued";
  const progress    = job && job.totalFiles > 0
    ? Math.round(((job.processedFiles + job.failedFiles) / job.totalFiles) * 100)
    : 0;

  useEffect(() => {
    if (!activeJobId) return;
    if (!isDone) { startPolling(2000); return; }
    stopPolling();
    return () => stopPolling();
  }, [activeJobId, isDone, startPolling, stopPolling]);

  async function handleStart() {
    try {
      const result = await startUpload();
      const jobId = (result.data as { startUploadJob: { jobId: string } }).startUploadJob.jobId;
      setActiveJobId(jobId);
      toast.success("Upload job started");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start");
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-violet-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Phase 2 — Upload to S3</p>
            <p className="text-xs text-gray-400 mt-0.5">Streams all indexed files directly into your S3 bucket</p>
          </div>
        </div>
        <button
          onClick={handleStart}
          disabled={starting || isRunning}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {isRunning
            ? <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
            : <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>}
          {isRunning ? "Uploading…" : "Upload to S3"}
        </button>
      </div>

      <AnimatePresence>
        {job && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 pt-1 border-t border-gray-50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                job.status === "completed" ? "bg-green-100 text-green-700" :
                job.status === "failed"   ? "bg-red-100 text-red-600" :
                job.status === "processing"? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"}`}>
                {job.status === "processing" && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"/>}
                {job.status}
              </span>
              <span className="text-xs text-gray-500">{job.processedFiles}/{job.totalFiles} files</span>
              {job.failedFiles > 0 && <span className="text-xs text-red-400">· {job.failedFiles} failed</span>}
            </div>

            {isRunning && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span><span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <motion.div className="bg-violet-500 h-full rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }}/>
                </div>
                {job.currentFile && <p className="text-xs text-gray-400 truncate">↳ {job.currentFile}</p>}
              </div>
            )}

            {job.status === "completed" && (
              <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                ✓ {job.processedFiles.toLocaleString()} files uploaded to S3
              </p>
            )}
            {job.status === "failed" && job.error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{job.error}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
