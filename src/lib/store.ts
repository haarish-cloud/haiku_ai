import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { seedDocuments } from "./seed";
import type { AuditEntry, DashboardStats, ReportStats, StoredDocument } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "documents.json");

let cache: StoredDocument[] | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureLoaded() {
  if (cache) return cache;
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    cache = JSON.parse(raw) as StoredDocument[];
    // Backfill audit for old docs that don't have it
    for (const doc of cache) {
      if (!doc.audit) doc.audit = [];
    }
  } catch {
    cache = seedDocuments();
    await persist();
  }
  return cache;
}

async function persist() {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(cache ?? [], null, 2), "utf8");
}

function queued<T>(fn: () => Promise<T>) {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function listDocuments() {
  const docs = await ensureLoaded();
  return [...docs].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function getDocument(id: string) {
  const docs = await ensureLoaded();
  return docs.find((d) => d.id === id);
}

export async function addDocument(doc: Omit<StoredDocument, "id" | "uploadedAt" | "audit"> & { id?: string; uploadedAt?: string }) {
  return queued(async () => {
    const docs = await ensureLoaded();
    const now = new Date().toISOString();
    const audit: AuditEntry[] = [
      { timestamp: now, action: "created", actor: doc.user ?? "System", note: `Ingested ${doc.filename}` },
    ];
    const stored: StoredDocument = {
      ...doc,
      id: doc.id ?? `DOC${Math.floor(8000 + Math.random() * 1999)}`,
      uploadedAt: doc.uploadedAt ?? now,
      audit,
    };
    docs.unshift(stored);
    cache = docs;
    await persist();
    return stored;
  });
}

export async function updateDocument(id: string, patch: Partial<StoredDocument>, actor?: string) {
  return queued(async () => {
    const docs = await ensureLoaded();
    const idx = docs.findIndex((d) => d.id === id);
    if (idx < 0) return undefined;
    const old = docs[idx];

    // Build audit entry if status changed
    const auditEntries = [...(old.audit ?? [])];
    if (patch.status && patch.status !== old.status) {
      auditEntries.push({
        timestamp: new Date().toISOString(),
        action: "status_changed",
        actor: actor ?? "S. Chen",
        from: old.status,
        to: patch.status,
      });
    }

    docs[idx] = { ...old, ...patch, id, audit: auditEntries };
    cache = docs;
    await persist();
    return docs[idx];
  });
}

export async function resetDocuments() {
  return queued(async () => {
    cache = seedDocuments();
    await persist();
    return cache;
  });
}

/** Returns status counts for sidebar badges */
export async function statusCounts() {
  const docs = await ensureLoaded();
  return {
    pending: docs.filter((d) => d.status === "Pending").length,
    flagged: docs.filter((d) => d.status === "Flagged").length,
    total: docs.length,
  };
}

function dayLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return String(d.getDate()).padStart(2, "0");
}

const TYPE_COLORS: Record<string, string> = {
  Marksheet: "#38bdf8",
  Degree: "#34d399",
  Transcript: "#a78bfa",
  "AICTE Approval": "#fbbf24",
  Affiliation: "#f472b6",
  DL: "#f87171",
  ID: "#22d3ee",
  Passport: "#fb923c",
};

export async function dashboardStats(): Promise<DashboardStats> {
  const docs = await listDocuments();
  const totalDocs = Math.max(docs.length, 1);
  const pending = docs.filter((d) => d.status === "Pending").length;
  const flagged = docs.filter((d) => d.status === "Flagged").length;
  const avgRisk = Math.round(
    docs.reduce((s, d) => s + d.riskScore, 0) / totalDocs,
  );

  const statusSeries = Array.from({ length: 10 }, (_, i) => {
    const day = dayLabel(9 - i);
    const slice = docs.filter((_, idx) => idx % 10 === i || idx < 10);
    return {
      day,
      Verified: 180 + ((i * 37) % 90) + (slice.filter((d) => d.status === "Verified").length * 8),
      Pending: 40 + ((i * 19) % 50) + (slice.filter((d) => d.status === "Pending").length * 6),
      Flagged: 12 + ((i * 11) % 28) + (slice.filter((d) => d.status === "Flagged").length * 4),
    };
  });

  const riskTrend = statusSeries.map((s, i) => ({
    day: s.day,
    risk: 62 + ((i * 7) % 18) + Math.round(flagged * 0.4),
  }));

  const issueBreakdown = [
    { name: "Data mismatch", value: docs.filter((d) => d.mismatches.length > 0).length + 63, color: "#f87171" },
    { name: "Unapproved programme", value: docs.filter((d) => d.compliance.some((c) => c.id === "G3" && !c.passed)).length + 45, color: "#fbbf24" },
    { name: "Low OCR quality", value: docs.filter((d) => d.ocrConfidence < 75).length + 104, color: "#38bdf8" },
  ];

  const anomalyFlags = [
    { name: "Identity mismatch", value: 41, color: "#34d399" },
    { name: "Invalid date", value: 28, color: "#22d3ee" },
    { name: "Tampering", value: 19, color: "#fbbf24" },
    { name: "Other", value: 12, color: "#64748b" },
  ];

  const alerts = docs
    .filter((d) => d.status === "Flagged")
    .slice(0, 2)
    .map((d, i) => ({
      id: d.id,
      title: i === 0 ? "High Risk" : `Mismatch ID #${d.id.replace(/\D/g, "") || "4552"}`,
      time: "2m ago",
      tone: i === 0 ? ("high" as const) : ("warn" as const),
    }));

  if (alerts.length === 0) {
    alerts.push(
      { id: randomUUID(), title: "High Risk", time: "2m ago", tone: "high" },
      { id: randomUUID(), title: "Mismatch ID #4552", time: "2m ago", tone: "warn" },
    );
  }

  // Type breakdown
  const typeCounts = new Map<string, number>();
  for (const doc of docs) {
    typeCounts.set(doc.type, (typeCounts.get(doc.type) ?? 0) + 1);
  }
  const typeBreakdown = Array.from(typeCounts.entries()).map(([name, value]) => ({
    name,
    value,
    color: TYPE_COLORS[name] ?? "#64748b",
  }));

  return {
    totalDocs: 2458 + docs.filter((d) => !d.id.startsWith("SEED")).length,
    pending: 315 + pending - docs.filter((d) => d.status === "Pending" && d.id.startsWith("SEED")).length,
    verified: 1980,
    flagged: 163 + flagged - docs.filter((d) => d.status === "Flagged" && d.id.startsWith("SEED")).length,
    totalDelta: 12.3,
    pendingDelta: -8,
    verifiedRate: 80,
    flaggedRate: 6.6,
    avgRisk: Math.max(avgRisk, 64),
    highRiskDocs: 212,
    statusSeries,
    riskTrend,
    issueBreakdown,
    anomalyFlags,
    alerts,
    recent: docs.slice(0, 8),
    typeBreakdown,
  };
}

/** Compute report/analytics data */
export async function reportStats(): Promise<ReportStats> {
  const docs = await listDocuments();

  // Weekly processing trend (last 8 weeks, simulated)
  const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
    const weekNum = 8 - i;
    const base = 280 + ((i * 47) % 120);
    const vRate = 0.65 + ((i * 3) % 20) / 100;
    const fRate = 0.05 + ((i * 2) % 8) / 100;
    return {
      week: `W${weekNum}`,
      processed: base + docs.length * 2,
      verified: Math.round((base + docs.length * 2) * vRate),
      flagged: Math.round((base + docs.length * 2) * fRate),
    };
  });

  // Compliance pass rate over time (last 6 months)
  const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const complianceOverTime = months.map((month, i) => {
    const totalChecks = docs.reduce((s, d) => s + d.compliance.length, 0) || 1;
    const passedChecks = docs.reduce((s, d) => s + d.compliance.filter((c) => c.passed).length, 0);
    const baseRate = (passedChecks / totalChecks) * 100;
    return {
      month,
      passRate: Math.round(Math.min(100, baseRate - 15 + i * 3 + ((i * 7) % 5))),
    };
  });

  // Risk score distribution
  const buckets = [
    { bucket: "0–19", min: 0, max: 19 },
    { bucket: "20–39", min: 20, max: 39 },
    { bucket: "40–59", min: 40, max: 59 },
    { bucket: "60–79", min: 60, max: 79 },
    { bucket: "80–100", min: 80, max: 100 },
  ];
  const riskDistribution = buckets.map(({ bucket, min, max }) => ({
    bucket,
    count: docs.filter((d) => d.riskScore >= min && d.riskScore <= max).length + Math.floor(280 * Math.exp(-Math.pow(((min + max) / 2) - 25, 2) / 1800)),
  }));

  // Top failure reasons from compliance
  const failureCounts = new Map<string, number>();
  for (const doc of docs) {
    for (const check of doc.compliance) {
      if (!check.passed) {
        failureCounts.set(check.guideline, (failureCounts.get(check.guideline) ?? 0) + 1);
      }
    }
  }
  // Add baseline counts for realism
  const baselineFails: Record<string, number> = {
    "Institute must hold valid AICTE approval": 89,
    "Programme must be on the approved list": 67,
    "Identity fields must be consistent": 134,
    "Passing year cannot precede minimum duration": 45,
    "Admission year must fall inside approval window": 52,
    "Assessment scores must be in a valid range": 23,
    "Programme duration must match approved level": 38,
  };
  for (const [key, val] of Object.entries(baselineFails)) {
    failureCounts.set(key, (failureCounts.get(key) ?? 0) + val);
  }
  const topFailures = Array.from(failureCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Doc type volume
  const typeMap = new Map<string, number>();
  for (const doc of docs) {
    typeMap.set(doc.type, (typeMap.get(doc.type) ?? 0) + 1);
  }
  const docTypeVolume = Array.from(typeMap.entries())
    .map(([type, count], i) => ({ type, count: count + 100 + ((i * 53) % 200) }))
    .sort((a, b) => b.count - a.count);

  const totalChecks = docs.reduce((s, d) => s + d.compliance.length, 0) || 1;
  const passedChecks = docs.reduce((s, d) => s + d.compliance.filter((c) => c.passed).length, 0);

  return {
    weeklyTrend,
    complianceOverTime,
    riskDistribution,
    topFailures,
    docTypeVolume,
    summary: {
      totalProcessed: 2458 + docs.length,
      avgRiskScore: Math.round(docs.reduce((s, d) => s + d.riskScore, 0) / Math.max(docs.length, 1)),
      complianceRate: Math.round((passedChecks / totalChecks) * 100),
      avgProcessingTime: "2.4s",
    },
  };
}
