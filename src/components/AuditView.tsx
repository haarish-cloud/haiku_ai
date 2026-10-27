"use client";

import { useEffect, useState } from "react";
import { Clock, Filter, Search } from "lucide-react";
import { PageHeader } from "./AppShell";
import type { StoredDocument } from "@/lib/types";

interface AuditRow {
  docId: string;
  docType: string;
  filename: string;
  timestamp: string;
  action: string;
  actor: string;
  from?: string;
  to?: string;
  note?: string;
}

export function AuditView() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((docs: StoredDocument[]) => {
        const allRows: AuditRow[] = [];
        for (const doc of docs) {
          for (const entry of doc.audit ?? []) {
            allRows.push({
              docId: doc.id,
              docType: doc.type,
              filename: doc.filename,
              timestamp: entry.timestamp,
              action: entry.action,
              actor: entry.actor,
              from: entry.from,
              to: entry.to,
              note: entry.note,
            });
          }
        }
        allRows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setRows(allRows);
      });
  }, []);

  const filtered = rows.filter((r) => {
    const matchesAction = actionFilter === "all" || r.action === actionFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.docId.toLowerCase().includes(q) ||
      r.actor.toLowerCase().includes(q) ||
      r.filename.toLowerCase().includes(q) ||
      (r.note?.toLowerCase().includes(q) ?? false);
    return matchesAction && matchesSearch;
  });

  const actionCounts = {
    all: rows.length,
    created: rows.filter((r) => r.action === "created").length,
    status_changed: rows.filter((r) => r.action === "status_changed").length,
    re_verified: rows.filter((r) => r.action === "re_verified").length,
  };

  return (
    <div>
      <PageHeader title="Audit Trail" subtitle="Complete history of all verification actions, status changes, and system events" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by document ID, actor, or filename…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter size={14} className="text-slate-400" />
          {(["all", "created", "status_changed", "re_verified"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActionFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                actionFilter === f
                  ? "bg-teal-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "All" : f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} ({actionCounts[f]})
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Document</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No audit entries found.
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={`${row.docId}-${row.timestamp}-${i}`} className="border-t border-gray-200 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-700">{new Date(row.timestamp).toLocaleDateString()}</p>
                        <p className="text-[11px] text-slate-400">{new Date(row.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/verification/${row.docId}`} className="font-medium text-teal-600 hover:underline">{row.docId}</a>
                    <div className="text-xs text-slate-400">{row.docType} · {row.filename}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.action === "created"
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        : row.action === "status_changed"
                          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          : "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                    }`}>
                      {row.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.actor}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {row.from && row.to ? `${row.from} → ${row.to}` : ""}
                    {row.note ? (row.from ? ` · ${row.note}` : row.note) : ""}
                    {!row.from && !row.note ? "—" : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Showing {filtered.length} of {rows.length} audit entries · Retention: 365 days
      </p>
    </div>
  );
}
