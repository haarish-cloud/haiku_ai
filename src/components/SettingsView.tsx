"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, Database, Key, Shield, Sparkles } from "lucide-react";
import { PageHeader } from "./AppShell";
import { getUser, ROLE_PERMISSIONS } from "@/lib/auth";

export function SettingsView() {
  const [message, setMessage] = useState("");
  const [high, setHigh] = useState(55);
  const [medium, setMedium] = useState(30);
  const user = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => getUser(),
    () => null,
  );
  const [aiConfig, setAiConfig] = useState<{ model: string; configured: boolean } | null>(null);
  const [notifications, setNotifications] = useState({
    missingDocs: true,
    expiredDocs: true,
    pendingVerification: true,
    anomalyDetection: true,
    complianceFailures: true,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-analyze")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.model) {
          setAiConfig({ model: data.model, configured: Boolean(data.configured) });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function reset() {
    const res = await fetch("/api/reset", { method: "POST" });
    const data = await res.json();
    setMessage(`Workspace reset. ${data.count} seed documents restored.`);
  }

  const permissions = user ? ROLE_PERMISSIONS[user.role] ?? [] : [];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Platform configuration, thresholds, and access controls" />

      <div className="grid grid-cols-2 gap-4">
        {/* Risk Thresholds */}
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-teal-600" />
            <h2 className="text-sm font-medium text-slate-900">Risk Thresholds</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Scores at or above High are auto-flagged. Medium is held for an analyst. Low is verified.
          </p>
          <label className="mt-4 block text-sm text-slate-700">
            High ≥ {high}
            <input
              type="range"
              min={40}
              max={90}
              value={high}
              onChange={(e) => setHigh(Number(e.target.value))}
              className="mt-2 w-full accent-teal-600"
            />
          </label>
          <label className="mt-4 block text-sm text-slate-700">
            Medium ≥ {medium}
            <input
              type="range"
              min={10}
              max={50}
              value={medium}
              onChange={(e) => setMedium(Number(e.target.value))}
              className="mt-2 w-full accent-teal-600"
            />
          </label>
          <p className="mt-3 text-xs text-slate-400">Stored locally in this session for the prototype UI. The scoring engine currently uses 55 / 30.</p>
        </section>

        {/* AI Configuration */}
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-teal-600" />
            <h2 className="text-sm font-medium text-slate-900">AI Engine Configuration</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Powered by Google Gemini AI for intelligent document analysis and anomaly detection.
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">API Key</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                  aiConfig?.configured
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200"
                }`}>
                  {aiConfig ? (aiConfig.configured ? "Configured" : "Not Configured") : "Checking..."}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Key size={12} className="text-slate-400" />
                <code className="text-xs text-slate-600">
                  {aiConfig?.configured ? "process.env.GEMINI_API_KEY (Active)" : "Set GEMINI_API_KEY in .env.local"}
                </code>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-slate-500">Model</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {aiConfig?.model ?? "gemini-2.5-flash"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-slate-500">Capabilities</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {["OCR Enhancement", "Anomaly Detection", "Document Classification", "Data Extraction", "Compliance Analysis"].map((cap) => (
                  <span key={cap} className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 ring-1 ring-teal-200">{cap}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-teal-600" />
            <h2 className="text-sm font-medium text-slate-900">Alert Notifications</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Configure automated alert notifications for verification events.</p>
          <div className="mt-4 space-y-3">
            {[
              { key: "missingDocs" as const, label: "Missing Documents", desc: "Alert when required documents are missing" },
              { key: "expiredDocs" as const, label: "Expired Documents", desc: "Alert when documents have passed validity" },
              { key: "pendingVerification" as const, label: "Pending Verification", desc: "Notify for items awaiting review" },
              { key: "anomalyDetection" as const, label: "Anomaly Detection", desc: "Alert on suspected alterations" },
              { key: "complianceFailures" as const, label: "Compliance Failures", desc: "Notify on AICTE rule violations" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className={`relative h-6 w-11 rounded-full transition ${notifications[item.key] ? "bg-teal-600" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${notifications[item.key] ? "left-5.5" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Role-Based Access */}
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-teal-600" />
            <h2 className="text-sm font-medium text-slate-900">Role-Based Access Control</h2>
          </div>
          {user && (
            <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3">
              <p className="text-xs font-medium text-teal-600">Current User</p>
              <p className="mt-1 text-sm font-medium text-teal-800">{user.name}</p>
              <p className="text-xs text-teal-600">{user.email} · {user.role}</p>
            </div>
          )}
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-500">Your Permissions</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {permissions.map((p) => (
                <span key={p} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-gray-200">{p}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Workspace */}
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-teal-600" />
            <h2 className="text-sm font-medium text-slate-900">Workspace & Data</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Manage demo data and audit log retention settings.
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-slate-500">Audit Log Retention</p>
              <p className="mt-1 text-sm text-slate-800">365 days (configurable)</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-slate-500">Supported Document Types</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {["Marksheet", "Degree", "Transcript", "AICTE Approval", "Affiliation", "ID", "Passport", "DL"].map((t) => (
                  <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200">{t}</span>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void reset()}
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Reset demo data
          </button>
          {message ? <p className="mt-3 text-sm text-teal-600">{message}</p> : null}
        </section>

        {/* Document Verification Sources */}
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-teal-600" />
            <h2 className="text-sm font-medium text-slate-900">Verification Sources</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Issuing authority APIs and verification services configuration.
          </p>
          <div className="mt-4 space-y-2">
            {[
              { name: "AICTE Approval Portal", status: "Connected", ok: true },
              { name: "DigiLocker API", status: "Ready", ok: true },
              { name: "ABC (Academic Bank of Credits)", status: "Configured", ok: true },
              { name: "University Verification API", status: "Simulated", ok: false },
              { name: "QR Code / Digital Signature", status: "Active", ok: true },
            ].map((src) => (
              <div key={src.name} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="text-sm text-slate-700">{src.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${src.ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
                  {src.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
