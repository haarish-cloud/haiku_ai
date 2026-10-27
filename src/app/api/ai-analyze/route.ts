import { NextResponse } from "next/server";
import {
  callGeminiAction,
  getGeminiApiKey,
  getGeminiModelName,
  isGeminiConfigured,
  runGeminiAnalysis,
  type GeminiAction,
} from "@/lib/gemini";
import { getDocument, updateDocument } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const model = getGeminiModelName();
  const configured = isGeminiConfigured();
  return NextResponse.json({
    model,
    configured,
  });
}

export async function POST(request: Request) {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey || apiKey === "your_key_here") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const MODEL_NAME = getGeminiModelName();
    const body = (await request.json()) as {
      documentId?: string;
      ocrText?: string;
      documentType?: string;
      action?: GeminiAction;
    };

    let ocrText = body.ocrText?.trim();
    let docType = body.documentType ?? "Document";

    // If documentId is provided, look up the document
    if (body.documentId) {
      const existingDoc = await getDocument(body.documentId);
      if (existingDoc) {
        ocrText = ocrText || existingDoc.ocrText;
        docType = body.documentType ?? existingDoc.type;
      }
    }

    if (!ocrText) {
      return NextResponse.json(
        { error: "ocrText is required" },
        { status: 400 },
      );
    }

    // If documentId was provided and no specific non-standard action requested,
    // run the comprehensive verification AI analysis and store it.
    if (body.documentId && (!body.action || body.action === "analyze")) {
      const aiAnalysis = await runGeminiAnalysis(ocrText, docType, true);
      if (aiAnalysis) {
        await updateDocument(body.documentId, { aiAnalysis });
      }
      return NextResponse.json({
        success: true,
        model: MODEL_NAME,
        action: "analyze",
        aiAnalysis,
        timestamp: new Date().toISOString(),
      });
    }

    const action = body.action ?? "analyze";
    const result = await callGeminiAction(action, ocrText, docType);

    return NextResponse.json({
      success: true,
      model: MODEL_NAME,
      action,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("timed out"))
    ) {
      return NextResponse.json(
        { error: "Gemini API request timed out — all models were unavailable" },
        { status: 504 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("GEMINI_API_KEY is not configured")) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Failed to execute Gemini analysis", details: message },
      { status: 500 },
    );
  }
}
