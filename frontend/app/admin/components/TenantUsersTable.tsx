"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { motion, AnimatePresence } from "framer-motion";
import { GET_TENANT_USERS, GET_TENANT_USER_FILES } from "@/lib/graphql/queries";

interface TenantUser {
  azureId: string; displayName: string; email: string;
  userPrincipalName: string; jobTitle: string | null;
  department: string | null; accountEnabled: boolean; fileCount: number;
}

interface DriveFile {
  id: string; name: string; path: string; size: number;
  mimeType: string; s3Key: string | null; uploadStatus: string;
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-green-100 text-green-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700", "bg-teal-100 text-teal-700",
];

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function FilesDrawer({ user, onClose }: { user: TenantUser; onClose: () => void }) {
  const { data, loading } = useQuery(GET_TENANT_USER_FILES, { variables: { userId: user.azureId } });
  const files: DriveFile[] = (data as { tenantUserFiles?: DriveFile[] } | undefined)?.tenantUserFiles ?? [];
  const uploaded = files.filter(f => f.uploadStatus === "uploaded").length;
  const failed   = files.filter(f => f.uploadStatus === "failed").length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Drawer header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(user.displayName)}`}>
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user.email || user.userPrincipalName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition flex-shrink-0"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>

        {/* Summary bar */}
        {!loading && files.length > 0 && (
          <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{files.length} files</span>
            {uploaded > 0 && <span className="text-green-600">✓ {uploaded} uploaded</span>}
            {failed   > 0 && <span className="text-red-500">{failed} failed</span>}
          </div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 mb-2 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
              </svg>
              <p className="text-sm">No files found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {files.map(f => (
                <div key={f.id} className="px-5 py-3 hover:bg-gray-50/70 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-400">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-800 truncate">{f.name}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{f.path || "/"}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400">{formatBytes(f.size)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                          f.uploadStatus === "uploaded"  ? "bg-green-100 text-green-700" :
                          f.uploadStatus === "failed"    ? "bg-red-100 text-red-600" :
                          f.uploadStatus === "uploading" ? "bg-blue-100 text-blue-700" :
                                                           "bg-gray-100 text-gray-500"
                        }`}>{f.uploadStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

export default function TenantUsersTable() {
  const { data, loading, error } = useQuery(GET_TENANT_USERS);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [search, setSearch] = useState("");
  const users: TenantUser[] = (data as { tenantUsers?: TenantUser[] } | undefined)?.tenantUsers ?? [];

  const filtered = search
    ? users.filter(u => {
        const q = search.toLowerCase();
        return u.displayName.toLowerCase().includes(q) ||
          (u.email || u.userPrincipalName).toLowerCase().includes(q) ||
          (u.department ?? "").toLowerCase().includes(q);
      })
    : users;

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Tenant Users</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {users.length > 0 ? `${users.length} users in directory` : "No users yet"}
            </p>
          </div>
          {users.length > 0 && (
            <div className="relative">
              <svg viewBox="0 0 20 20" fill="currentColor" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd"/>
              </svg>
              <input
                type="text"
                placeholder="Search users…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-44 transition"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center text-sm text-red-500">{error.message}</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-3 text-gray-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
            </svg>
            <p className="text-sm font-medium text-gray-500">No users fetched yet</p>
            <p className="text-xs text-gray-400 mt-1">Run Phase 1 to discover tenant users</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Department</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Files</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 w-16"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                      No results for &quot;{search}&quot;
                    </td>
                  </tr>
                ) : filtered.map(u => (
                  <tr key={u.azureId} className="hover:bg-gray-50/50 transition group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(u.displayName)}`}>
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{u.displayName}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email || u.userPrincipalName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {u.department
                        ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{u.department}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                        {u.fileCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.accountEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                      }`}>
                        {u.accountEnabled && <span className="w-1.5 h-1.5 rounded-full bg-green-500"/>}
                        {u.accountEnabled ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="opacity-0 group-hover:opacity-100 transition ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Files
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" clipRule="evenodd"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedUser && (
          <FilesDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
