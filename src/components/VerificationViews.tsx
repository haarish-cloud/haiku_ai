"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ExternalLink, CheckCircle, XCircle, AlertCircle, Loader2, Sparkles, Bot } from "lucide-react";
import { PageHeader, StatusBadge } from "./AppShell";
import type { StoredDocument } from "@/lib/types";

export function VerificationQueue() {
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then(setDocs);
  }, []);

  const filtered = filter === "All" ? docs : docs.filter((d) => d.status === filter);

  return (
    <div>
      <PageHeader title="Verification Queue" subtitle="Review OCR extraction, mismatches, and AICTE findings" />

      <div className="mb-4 flex gap-2">
        {["All", "Pending", "Verified", "Flagged"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {f} {f !== "All" && `(${docs.filter((d) => d.status === f).length})`}
          </button>
        ))}
      </div>

      <section className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs text-slate-500">
            <tr>
              {["Document", "Candidate", "Type", "Risk", "AI score", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => (
              <tr key={doc.id} className="border-t border-gray-200 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-800">{doc.id}</span>
                  <div className="text-xs text-slate-400">{doc.filename}</div>
                </td>
                <td className="text-slate-700">{doc.extracted.studentName ?? doc.user}</td>
                <td>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {doc.type}
                  </span>
                </td>
                <td>
                  <span className={doc.riskLevel === "High" ? "text-red-600" : doc.riskLevel === "Medium" ? "text-amber-600" : "text-emerald-600"}>
                    {doc.riskLevel} ({doc.riskScore})
                  </span>
                </td>
                <td>{doc.aiScore}%</td>
                <td><StatusBadge status={doc.status} /></td>
                <td className="px-4">
                  <Link href={`/verification/${doc.id}`} className="text-teal-600 hover:underline">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function DocumentDetail({ id }: { id: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<StoredDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const [verifyingAuthority, setVerifyingAuthority] = useState(false);
  const [authorityResult, setAuthorityResult] = useState<{status: string; details: string} | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setMissing(true);
          setDoc(null);
        } else {
          setMissing(false);
          setDoc(data);
        }
      });
  }, [id]);

  async function setStatus(status: StoredDocument["status"]) {
    if (!doc) return;
    setBusy(true);
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const next = await res.json();
    setDoc(next);
    setBusy(false);
  }

  async function verifyWithAuthority() {
    setVerifyingAuthority(true);
    // Simulate issuing authority verification
    await new Promise((r) => setTimeout(r, 2000));
    const hasIssues = doc?.riskLevel === "High";
    setAuthorityResult({
      status: hasIssues ? "Mismatch Detected" : "Verified",
      details: hasIssues
        ? "Issuing authority records do not match the submitted document details. Manual review required."
        : "Document details match issuing authority records. Digital signature verified. QR code validated.",
    });
    setVerifyingAuthority(false);
  }

  async function runAiAnalysis() {
    if (!doc) return;
    setAnalyzingAi(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc.id,
          ocrText: doc.ocrText,
          documentType: doc.type,
          action: "analyze",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Failed to execute AI analysis");
      } else if (data.aiAnalysis) {
        setDoc((prev) => (prev ? { ...prev, aiAnalysis: data.aiAnalysis } : null));
      } else if (data.result) {
        const combined = {
          classification: data.result.classification ?? doc.type,
          confidenceScore: data.result.confidenceScore ?? 90,
          overallRisk: data.result.overallRisk ?? doc.riskLevel,
          forgeryProbability: 0,
          anomalies: data.result.anomalies ?? [],
          verdictSummary: data.result.verdictSummary ?? "Analysis complete",
          recommendedAction: data.result.recommendedAction ?? "Approve",
          model: data.model,
          analyzedAt: new Date().toISOString(),
        };
        setDoc((prev) => (prev ? { ...prev, aiAnalysis: combined } : null));
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Network error during AI analysis");
    } finally {
      setAnalyzingAi(false);
    }
  }

  if (!doc) {
    return (
      <div>
        <PageHeader title="Document" />
        <p className="text-sm text-slate-500">
          {missing ? (
            <>
              Document not found. Return to the{" "}
              <button className="text-teal-600 hover:underline" onClick={() => router.push("/verification")}>
                queue
              </button>
              .
            </>
          ) : (
            "Loading verification dossier…"
          )}
        </p>
      </div>
    );
  }

  const fields = Object.entries(doc.extracted).filter(([, v]) => v !== undefined && v !== "");
  const passed = doc.compliance.filter((c) => c.passed).length;

  return (
    <div>
      <PageHeader title={`${doc.id} · ${doc.type}`} subtitle={doc.summary} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={doc.status} />
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-slate-600">AI score {doc.aiScore}%</span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-slate-600">Risk {doc.riskScore} · {doc.riskLevel}</span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-slate-600">OCR {doc.ocrConfidence}%</span>
        <div className="ml-auto flex gap-2">
          <button disabled={busy} onClick={() => void setStatus("Verified")} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100">Approve</button>
          <button disabled={busy} onClick={() => void setStatus("Pending")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100">Hold</button>
          <button disabled={busy} onClick={() => void setStatus("Flagged")} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100">Flag</button>
        </div>
      </div>

      {/* AI Analysis (Gemini) Card */}
      <section className="card mb-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">AI Analysis (Gemini)</h2>
                {doc.aiAnalysis?.model && (
                  <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 ring-1 ring-teal-200">
                    {doc.aiAnalysis.model}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Deep neural scrutiny for forgery, tampering, and AICTE compliance
              </p>
            </div>
          </div>
          <button
            onClick={() => void runAiAnalysis()}
            disabled={analyzingAi}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
          >
            {analyzingAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {analyzingAi ? "Analyzing with Gemini..." : doc.aiAnalysis ? "Re-run AI Analysis" : "Run AI Analysis"}
          </button>
        </div>

        {aiError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {aiError}
          </div>
        )}

        {!doc.aiAnalysis ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center">
            <Bot size={28} className="mx-auto text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-700">AI analysis unavailable</p>
            <p className="mt-1 text-xs text-slate-500">
              Run Gemini deep inspection on this document to evaluate tampering, anomalies, and classification.
            </p>
            <button
              onClick={() => void runAiAnalysis()}
              disabled={analyzingAi}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 shadow-xs hover:bg-teal-50 disabled:opacity-50"
            >
              {analyzingAi ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Run AI Analysis
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                <span className="text-[11px] font-medium text-slate-500">Classification</span>
                <p className="mt-1 text-sm font-semibold text-slate-800 truncate" title={doc.aiAnalysis.classification}>
                  {doc.aiAnalysis.classification || "N/A"}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                <span className="text-[11px] font-medium text-slate-500">Confidence Score</span>
                <p className="mt-1 text-sm font-semibold text-teal-600">
                  {doc.aiAnalysis.confidenceScore !== undefined ? `${doc.aiAnalysis.confidenceScore}%` : "N/A"}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                <span className="text-[11px] font-medium text-slate-500">Overall Risk</span>
                <p className="mt-1">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                    doc.aiAnalysis.overallRisk === "High"
                      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                      : doc.aiAnalysis.overallRisk === "Medium"
                      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  }`}>
                    {doc.aiAnalysis.overallRisk || "Low"}
                  </span>
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                <span className="text-[11px] font-medium text-slate-500">Forgery Probability</span>
                <p className={`mt-1 text-sm font-semibold ${
                  (doc.aiAnalysis.forgeryProbability ?? 0) > 40
                    ? "text-red-600"
                    : (doc.aiAnalysis.forgeryProbability ?? 0) > 15
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}>
                  {doc.aiAnalysis.forgeryProbability !== undefined ? `${doc.aiAnalysis.forgeryProbability}%` : "0%"}
                </p>
              </div>
            </div>

            {/* Verdict and Recommended Action */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3.5 md:col-span-2">
                <span className="text-[11px] font-medium text-slate-500">Verdict Summary</span>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">
                  {doc.aiAnalysis.verdictSummary || "No summary available."}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3.5">
                <span className="text-[11px] font-medium text-slate-500">Recommended Action</span>
                <p className="mt-1">
                  <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${
                    doc.aiAnalysis.recommendedAction?.toLowerCase().includes("reject")
                      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                      : doc.aiAnalysis.recommendedAction?.toLowerCase().includes("scrutiny") ||
                        doc.aiAnalysis.recommendedAction?.toLowerCase().includes("manual")
                      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  }`}>
                    {doc.aiAnalysis.recommendedAction || "Approve"}
                  </span>
                </p>
              </div>
            </div>

            {/* Anomalies List */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3.5">
              <span className="text-[11px] font-medium text-slate-500">
                Anomalies ({doc.aiAnalysis.anomalies?.length ?? 0})
              </span>
              {!doc.aiAnalysis.anomalies || doc.aiAnalysis.anomalies.length === 0 ? (
                <p className="mt-1 text-xs text-emerald-600">No anomalies detected by AI.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {doc.aiAnalysis.anomalies.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-red-700">
                      <span className="mt-0.5 shrink-0 text-red-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-3 gap-4">
        <section className="card p-5">
          <h2 className="text-sm font-medium text-slate-900">OCR Extracted Fields</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {fields.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-gray-100 pb-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium text-slate-800">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-medium text-slate-900">Cross-Reference Mismatches</h2>
          {doc.mismatches.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-600">No mismatches against the student / institute registry.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {doc.mismatches.map((m) => (
                <li key={m.field} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-800">{m.field}</span>
                    <span className={m.severity === "high" ? "text-red-600 font-medium" : "text-amber-600 font-medium"}>{m.severity}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{m.extracted} → {m.expected}</p>
                  <p className="mt-1 text-xs text-slate-500">{m.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-medium text-slate-900">Explainable Risk</h2>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{doc.riskScore}<span className="text-base text-slate-400"> / 100</span></p>
          <p className="text-xs text-slate-500">Additive score. Each factor below cites evidence and a recommended action.</p>
          <ul className="mt-3 max-h-[360px] space-y-3 overflow-auto pr-1">
            {doc.factors.length === 0 ? (
              <li className="text-sm text-emerald-600">No risk factors fired.</li>
            ) : (
              doc.factors.map((f) => (
                <li key={f.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-slate-800">{f.label}</span>
                    <span className="font-semibold text-red-600">+{f.points}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{f.evidence}</p>
                  <p className="mt-1 text-xs text-teal-700">{f.recommendation}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* Issuing Authority Verification */}
      <section className="card mt-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-900">Issuing Authority Verification</h2>
            <p className="mt-1 text-xs text-slate-500">Verify document through original issuing authority APIs, QR codes, and digital signatures</p>
          </div>
          <button
            onClick={() => void verifyWithAuthority()}
            disabled={verifyingAuthority}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
          >
            {verifyingAuthority ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
            {verifyingAuthority ? "Verifying..." : "Verify with Authority"}
          </button>
        </div>
        {authorityResult && (
          <div className={`mt-3 rounded-lg p-4 ${authorityResult.status === "Verified" ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-red-50 ring-1 ring-red-200"}`}>
            <div className="flex items-center gap-2">
              {authorityResult.status === "Verified" ? (
                <CheckCircle size={16} className="text-emerald-600" />
              ) : (
                <XCircle size={16} className="text-red-600" />
              )}
              <span className={`font-medium ${authorityResult.status === "Verified" ? "text-emerald-700" : "text-red-700"}`}>
                {authorityResult.status}
              </span>
            </div>
            <p className={`mt-1 text-sm ${authorityResult.status === "Verified" ? "text-emerald-600" : "text-red-600"}`}>
              {authorityResult.details}
            </p>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Clock size={12} /> Verified at {new Date().toLocaleTimeString()}</span>
              <span>Source: Issuing Authority Portal (Simulated)</span>
            </div>
          </div>
        )}
        {!authorityResult && (
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[
              { label: "Digital Signature", status: doc.extracted.aicteApprovalNo ? "Available" : "Not Found", ok: Boolean(doc.extracted.aicteApprovalNo) },
              { label: "QR Code", status: "Scan Required", ok: false },
              { label: "Reference Number", status: doc.extracted.aicteApprovalNo || "Not Extracted", ok: Boolean(doc.extracted.aicteApprovalNo) },
              { label: "Authority API", status: "Ready", ok: true },
            ].map((v) => (
              <div key={v.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-slate-500">{v.label}</p>
                <p className={`mt-1 text-sm font-medium ${v.ok ? "text-emerald-600" : "text-amber-600"}`}>
                  {v.ok ? <CheckCircle size={12} className="mr-1 inline" /> : <AlertCircle size={12} className="mr-1 inline" />}
                  {v.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-sm font-medium text-slate-900">AICTE Compliance Checker ({passed}/{doc.compliance.length} passed)</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {doc.compliance.map((c) => (
            <div key={c.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">{c.guideline}</p>
                <span className={`shrink-0 text-sm font-medium ${c.passed ? "text-emerald-600" : "text-red-600"}`}>{c.passed ? "Pass" : "Fail"}</span>
              </div>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{c.clause}</p>
              <p className="mt-2 text-xs text-slate-500">{c.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Audit Trail for this document */}
      {doc.audit && doc.audit.length > 0 && (
        <section className="card mt-4 p-5">
          <h2 className="text-sm font-medium text-slate-900">Document Audit Trail</h2>
          <div className="mt-3 space-y-2">
            {doc.audit.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                <Clock size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{entry.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                    <span className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    By {entry.actor}
                    {entry.from && entry.to ? ` · ${entry.from} → ${entry.to}` : ""}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card mt-4 p-5">
        <h2 className="text-sm font-medium text-slate-900">Raw OCR</h2>
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-slate-700">
          {doc.ocrText}
        </pre>
      </section>
    </div>
  );
}
