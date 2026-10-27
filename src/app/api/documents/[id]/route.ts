import { NextResponse } from "next/server";
import { getDocument, updateDocument } from "@/lib/store";
import type { DocumentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const doc = await getDocument(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { status?: DocumentStatus };
  if (!body.status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }
  const updated = await updateDocument(id, { status: body.status });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
