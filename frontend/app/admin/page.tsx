"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { INVALIDATE_CACHE, GET_TENANT_USERS, ME } from "@/lib/graphql/queries";
import { clearAdminToken, getAdminToken } from "@/lib/apolloClient";
import toast from "react-hot-toast";
import FetchJobCard from "./components/FetchJobCard";
import UploadJobCard from "./components/UploadJobCard";
import TenantUsersTable from "./components/TenantUsersTable";
import JobsHistory from "./components/JobsHistory";

interface Admin { id: string; email: string; displayName: string; organization: string; }
interface TenantUser { azureId: string; fileCount: number; accountEnabled: boolean; }

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp: Variants  = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) router.replace("/admin/login");
    else setReady(true);
  }, [router]);

  const { data: meData }    = useQuery(ME,              { skip: !ready });
  const { data: usersData } = useQuery(GET_TENANT_USERS,{ skip: !ready });

  const admin: Admin | null         = (meData    as { me?: Admin }                    | undefined)?.me           ?? null;
  const users: TenantUser[]         = (usersData as { tenantUsers?: TenantUser[] }    | undefined)?.tenantUsers  ?? [];
  const totalFiles                  = users.reduce((s, u) => s + (u.fileCount || 0), 0);
  const activeUsers                 = users.filter(u => u.accountEnabled).length;

  const [invalidateCache] = useMutation(INVALIDATE_CACHE, { refetchQueries: [GET_TENANT_USERS] });

  function handleLogout() { clearAdminToken(); router.push("/admin/login"); }

  async function handleInvalidate() {
    try { await invalidateCache(); toast.success("Cache cleared"); }
    catch { toast.error("Failed to clear cache"); }
  }

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = [
    {
      label: "Total Users", value: users.length,
      cardBg: "bg-gradient-to-br from-blue-50 to-indigo-50/60",
      borderColor: "border-blue-100",
      iconBg: "bg-blue-500", iconColor: "text-white",
      valueColor: "text-blue-900", labelColor: "text-blue-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>,
    },
    {
      label: "Active Users", value: activeUsers,
      cardBg: "bg-gradient-to-br from-emerald-50 to-green-50/60",
      borderColor: "border-emerald-100",
      iconBg: "bg-emerald-500", iconColor: "text-white",
      valueColor: "text-emerald-900", labelColor: "text-emerald-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    },
    {
      label: "Total Files", value: totalFiles.toLocaleString(),
      cardBg: "bg-gradient-to-br from-violet-50 to-purple-50/60",
      borderColor: "border-violet-100",
      iconBg: "bg-violet-500", iconColor: "text-white",
      valueColor: "text-violet-900", labelColor: "text-violet-400",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between" style={{ height: "3.75rem" }}>
          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M10.5 18H5a3 3 0 01-.214-5.995L4.786 12A3.001 3.001 0 017.5 9.05V9a4.5 4.5 0 018.862-1.166A3.5 3.5 0 1117.5 14H14"/>
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm tracking-tight">OneDrive Export</span>
              <span className="hidden sm:inline text-gray-300 text-xs">·</span>
              <span className="hidden sm:inline text-xs font-medium text-gray-400">Admin</span>
            </div>
            {admin?.organization && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"/>
                {admin.organization}
              </span>
            )}
          </div>

          {/* Right: user + sign out */}
          <div className="flex items-center gap-3">
            {admin && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {admin.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-gray-800 leading-none">{admin.displayName}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-none">{admin.email}</p>
                </div>
              </div>
            )}
            <div className="w-px h-5 bg-gray-200 hidden sm:block"/>
            <button
              onClick={handleInvalidate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition font-medium"
              title="Clear Redis cache"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd"/>
              </svg>
              Clear Cache
            </button>
            <div className="w-px h-5 bg-gray-200 hidden sm:block"/>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition font-medium"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd"/>
                <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-1.08a.75.75 0 10-1.004-1.115l-2.5 2.5a.75.75 0 000 1.09l2.5 2.5a.75.75 0 101.004-1.114l-1.048-1.081h9.546A.75.75 0 0019 10z" clipRule="evenodd"/>
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">

          {/* Stat cards */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {stats.map(s => (
              <div key={s.label} className={`rounded-2xl border shadow-sm px-6 py-5 ${s.cardBg} ${s.borderColor}`}>
                <div className="flex items-center justify-between mb-4">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${s.labelColor}`}>{s.label}</p>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${s.iconBg} ${s.iconColor}`}>
                    {s.icon}
                  </div>
                </div>
                <p className={`text-3xl font-bold tracking-tight ${s.valueColor}`}>{s.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Phase cards */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FetchJobCard />
            <UploadJobCard />
          </motion.div>

          <motion.div variants={fadeUp}><TenantUsersTable /></motion.div>
          <motion.div variants={fadeUp}><JobsHistory /></motion.div>

        </motion.div>
      </main>
    </div>
  );
}
