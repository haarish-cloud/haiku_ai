import { NextResponse } from "next/server";
import { AICTE_GUIDELINES, INSTITUTES, STUDENTS } from "@/lib/aicte";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    guidelines: AICTE_GUIDELINES,
    institutes: INSTITUTES,
    students: STUDENTS.map((s) => ({
      enrollmentNo: s.enrollmentNo,
      name: s.name,
      program: s.program,
      institutePid: s.institutePid,
    })),
  });
}
