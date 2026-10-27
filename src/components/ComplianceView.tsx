"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "./AppShell";
import { AICTE_GUIDELINES, INSTITUTES } from "@/lib/aicte";

export function ComplianceView() {
  const [query, setQuery] = useState("");
  const [pid, setPid] = useState(INSTITUTES[0].pid);
  const [program, setProgram] = useState(INSTITUTES[0].programs[0]?.name ?? "");
  const [year, setYear] = useState(2021);

  const institute = INSTITUTES.find((i) => i.pid === pid) ?? INSTITUTES[0];
  const approved = institute.programs.find(
    (p) => p.name === program || p.code === program,
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return AICTE_GUIDELINES.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.text.toLowerCase().includes(q) ||
        g.clause.toLowerCase().includes(q),
    );
  }, [query]);

  const checks = [
    {
      ok: institute.aicteApproved,
      label: "Institute approval",
      detail: institute.aicteApproved
        ? `${institute.name} is listed with PID ${institute.pid}.`
        : `${institute.name} has no current AICTE approval.`,
    },
    {
      ok: Boolean(approved),
      label: "Programme listing",
      detail: approved
        ? `${approved.name} approved ${approved.approvalFrom}–${approved.approvalTo}, intake ${approved.intake}.`
        : "This programme is not on the institute's approved list.",
    },
    {
      ok: Boolean(approved && year >= approved.approvalFrom && year <= approved.approvalTo),
      label: "Admission year window",
      detail: approved
        ? `Checking ${year} against ${approved.approvalFrom}–${approved.approvalTo}.`
        : "Cannot evaluate year without an approved programme.",
    },
  ];

  return (
    <div>
      <PageHeader
        title="AICTE Compliance"
        subtitle="Approval Process Handbook checks for institutes, programmes, duration and intake"
      />

      <div className="grid grid-cols-5 gap-4">
        <section className="card col-span-3 p-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guidelines…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <div className="mt-4 space-y-3">
            {filtered.map((g) => (
              <article key={g.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-600">{g.id} · {g.clause}</p>
                <h3 className="mt-1 text-sm font-medium text-slate-900">{g.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{g.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card col-span-2 p-5">
          <h2 className="text-sm font-medium text-slate-900">Live Programme Checker</h2>
          <label className="mt-4 block text-xs font-medium text-slate-500">
            Institute
            <select
              value={pid}
              onChange={(e) => {
                const next = INSTITUTES.find((i) => i.pid === e.target.value);
                setPid(e.target.value);
                setProgram(next?.programs[0]?.name ?? "");
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900"
            >
              {INSTITUTES.map((i) => (
                <option key={i.pid} value={i.pid}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-xs font-medium text-slate-500">
            Programme
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900"
            >
              {institute.programs.length === 0 ? (
                <option value="">No approved programmes</option>
              ) : (
                institute.programs.map((p) => (
                  <option key={p.code} value={p.name}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="mt-3 block text-xs font-medium text-slate-500">
            Admission year
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <ul className="mt-5 space-y-2">
            {checks.map((c) => (
              <li key={c.label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-800">{c.label}</span>
                  <span className={`font-medium ${c.ok ? "text-emerald-600" : "text-red-600"}`}>{c.ok ? "Pass" : "Fail"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{c.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
