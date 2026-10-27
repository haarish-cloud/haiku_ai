import { NextResponse } from "next/server";
import { reportStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await reportStats());
}
