import { NextResponse } from "next/server";
import { resetDocuments } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const docs = await resetDocuments();
  return NextResponse.json({ ok: true, count: docs.length });
}
