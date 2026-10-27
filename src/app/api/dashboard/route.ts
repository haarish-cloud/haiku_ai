import { NextResponse } from "next/server";
import { dashboardStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await dashboardStats();
  return NextResponse.json(stats);
}
