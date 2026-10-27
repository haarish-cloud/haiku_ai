# VERIFY AI

Dark-mode prototype for an AI-powered academic document verification desk. Analysts ingest credentials, run browser OCR, cross-check identity fields against a student/institute registry, score AICTE Approval Process Handbook rules, and see an explainable risk breakdown.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What is in the prototype

- **Dashboard** — KPI cards, verification mix, compliance risk gauge, recent activity, anomaly flags.
- **Document upload** — drag-and-drop image/text ingestion, Tesseract.js OCR, demo packs.
- **Verification** — queue plus per-document dossier (OCR fields, mismatches, AICTE checks, additive risk factors).
- **Compliance** — searchable AICTE guidelines and a live institute/programme checker.
- **Reports** — throughput, compliance pass rate, risk distribution and top AICTE failures (`/api/reports`).
- **Batch upload** — select several files at once; each is OCR’d then verified via `/api/documents/batch` (max 25).
- **Settings** — risk-threshold display and demo-data reset.

Documents persist in `data/documents.json` after the first request.

Known-good demo identities: Priya Sharma (NIT Trichy), Arjun Deshmukh (COEP), Meera Kapoor (DTU). The Horizon Polytechnic pack is designed to fail approval, duration, and marks checks.
