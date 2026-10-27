import { NextResponse } from "next/server";
import { inferDocumentType } from "@/lib/extract";
import { runGeminiAnalysis } from "@/lib/gemini";
import { addDocument } from "@/lib/store";
import { verifyDocument } from "@/lib/verify";
import type { BatchResult, DocumentAIAnalysis } from "@/lib/types";

export const dynamic = "force-dynamic";

interface BatchItem {
  filename?: string;
  ocrText?: string;
  ocrConfidence?: number;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { items?: BatchItem[]; user?: string };
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items[] is required" }, { status: 400 });
  }
  if (items.length > 25) {
    return NextResponse.json({ error: "Batch limited to 25 documents" }, { status: 400 });
  }

  const results: BatchResult[] = [];
  for (const [i, item] of items.entries()) {
    const filename = item.filename ?? `upload-${i + 1}.txt`;
    const ocrText = item.ocrText?.trim();
    if (!ocrText) {
      results.push({
        id: "",
        filename,
        status: "Pending",
        riskLevel: "Medium",
        aiScore: 0,
        riskScore: 0,
        error: "No text extracted",
      });
      continue;
    }
    const ocrConfidence = Number(item.ocrConfidence ?? 85);
    const result = verifyDocument({ ocrText, ocrConfidence, filename });
    const docType = result.type ?? inferDocumentType(filename, ocrText);

    let aiAnalysis: DocumentAIAnalysis | undefined;
    try {
      const aiRes = await runGeminiAnalysis(ocrText, docType);
      if (aiRes) {
        aiAnalysis = aiRes;
      }
    } catch (err) {
      console.warn("Gemini batch analysis error (continuing):", err);
    }

    const stored = await addDocument({
      user: body.user ?? "S. Chen",
      type: docType,
      filename,
      ocrText,
      ocrConfidence,
      aiScore: Math.round(result.aiScore),
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      status: result.status,
      extracted: result.extracted,
      mismatches: result.mismatches,
      compliance: result.compliance,
      factors: result.factors,
      summary: result.summary,
      aiAnalysis,
    });
    results.push({
      id: stored.id,
      filename,
      status: stored.status,
      riskLevel: stored.riskLevel,
      aiScore: stored.aiScore,
      riskScore: stored.riskScore,
    });
  }
  return NextResponse.json({ results });
}
