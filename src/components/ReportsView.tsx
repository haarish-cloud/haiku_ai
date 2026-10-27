"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "./AppShell";
import type { ReportStats } from "@/lib/types";

const tip = {
  contentStyle: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#0f172a" },
};

export function ReportsView() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reports")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Reports API ${r.status}`);
        return r.json();
      })
      .then((d) => !cancelled && setStats(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) {
    return (
      <p className="text-sm text-slate-500">
        {error ? `Could not load reports: ${error}` : "Loading reports…"}
      </p>
    );
  }

  const kpis = [
    { label: "Documents processed", value: stats.summary.totalProcessed.toLocaleString() },
    { label: "Average risk score", value: `${stats.summary.avgRiskScore}/100` },
    { label: "AICTE compliance rate", value: `${stats.summary.complianceRate}%` },
    { label: "Avg processing time", value: stats.summary.avgProcessingTime },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Throughput, compliance and risk analytics" />

      <div className="mb-4 grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-medium text-slate-900">Weekly Throughput</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.weeklyTrend}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip {...tip} />
              <Legend />
              <Bar dataKey="verified" stackId="a" fill="#34d399" />
              <Bar dataKey="flagged" stackId="a" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-medium text-slate-900">Compliance Pass Rate (%)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.complianceOverTime}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
              <Tooltip {...tip} />
              <Line type="monotone" dataKey="passRate" stroke="#0d9488" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-medium text-slate-900">Risk Score Distribution</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.riskDistribution}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="bucket" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip {...tip} />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-medium text-slate-900">Top Compliance Failures</h2>
          <ul className="space-y-3">
            {stats.topFailures.map((f) => {
              const max = stats.topFailures[0]?.count || 1;
              return (
                <li key={f.reason}>
                  <div className="flex justify-between text-xs text-slate-700">
                    <span>{f.reason}</span>
                    <span className="font-medium">{f.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-gray-100">
                    <div className="h-1.5 rounded bg-red-400" style={{ width: `${(f.count / max) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Prototype note: historical volumes are a simulated baseline blended with the documents in this workspace.
      </p>
    </div>
  );
}
