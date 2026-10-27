"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldAlert,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, StatusBadge } from "./AppShell";
import type { DashboardStats } from "@/lib/types";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Dashboard API ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) {
    return (
      <p className="text-sm text-slate-500">
        {error ? `Could not load dashboard: ${error}` : "Loading dashboard…"}
      </p>
    );
  }

  const kpis = [
    {
      label: "Total Docs",
      value: stats.totalDocs.toLocaleString(),
      delta: `↑ ${stats.totalDelta}%`,
      tone: "text-emerald-600",
      icon: FileText,
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      label: "Pending Verification",
      value: stats.pending.toLocaleString(),
      delta: `↓ ${Math.abs(stats.pendingDelta)}%`,
      tone: "text-amber-600",
      icon: AlertTriangle,
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      label: "Verified Successfully",
      value: stats.verified.toLocaleString(),
      delta: `↑ ${stats.verifiedRate}%`,
      tone: "text-emerald-600",
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Flagged Issues",
      value: stats.flagged.toLocaleString(),
      delta: `↓ ${stats.flaggedRate}%`,
      tone: "text-red-600",
      icon: ShieldAlert,
      iconBg: "bg-red-50 text-red-600",
    },
  ];

  const gauge = Math.min(100, Math.max(0, 100 - stats.avgRisk + 50));
  const gaugeColor = gauge >= 75 ? "#059669" : gauge >= 50 ? "#d97706" : "#dc2626";

  return (
    <div>
      <PageHeader title="Welcome back" />

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="card flex items-center gap-4 px-4 py-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${k.iconBg}`}>
              <k.icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500">{k.label}</p>
              <div className="mt-0.5 flex items-end justify-between gap-2">
                <p className="text-2xl font-semibold tracking-tight text-slate-900">{k.value}</p>
                <p className={`text-xs font-medium ${k.tone}`}>{k.delta}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-5 gap-4">
        <section className="card col-span-3 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-900">Verification Status Overview</h2>
            <span className="text-slate-400">•••</span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.statusSeries} barSize={18}>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8 }}
                />
                <Bar dataKey="Verified" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pending" stackId="a" fill="#fbbf24" />
                <Bar dataKey="Flagged" stackId="a" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-400" /> Verified</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-400" /> Pending</span>
            <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-400" /> Flagged</span>
          </div>
        </section>

        <section className="card col-span-2 p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-900">AI Compliance Risk Scores</h2>
            <span className="text-slate-400">•••</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-[150px] w-[150px] shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke={gaugeColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(gauge / 100) * 289} 289`}
                  className="gauge-arc"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] text-slate-400">High</span>
                <span className="text-2xl font-semibold text-slate-900">{Math.round(gauge)}%</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-semibold text-slate-900">{stats.highRiskDocs}</p>
              <p className="text-xs text-slate-500">documents</p>
              <div className="mt-3 h-[54px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.riskTrend}>
                    <Line type="monotone" dataKey="risk" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {stats.issueBreakdown.map((i) => (
                  <li key={i.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <i className="h-2 w-2 rounded-full" style={{ background: i.color }} />
                      {i.name}
                    </span>
                    <span>{i.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-4">
        <section className="card col-span-3 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-900">Recent Document Activity</h2>
            <span className="text-slate-400">•••</span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr>
                {["Document ID", "User", "Type", "Uploaded", "AI Score", "Status", "Action"].map((h) => (
                  <th key={h} className="pb-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((row) => (
                <tr key={row.id} className="border-t border-gray-200">
                  <td className="py-3 text-slate-700">{row.id}</td>
                  <td className="text-slate-500">{row.user}</td>
                  <td>{row.type}</td>
                  <td className="text-slate-500">{formatWhen(row.uploadedAt)}</td>
                  <td>{row.aiScore}%</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>
                    <Link href={`/verification/${row.id}`} className="text-teal-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card col-span-2 p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-900">Data Anomaly Flags</h2>
            <span className="text-slate-400">•••</span>
          </div>
          <div className="mx-auto h-[180px] w-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.anomalyFlags}
                  dataKey="value"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {stats.anomalyFlags.map((e) => (
                    <Cell key={e.name} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
            {stats.anomalyFlags.map((f) => (
              <span key={f.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <i className="h-2 w-2 rounded-full" style={{ background: f.color }} />
                  {f.name}
                </span>
                <span>{f.value}%</span>
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {stats.alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <AlertTriangle size={14} className={a.tone === "high" ? "text-red-500" : "text-amber-500"} />
                  {a.title}
                </span>
                <span className="text-xs text-slate-400">{a.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
