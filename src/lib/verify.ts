import {
  AICTE_GUIDELINES,
  findInstitute,
  findProgram,
  findStudent,
  STUDENTS,
} from "./aicte";
import { extractFields, inferDocumentType, normalizeDate } from "./extract";
import type {
  ComplianceCheck,
  DocumentStatus,
  DocumentType,
  FieldMismatch,
  RiskFactor,
  RiskLevel,
  VerificationResult,
} from "./types";

function similar(a?: string, b?: string) {
  if (!a || !b) return false;
  const na = a.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nb = b.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

function riskLevel(score: number): RiskLevel {
  if (score >= 55) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

function statusFromRisk(score: number, mismatches: FieldMismatch[]): DocumentStatus {
  if (score >= 55 || mismatches.some((m) => m.severity === "high")) return "Flagged";
  if (score >= 30) return "Pending";
  return "Verified";
}

export function verifyDocument(input: {
  ocrText: string;
  ocrConfidence: number;
  filename?: string;
  type?: DocumentType;
}): VerificationResult & { type: DocumentType } {
  const extracted = extractFields(input.ocrText);
  extracted.dateOfBirth = normalizeDate(extracted.dateOfBirth);
  const type = input.type ?? inferDocumentType(input.filename ?? "", input.ocrText);

  const mismatches: FieldMismatch[] = [];
  const compliance: ComplianceCheck[] = [];
  const factors: RiskFactor[] = [];

  const student =
    findStudent(extracted.enrollmentNo) ?? findStudent(extracted.studentName);
  const institute =
    findInstitute(extracted.institutePid) ?? findInstitute(extracted.instituteName);
  const program = institute ? findProgram(institute, extracted.program) : undefined;

  if (extracted.studentName && student && !similar(extracted.studentName, student.name)) {
    mismatches.push({
      field: "Student name",
      extracted: extracted.studentName,
      expected: student.name,
      severity: "high",
      reason: "Name on the document does not match the enrollment record.",
    });
  }

  if (extracted.fatherName && student && !similar(extracted.fatherName, student.fatherName)) {
    mismatches.push({
      field: "Father name",
      extracted: extracted.fatherName,
      expected: student.fatherName,
      severity: "medium",
      reason: "Parent name diverges from the student master record.",
    });
  }

  if (
    extracted.dateOfBirth &&
    student &&
    extracted.dateOfBirth !== student.dateOfBirth
  ) {
    mismatches.push({
      field: "Date of birth",
      extracted: extracted.dateOfBirth,
      expected: student.dateOfBirth,
      severity: "high",
      reason: "Date of birth does not cross-check against the registry.",
    });
  }

  if (
    extracted.enrollmentNo &&
    student &&
    extracted.enrollmentNo.replace(/\s/g, "").toUpperCase() !==
      student.enrollmentNo.toUpperCase()
  ) {
    mismatches.push({
      field: "Enrollment number",
      extracted: extracted.enrollmentNo,
      expected: student.enrollmentNo,
      severity: "high",
      reason: "Enrollment / roll number does not match a known student.",
    });
  }

  if (extracted.program && student && !similar(extracted.program, student.program)) {
    mismatches.push({
      field: "Programme",
      extracted: extracted.program,
      expected: student.program,
      severity: "high",
      reason: "Programme on the credential does not match the admitted branch.",
    });
  }

  if (extracted.cgpa && student && Math.abs(extracted.cgpa - student.cgpa) > 0.3) {
    mismatches.push({
      field: "CGPA",
      extracted: String(extracted.cgpa),
      expected: String(student.cgpa),
      severity: "medium",
      reason: "Reported CGPA differs from the academic record beyond tolerance (0.3).",
    });
  }

  if (
    extracted.instituteName &&
    institute &&
    !similar(extracted.instituteName, institute.name) &&
    !institute.aliases.some((a) => similar(extracted.instituteName, a))
  ) {
    mismatches.push({
      field: "Institute",
      extracted: extracted.instituteName,
      expected: institute.name,
      severity: "medium",
      reason: "Institute name does not align with the AICTE PID mapping.",
    });
  }

  if (!student && (extracted.enrollmentNo || extracted.studentName)) {
    mismatches.push({
      field: "Student record",
      extracted: extracted.enrollmentNo ?? extracted.studentName ?? "n/a",
      expected: "Match in student registry",
      severity: "high",
      reason: "No student master record found for cross-reference.",
    });
  }

  const g1 = Boolean(institute?.aicteApproved);
  compliance.push({
    id: "G1",
    guideline: AICTE_GUIDELINES[0].title,
    clause: AICTE_GUIDELINES[0].clause,
    passed: g1,
    detail: institute
      ? g1
        ? `${institute.name} holds a current AICTE approval (PID ${institute.pid}).`
        : `${institute.name} is not AICTE-approved.`
      : "Institute could not be resolved against the AICTE directory.",
  });

  const durationOk = program
    ? !extracted.durationYears || extracted.durationYears === program.durationYears
    : !extracted.durationYears;
  compliance.push({
    id: "G2",
    guideline: AICTE_GUIDELINES[1].title,
    clause: AICTE_GUIDELINES[1].clause,
    passed: Boolean(program) && durationOk,
    detail: program
      ? `Approved duration for ${program.name} is ${program.durationYears} years.`
      : "Programme duration could not be validated.",
  });

  compliance.push({
    id: "G3",
    guideline: AICTE_GUIDELINES[2].title,
    clause: AICTE_GUIDELINES[2].clause,
    passed: Boolean(program),
    detail: program
      ? `${program.name} (${program.code}) is on the approved list, intake ${program.intake}.`
      : `Programme "${extracted.program ?? "unknown"}" is not on the institute’s approved list.`,
  });

  const scoreOk =
    (extracted.cgpa === undefined || (extracted.cgpa >= 0 && extracted.cgpa <= 10)) &&
    (extracted.percentage === undefined ||
      (extracted.percentage >= 0 && extracted.percentage <= 100));
  compliance.push({
    id: "G4",
    guideline: AICTE_GUIDELINES[3].title,
    clause: AICTE_GUIDELINES[3].clause,
    passed: scoreOk,
    detail: scoreOk
      ? "CGPA/percentage values are within the permitted scale."
      : "Marks are outside the valid CGPA 0–10 or percentage 0–100 range.",
  });

  const yearOk = program
    ? !extracted.admissionYear ||
      (extracted.admissionYear >= program.approvalFrom &&
        extracted.admissionYear <= program.approvalTo)
    : false;
  compliance.push({
    id: "G5",
    guideline: AICTE_GUIDELINES[4].title,
    clause: AICTE_GUIDELINES[4].clause,
    passed: yearOk,
    detail: program
      ? `Approval window ${program.approvalFrom}–${program.approvalTo}; admission ${extracted.admissionYear ?? "n/a"}.`
      : "Admission year cannot be checked without an approved programme.",
  });

  const identityOk = mismatches.filter((m) =>
    ["Student name", "Date of birth", "Enrollment number"].includes(m.field),
  ).length === 0 && Boolean(student);
  compliance.push({
    id: "G6",
    guideline: AICTE_GUIDELINES[5].title,
    clause: AICTE_GUIDELINES[5].clause,
    passed: identityOk,
    detail: identityOk
      ? `Identity fields match student ${student?.enrollmentNo}.`
      : "Identity fields failed cross-reference.",
  });

  const minPass = program && extracted.admissionYear
    ? (extracted.passingYear ?? 9999) >= extracted.admissionYear + program.durationYears - 1
    : false;
  compliance.push({
    id: "G7",
    guideline: AICTE_GUIDELINES[6].title,
    clause: AICTE_GUIDELINES[6].clause,
    passed: minPass,
    detail:
      program && extracted.admissionYear
        ? `Earliest valid passing year is ${extracted.admissionYear + program.durationYears - 1}.`
        : "Passing year vs duration could not be computed.",
  });

  const addFactor = (factor: RiskFactor) => factors.push(factor);

  mismatches
    .filter((m) => m.severity === "high")
    .forEach((m) =>
      addFactor({
        id: `mm-${m.field}`,
        label: `Mismatch: ${m.field}`,
        points: 18,
        evidence: `${m.extracted} ≠ ${m.expected}. ${m.reason}`,
        recommendation: "Hold the file and request a certified re-issue or registrar confirmation.",
      }),
    );

  mismatches
    .filter((m) => m.severity === "medium")
    .forEach((m) =>
      addFactor({
        id: `mm2-${m.field}`,
        label: `Soft mismatch: ${m.field}`,
        points: 8,
        evidence: `${m.extracted} vs ${m.expected}. ${m.reason}`,
        recommendation: "Confirm with the institute before auto-approving.",
      }),
    );

  if (!g1) {
    addFactor({
      id: "unapproved-inst",
      label: "Institute not AICTE-approved",
      points: 32,
      evidence: compliance[0].detail,
      recommendation: "Reject for technical-education use until AICTE listing is proven.",
    });
  }
  if (!program) {
    addFactor({
      id: "unapproved-prog",
      label: "Programme not on approved list",
      points: 22,
      evidence: extracted.program ?? "Programme missing from OCR",
      recommendation: "Check AICTE Approval Process Handbook programme names.",
    });
  }
  if (!scoreOk) {
    addFactor({
      id: "invalid-marks",
      label: "Invalid assessment range",
      points: 14,
      evidence: `CGPA ${extracted.cgpa ?? "—"}, % ${extracted.percentage ?? "—"}`,
      recommendation: "Treat as possible tampering; re-OCR at higher DPI.",
    });
  }
  if (!minPass && extracted.passingYear) {
    addFactor({
      id: "duration",
      label: "Duration / passing-year violation",
      points: 16,
      evidence: `Admission ${extracted.admissionYear ?? "—"}, passing ${extracted.passingYear}`,
      recommendation: "Flag for academic-integrity review.",
    });
  }
  if (input.ocrConfidence < 70) {
    addFactor({
      id: "ocr-quality",
      label: "Low OCR confidence",
      points: 10,
      evidence: `Engine confidence ${input.ocrConfidence.toFixed(1)}%`,
      recommendation: "Re-scan the original at 300 DPI or upload a clearer image.",
    });
  }
  if (!extracted.aicteApprovalNo && type === "AICTE Approval") {
    addFactor({
      id: "missing-approval-no",
      label: "Missing AICTE letter number",
      points: 12,
      evidence: "No F.No / approval number extracted.",
      recommendation: "Require the full approval letter with QR/F.No.",
    });
  }

  const riskScore = Math.min(
    100,
    factors.reduce((sum, f) => sum + f.points, 0),
  );
  const aiScore = Math.max(12, 100 - riskScore);
  const status = statusFromRisk(riskScore, mismatches);
  const level = riskLevel(riskScore);

  const failed = compliance.filter((c) => !c.passed).length;
  const summary =
    status === "Verified"
      ? `Credential cross-checked against ${student?.enrollmentNo ?? "registry"} and AICTE rules with ${failed} guideline gap(s).`
      : status === "Pending"
        ? `Needs analyst review: ${mismatches.length} mismatch(es), ${failed} AICTE check(s) failed.`
        : `High-risk file. ${mismatches.length} mismatch(es) and ${failed} failed AICTE checks. Do not auto-approve.`;

  return {
    type,
    extracted,
    mismatches,
    compliance,
    factors,
    riskScore,
    aiScore,
    riskLevel: level,
    status,
    matchedStudentId: student?.id,
    matchedInstitutePid: institute?.pid,
    summary,
  };
}

export function listKnownStudents() {
  return STUDENTS;
}
