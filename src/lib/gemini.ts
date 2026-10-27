import type { DocumentAIAnalysis } from "./types";

export type GeminiAction =
  | "analyze"
  | "detect_anomaly"
  | "compliance_check"
  | "verify_authority";

export interface GeminiAnalyzeResult {
  classification?: string;
  confidenceScore?: number;
  overallRisk?: string;
  extractedFields?: Record<string, unknown>;
  completenessCheck?: string;
  missingFields?: string[];
  anomalies?: string[];
  verdictSummary?: string;
  recommendedAction?: string;
}

export interface GeminiAnomalyFinding {
  indicator: string;
  evidence: string;
  severity: "high" | "medium" | "low" | string;
  recommendation: string;
}

export interface GeminiAnomalyResult {
  riskLevel?: string;
  forgeryProbabilityPercent?: number;
  suspectedTampering?: boolean;
  findings?: GeminiAnomalyFinding[];
  forensicConclusion?: string;
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim();
}

export function isGeminiConfigured(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && key !== "your_key_here");
}

export function getGeminiModelName(): string {
  const model = process.env.GEMINI_MODEL?.trim();
  if (!model) {
    return "gemini-3.5-flash";
  }
  return model;
}

/**
 * Ordered list of models to try when the primary model is unavailable (503).
 * The primary model from env is always tried first; these are fallbacks.
 */
const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
];

/**
 * Strips Markdown code blocks (e.g. ```json ... ```) and safely parses JSON.
 */
export function safeJsonParse<T = unknown>(raw: string): T {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return JSON.parse(cleaned) as T;
}

export function getPromptForAction(
  action: GeminiAction,
  ocrText: string,
  docType = "Document",
): string {
  switch (action) {
    case "analyze":
      return `You are the official AICTE Document Scrutiny AI powered by Google Gemini.
Analyze this submitted technical education credential ("${docType}"):

Provide a comprehensive verification assessment in strictly valid JSON:
{
  "classification": "Confirmed Document Classification (e.g., Marksheet / Degree / AICTE EoA)",
  "confidenceScore": 95,
  "overallRisk": "Low" | "Medium" | "High",
  "extractedFields": {
    "studentName": "Extracted student name",
    "enrollmentNo": "Enrollment or Roll ID",
    "instituteName": "Institution name",
    "aictePid": "AICTE Permanent ID if found",
    "programme": "Programme / Branch name",
    "durationYears": 4,
    "passingYear": 2025,
    "cgpa": 8.5
  },
  "completenessCheck": "Pass" | "Action Required",
  "missingFields": ["Any missing mandatory fields according to AICTE handbook"],
  "anomalies": ["Any discrepancies, contradictory dates, or irregularities"],
  "verdictSummary": "2-3 sentences official AICTE scrutiny summary",
  "recommendedAction": "Approve" | "Manual Physical Scrutiny Required" | "Reject"
}

OCR Text to analyze:
"""
${ocrText}
"""`;

    case "detect_anomaly":
      return `You are an AICTE Forensic Document Manipulation & Forgery Detection Specialist.
Analyze the following document OCR content for signs of tampering, fake credentials, or illegal alteration:

Respond in strictly valid JSON:
{
  "riskLevel": "Low" | "Medium" | "High",
  "forgeryProbabilityPercent": 15,
  "suspectedTampering": boolean,
  "findings": [
    {
      "indicator": "Name of observed anomaly (e.g. Impossible Duration, CGPA Scale Breach)",
      "evidence": "Exact text or numbers triggering the flag",
      "severity": "high" | "medium" | "low",
      "recommendation": "Instructions for AICTE scrutiny committee"
    }
  ],
  "forensicConclusion": "Detailed explanation of whether this credential shows indicators of alteration"
}

OCR Text:
"""
${ocrText}
"""`;

    case "compliance_check":
      return `You are the AICTE Regulatory Compliance Officer reviewing an institution against the AICTE Approval Process Handbook (APH) 2024.
Evaluate these details against mandatory regulatory guidelines:
- Guideline 1: Institute AICTE Approval Validity
- Guideline 2: Approved Program Nomenclature & Duration
- Guideline 3: Academic Credit Framework & CGPA Range (0-10 scale)
- Guideline 4: Admission vs Passing Timeline Validity
- Guideline 5: Institutional Identifier & PID Validation

Respond in strictly valid JSON:
{
  "overallComplianceScore": 88,
  "complianceStatus": "Compliant" | "Deficient" | "Non-Compliant",
  "ruleChecks": [
    {
      "ruleId": "APH-01",
      "title": "Rule title",
      "passed": true,
      "clause": "Approval Process Handbook Clause",
      "notes": "Evidence from document"
    }
  ],
  "deficienciesIdentified": ["List of non-compliant gaps"],
  "recommendationForEoA": "Approval recommendation for competent AICTE authority"
}

OCR Text:
"""
${ocrText}
"""`;

    case "verify_authority":
      return `Analyze this technical education document to determine issuing authority verification details:
Respond in strictly valid JSON:
{
  "issuingAuthority": "Name of University, State Technical Board, or AICTE",
  "digitalIdentifiers": ["Reference No", "Approval No", "QR Tag", "Digital Signature"],
  "verificationChannel": "DigiLocker / National Academic Depository / University ERP API",
  "authStatus": "Verified" | "Mismatch Detected" | "Manual Review Required",
  "confidencePercent": 92,
  "auditObservations": "Detailed verification findings"
}

OCR Text:
"""
${ocrText}
"""`;
  }
}

/**
 * Returns true if the error is retryable (503, 429, or timeout).
 */
function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return (
    msg.includes("timed out") ||
    msg.includes("(503)") ||
    msg.includes("(429)") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    err.name === "AbortError"
  );
}

/**
 * Waits for `ms` milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const GEMINI_TIMEOUT_MS = 60_000; // 60 seconds per attempt
const MAX_RETRIES = 2; // 2 retries per model (total 3 attempts), then move to fallback
const BASE_DELAY_MS = 2_000; // 2s initial backoff before retries

/**
 * Low-level call to a specific Gemini model with retry + exponential backoff.
 * Returns the raw text from the model.
 */
async function callGeminiModel(
  prompt: string,
  apiKey: string,
  modelName: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Exponential backoff before retries (skip delay on first attempt)
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(
        `[${modelName}] Gemini retry ${attempt}/${MAX_RETRIES} after ${delay}ms delay...`,
      );
      await sleep(delay);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        const error = new Error(
          `Gemini API returned error (${response.status}): ${errText}`,
        );
        // 404 means model doesn't exist for this key — skip immediately
        if (response.status === 404) {
          throw error;
        }
        // Retry on 503/429, throw immediately on other errors
        if (
          (response.status === 503 || response.status === 429) &&
          attempt < MAX_RETRIES
        ) {
          lastError = error;
          console.warn(
            `[${modelName}] Gemini API ${response.status} on attempt ${attempt + 1}, will retry...`,
          );
          continue;
        }
        throw error;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("No response text generated by Gemini");
      }

      return rawText;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        lastError = new Error(
          `Gemini API request timed out after ${GEMINI_TIMEOUT_MS / 1000} seconds`,
        );
        if (attempt < MAX_RETRIES) {
          console.warn(
            `[${modelName}] Gemini timeout on attempt ${attempt + 1}, will retry...`,
          );
          continue;
        }
        throw lastError;
      }
      // Retry other transient errors
      if (isRetryableError(err) && attempt < MAX_RETRIES) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `[${modelName}] Gemini retryable error on attempt ${attempt + 1}, will retry...`,
        );
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Should not reach here, but just in case
  throw lastError ?? new Error("Gemini API failed after all retries");
}

/**
 * High-level Gemini call with:
 * - Retry with exponential backoff per model
 * - Automatic fallback to alternative models on persistent 503/429
 */
export async function callGemini(prompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const primaryModel = getGeminiModelName();
  const modelsToTry = [
    primaryModel,
    ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const result = await callGeminiModel(prompt, apiKey, model);
      if (model !== primaryModel) {
        console.log(
          `✓ Gemini succeeded with fallback model "${model}" (primary "${primaryModel}" was unavailable)`,
        );
      }
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const is503or429 =
        lastError.message.includes("(503)") ||
        lastError.message.includes("(429)") ||
        lastError.message.includes("timed out");
      const is404 = lastError.message.includes("(404)");

      // 404 = model not available for this key, skip to next
      // 503/429/timeout = model overloaded, skip to next
      if (
        (is503or429 || is404) &&
        model !== modelsToTry[modelsToTry.length - 1]
      ) {
        if (is404) {
          console.warn(
            `⚠ Model "${model}" not found (404), trying next fallback...`,
          );
        } else {
          console.warn(
            `⚠ Model "${model}" unavailable after retries, trying next fallback...`,
          );
        }
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("All Gemini models failed");
}

/**
 * Calls Gemini for a specific action and parses JSON.
 */
export async function callGeminiAction<T = unknown>(
  action: GeminiAction,
  ocrText: string,
  docType = "Document",
): Promise<T> {
  const prompt = getPromptForAction(action, ocrText, docType);
  const rawText = await callGemini(prompt);
  try {
    return safeJsonParse<T>(rawText);
  } catch {
    return { rawText } as T;
  }
}

/**
 * Orchestrates analyze + detect_anomaly for full verification dossier enhancement.
 * Safe fallback: Never throws; returns null if API key is not configured or fails.
 */
export async function runGeminiAnalysis(
  ocrText: string,
  docType?: string,
  throwOnError = false,
): Promise<DocumentAIAnalysis | null> {
  if (!isGeminiConfigured()) {
    if (throwOnError) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    return null;
  }

  let analyzeError: Error | null = null;
  let anomalyError: Error | null = null;

  try {
    // Run sequentially to reduce concurrent API load and avoid double-503
    const analyzeRes = await callGeminiAction<GeminiAnalyzeResult>(
      "analyze",
      ocrText,
      docType,
    ).catch((err) => {
      analyzeError = err instanceof Error ? err : new Error(String(err));
      console.warn("Gemini analyze failed after retries:", err);
      return null;
    });

    const anomalyRes = await callGeminiAction<GeminiAnomalyResult>(
      "detect_anomaly",
      ocrText,
      docType,
    ).catch((err) => {
      anomalyError = err instanceof Error ? err : new Error(String(err));
      console.warn("Gemini detect_anomaly failed after retries:", err);
      return null;
    });

    if (!analyzeRes && !anomalyRes) {
      if (throwOnError) {
        throw analyzeError || anomalyError || new Error("Gemini analysis returned no results");
      }
      return null;
    }

    const anomalies: string[] = [];
    if (Array.isArray(analyzeRes?.anomalies)) {
      anomalies.push(...analyzeRes.anomalies);
    }
    if (Array.isArray(anomalyRes?.findings)) {
      for (const f of anomalyRes.findings) {
        const text = f.indicator
          ? `${f.indicator}${f.evidence ? `: ${f.evidence}` : ""}`
          : "";
        if (text && !anomalies.includes(text)) {
          anomalies.push(text);
        }
      }
    }

    const forgeryProbability =
      typeof anomalyRes?.forgeryProbabilityPercent === "number"
        ? anomalyRes.forgeryProbabilityPercent
        : 0;

    const analysis: DocumentAIAnalysis = {
      classification:
        analyzeRes?.classification ?? docType ?? "Document",
      confidenceScore:
        typeof analyzeRes?.confidenceScore === "number"
          ? analyzeRes.confidenceScore
          : 90,
      overallRisk:
        analyzeRes?.overallRisk ?? anomalyRes?.riskLevel ?? "Low",
      forgeryProbability,
      anomalies,
      verdictSummary:
        analyzeRes?.verdictSummary ??
        anomalyRes?.forensicConclusion ??
        "AI analysis completed.",
      recommendedAction:
        analyzeRes?.recommendedAction ??
        (anomalyRes?.suspectedTampering
          ? "Manual Physical Scrutiny Required"
          : "Approve"),
      details: {
        analyze: (analyzeRes as unknown as Record<string, unknown>) ?? undefined,
        anomaly: (anomalyRes as unknown as Record<string, unknown>) ?? undefined,
      },
      model: getGeminiModelName(),
      analyzedAt: new Date().toISOString(),
    };

    return analysis;
  } catch (err) {
    console.warn("runGeminiAnalysis error:", err);
    return null;
  }
}
