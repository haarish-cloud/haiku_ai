import { NextResponse } from "next/server";
import { inferDocumentType } from "@/lib/extract";
import { runGeminiAnalysis } from "@/lib/gemini";
import { addDocument, listDocuments } from "@/lib/store";
import { verifyDocument } from "@/lib/verify";
import type { DocumentAIAnalysis } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const docs = await listDocuments();
  return NextResponse.json(docs);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    filename?: string;
    ocrText?: string;
    ocrConfidence?: number;
    user?: string;
    previewUrl?: string;
  };

  const ocrText = body.ocrText?.trim();
  if (!ocrText) {
    return NextResponse.json({ error: "ocrText is required" }, { status: 400 });
  }

  const filename = body.filename ?? "upload.txt";
  const ocrConfidence = Number(body.ocrConfidence ?? 85);
  const result = verifyDocument({
    ocrText,
    ocrConfidence,
    filename,
  });

  const docType = result.type ?? inferDocumentType(filename, ocrText);

  let aiAnalysis: DocumentAIAnalysis | undefined;
  try {
    const aiRes = await runGeminiAnalysis(ocrText, docType);
    if (aiRes) {
      aiAnalysis = aiRes;
    }
  } catch (err) {
    console.warn("Gemini analysis error during upload (continuing):", err);
  }

  const stored = await addDocument({
    user: body.user ?? "S. Chen",
    type: docType,
    filename,
    ocrText,
    ocrConfidence,
    previewUrl: body.previewUrl,
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

  return NextResponse.json(stored);
}
