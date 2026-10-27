"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, FileScan, Loader2, Sparkles } from "lucide-react";
import { createWorker } from "tesseract.js";
import { PageHeader } from "./AppShell";
import { DEMO_PACKS } from "@/lib/seed";
import type { BatchResult } from "@/lib/types";

export function UploadView() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [ocrText, setOcrText] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [phase, setPhase] = useState<"idle" | "ocr" | "ready" | "saving">("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [batchStatus, setBatchStatus] = useState("");
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);

  const canSubmit = ocrText.trim().length > 12 && phase !== "ocr" && phase !== "saving";

  const hint = useMemo(() => {
    if (batchStatus && (phase === "ocr" || phase === "saving")) return batchStatus;
    if (phase === "ocr") return `Running OCR… ${progress}%`;
    if (phase === "saving") return "Cross-referencing records and scoring AICTE compliance…";
    if (ocrText) return "Review extracted text, then run verification.";
    return "Drop a scanned marksheet, degree, or approval letter. Images are OCR'd in the browser.";
  }, [ocrText, phase, progress, batchStatus]);

  async function runOcr(file: File) {
    setError("");
    setFileName(file.name);
    setPhase("ocr");
    setProgress(0);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(undefined);
    }

    if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
      const text = await file.text();
      setOcrText(text);
      setConfidence(99);
      setPhase("ready");
      return;
    }

    try {
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && m.progress) {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const result = await worker.recognize(file);
      await worker.terminate();
      setOcrText(result.data.text);
      setConfidence(Math.round(result.data.confidence || 0));
      setPhase("ready");
    } catch (err) {
      setError(
        `OCR engine could not run (${err instanceof Error ? err.message : "unknown"}). Paste text or load a demo pack instead.`,
      );
      setPhase("idle");
    }
  }


  async function ocrFile(file: File): Promise<{ text: string; confidence: number }> {
    if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
      return { text: await file.text(), confidence: 99 };
    }
    const worker = await createWorker("eng");
    try {
      const result = await worker.recognize(file);
      return { text: result.data.text, confidence: Math.round(result.data.confidence || 0) };
    } finally {
      await worker.terminate();
    }
  }

  async function runBatch(files: File[]) {
    setError("");
    setBatchResults([]);
    setPhase("ocr");
    const items: { filename: string; ocrText: string; ocrConfidence: number }[] = [];
    for (const [i, file] of files.entries()) {
      setBatchStatus(`OCR ${i + 1}/${files.length}: ${file.name}`);
      try {
        const { text, confidence } = await ocrFile(file);
        items.push({ filename: file.name, ocrText: text, ocrConfidence: confidence });
      } catch {
        items.push({ filename: file.name, ocrText: "", ocrConfidence: 0 });
      }
    }
    setBatchStatus("Verifying batch…");
    setPhase("saving");
    try {
      const res = await fetch("/api/documents/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, user: "S. Chen" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Batch failed");
      setBatchResults(data.results);
      setBatchStatus(`Verified ${data.results.length} documents`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch failed");
    }
    setPhase("idle");
  }

  function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length > 1) void runBatch(files);
    else if (files[0]) void runOcr(files[0]);
  }

  async function verify() {
    setPhase("saving");
    setError("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: fileName || "manual.txt",
          ocrText,
          ocrConfidence: confidence || 86,
          user: "S. Chen",
          previewUrl,
        }),
      });
      const doc = await res.json();
      if (!res.ok) throw new Error(doc.error ?? "Verification failed");
      router.push(`/verification/${doc.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setPhase("ready");
    }
  }

  function loadDemo(id: string) {
    const pack = DEMO_PACKS.find((d) => d.id === id);
    if (!pack) return;
    setFileName(pack.filename);
    setOcrText(pack.text);
    setConfidence(pack.confidence);
    setPreviewUrl(undefined);
    setPhase("ready");
    setError("");
  }

  return (
    <div>
      <PageHeader title="Document Ingestion" subtitle="Upload, OCR extract, then auto-verify against AICTE rules" />

      <div className="grid grid-cols-5 gap-4">
        <section className="card col-span-3 p-6">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center transition hover:border-teal-400 hover:bg-teal-50/30"
          >
            <CloudUpload className="mb-3 text-teal-600" />
            <p className="font-medium text-slate-800">Drop a document or click to browse</p>
            <p className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP, or TXT. Select several files for batch verification. OCR runs locally in your browser.</p>
            <input
              type="file"
              accept="image/*,.txt"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            {phase === "ocr" || phase === "saving" ? (
              <Loader2 size={16} className="animate-spin text-teal-600" />
            ) : (
              <FileScan size={16} />
            )}
            {hint}
          </div>

          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Upload preview" className="mt-4 max-h-56 rounded-lg border border-gray-200" />
          ) : null}

          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Extracted text
            <textarea
              value={ocrText}
              onChange={(e) => {
                setOcrText(e.target.value);
                setPhase("ready");
              }}
              rows={14}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-5 text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="OCR output appears here. You can edit before scoring."
            />
          </label>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">OCR confidence: {confidence || "—"}%</p>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void verify()}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-40"
            >
              <Sparkles size={16} />
              Run verification
            </button>
          </div>

          {batchResults.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Risk</th>
                    <th className="px-3 py-2">AI score</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((r, i) => (
                    <tr key={`${r.id}-${i}`} className="border-t border-gray-200">
                      <td className="px-3 py-2">
                        {r.id ? (
                          <a href={`/verification/${r.id}`} className="text-teal-600 hover:underline">{r.filename}</a>
                        ) : (
                          r.filename
                        )}
                      </td>
                      <td className="px-3 py-2">{r.error ?? r.status}</td>
                      <td className="px-3 py-2">{r.error ? "—" : `${r.riskLevel} (${r.riskScore})`}</td>
                      <td className="px-3 py-2">{r.error ? "—" : r.aiScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </section>

        <aside className="card col-span-2 p-5">
          <h2 className="text-sm font-medium text-slate-900">Demo document packs</h2>
          <p className="mt-1 text-xs text-slate-500">
            Known-good NIT/DTU/COEP files plus a forged Horizon Polytechnic credential.
          </p>
          <div className="mt-4 space-y-2">
            {DEMO_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => loadDemo(pack.id)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm transition hover:border-teal-400 hover:bg-teal-50/30"
              >
                <span className="block font-medium text-slate-800">{pack.label}</span>
                <span className="text-xs text-slate-500">{pack.id} · OCR {pack.confidence}%</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
