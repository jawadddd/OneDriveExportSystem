"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { REGISTER } from "@/lib/graphql/queries";
import { setAdminToken } from "@/lib/apolloClient";
import InfoTooltip from "@/app/components/InfoTooltip";

const TOOLTIP = {
  tenantId:
    "Your Microsoft 365 Tenant ID identifies your organisation in OneDrive. It tells our system which OneDrive tenant to connect to so we can access your users' files.",
  clientId:
    "The Client ID of your registered app that has permission to access OneDrive. This is how Microsoft identifies your integration and grants it access to read OneDrive files across your tenant.",
  clientSecret:
    "A secret key that proves your app's identity to Microsoft when requesting access to OneDrive. Keep this private — it acts like a password for your OneDrive integration.",
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

function FieldInput({
  label,
  tooltip,
  mono,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
}: {
  label: string;
  tooltip?: string;
  mono?: boolean;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all duration-150 ${
          mono ? "font-mono tracking-tight" : ""
        }`}
      />
    </div>
  );
}

export default function AdminRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    organization: "",
    tenantId: "",
    clientId: "",
    clientSecret: "",
  });

  const [register, { loading }] = useMutation(REGISTER);

  function set(field: string) {
    return (v: string) => setForm((f) => ({ ...f, [field]: v }));
  }

  function goNext() {
    setError("");
    setDir(1);
    setStep(1);
  }

  function goBack() {
    setError("");
    setDir(-1);
    setStep(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const result = await register({ variables: { input: form } });
      const { token } = (result.data as { register: { token: string } }).register;
      setAdminToken(token);
      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  const steps = ["Your Details", "Azure Integration"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-6 text-white">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Admin Registration</h1>
              <p className="text-white/70 text-xs mt-0.5">Set up your tenant admin account</p>
            </div>
          </motion.div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {steps.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <motion.div
                    animate={{
                      background: i <= step ? "#fff" : "rgba(255,255,255,0.3)",
                      scale: i === step ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.25 }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ color: i <= step ? "#4f46e5" : "rgba(255,255,255,0.7)" }}
                  >
                    {i < step ? (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" style={{ color: "#4f46e5" }}>
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </motion.div>
                  <span className={`text-xs font-medium transition-opacity ${i <= step ? "text-white" : "text-white/50"}`}>
                    {label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <motion.div
                    animate={{ background: step > i ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)" }}
                    className="flex-1 h-0.5 w-8 rounded"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form body */}
        <div className="px-8 py-6 overflow-hidden" style={{ minHeight: 340 }}>
          <AnimatePresence mode="wait" custom={dir}>
            {step === 0 ? (
              <motion.div
                key="step0"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput
                      label="Full Name"
                      placeholder="John Smith"
                      value={form.displayName}
                      onChange={set("displayName")}
                      required
                    />
                    <FieldInput
                      label="Organization"
                      placeholder="Acme Corp"
                      value={form.organization}
                      onChange={set("organization")}
                    />
                  </div>
                  <FieldInput
                    label="Email"
                    type="email"
                    placeholder="admin@company.com"
                    value={form.email}
                    onChange={set("email")}
                    required
                  />
                  <FieldInput
                    label="Password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={form.password}
                    onChange={set("password")}
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!form.displayName || !form.email || !form.password}
                  className="mt-6 w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
                >
                  Continue
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="step1"
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                onSubmit={handleSubmit}
              >
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-2.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    These are your OneDrive integration credentials. Our system uses them to securely connect to your organisation&apos;s OneDrive, list all users, and stream their files directly to S3.
                  </p>
                </div>

                <div className="space-y-4">
                  <FieldInput
                    label="Tenant ID"
                    tooltip={TOOLTIP.tenantId}
                    mono
                    placeholder=""
                    value={form.tenantId}
                    onChange={set("tenantId")}
                    required
                  />
                  <FieldInput
                    label="Client ID (App ID)"
                    tooltip={TOOLTIP.clientId}
                    mono
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={form.clientId}
                    onChange={set("clientId")}
                    required
                  />
                  <FieldInput
                    label="Client Secret"
                    tooltip={TOOLTIP.clientSecret}
                    type="password"
                    placeholder="Your Azure app client secret value"
                    value={form.clientSecret}
                    onChange={set("clientSecret")}
                    required
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100"
                  >
                    {error}
                  </motion.p>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !form.tenantId || !form.clientId || !form.clientSecret}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Creating account…
                      </>
                    ) : (
                      "Create Admin Account"
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="px-8 pb-6 text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/admin/login" className="text-indigo-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
