import type { DocumentType, ExtractedFields } from "./types";

function capture(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, " ").trim();
  }
  return undefined;
}

function toNumber(value?: string) {
  if (!value) return undefined;
  const n = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function inferDocumentType(filename: string, text: string): DocumentType {
  const blob = `${filename} ${text}`.toLowerCase();
  if (blob.includes("passport")) return "Passport";
  if (blob.includes("driving") || /\bdl\b/.test(blob)) return "DL";
  if (blob.includes("aadhaar") || blob.includes("identity")) return "ID";
  if (blob.includes("affiliation")) return "Affiliation";
  if (blob.includes("aicte") && blob.includes("approval")) return "AICTE Approval";
  if (blob.includes("transcript")) return "Transcript";
  if (blob.includes("degree") || blob.includes("convocation") || blob.includes("bachelor"))
    return "Degree";
  if (blob.includes("mark") || blob.includes("grade") || blob.includes("semester"))
    return "Marksheet";
  return "Marksheet";
}

export function extractFields(ocrText: string): ExtractedFields {
  const text = ocrText.replace(/\r/g, "");

  const studentName = capture(text, [
    /student\s*name\s*[:\-]\s*(.+)/i,
    /candidate\s*name\s*[:\-]\s*(.+)/i,
    /name\s*of\s*the\s*student\s*[:\-]\s*(.+)/i,
    /^name\s*[:\-]\s*(.+)$/im,
  ]);

  const fatherName = capture(text, [
    /father(?:'s)?\s*name\s*[:\-]\s*(.+)/i,
    /parent\s*name\s*[:\-]\s*(.+)/i,
  ]);

  const dateOfBirth = capture(text, [
    /date\s*of\s*birth\s*[:\-]\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
    /d\.?o\.?b\.?\s*[:\-]\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
  ]);

  const enrollmentNo = capture(text, [
    /enrollment\s*(?:no|number|#)\s*[:\-]\s*([A-Z0-9\-\/]+)/i,
    /roll\s*(?:no|number|#)\s*[:\-]\s*([A-Z0-9\-\/]+)/i,
    /registration\s*(?:no|number|#)\s*[:\-]\s*([A-Z0-9\-\/]+)/i,
  ]);

  const instituteName = capture(text, [
    /institute\s*[:\-]\s*(.+)/i,
    /institution\s*[:\-]\s*(.+)/i,
    /college\s*[:\-]\s*(.+)/i,
    /university\s*[:\-]\s*(.+)/i,
  ]);

  const institutePid = capture(text, [
    /(?:aicte\s*)?(?:pid|permanent\s*id)\s*[:\-]\s*([0-9\-]+)/i,
    /institute\s*code\s*[:\-]\s*([0-9\-]+)/i,
  ]);

  const program = capture(text, [
    /programme\s*[:\-]\s*(.+)/i,
    /program\s*[:\-]\s*(.+)/i,
    /course\s*[:\-]\s*(.+)/i,
    /branch\s*[:\-]\s*(.+)/i,
  ]);

  const admissionYear = toNumber(
    capture(text, [
      /year\s*of\s*admission\s*[:\-]\s*(\d{4})/i,
      /admission\s*year\s*[:\-]\s*(\d{4})/i,
    ]),
  );

  const passingYear = toNumber(
    capture(text, [
      /year\s*of\s*passing\s*[:\-]\s*(\d{4})/i,
      /passing\s*year\s*[:\-]\s*(\d{4})/i,
      /graduating\s*year\s*[:\-]\s*(\d{4})/i,
    ]),
  );

  const durationYears = toNumber(
    capture(text, [/duration\s*[:\-]\s*(\d+)\s*(?:year|yr)/i]),
  );

  const cgpa = toNumber(capture(text, [/c\.?g\.?p\.?a\.?\s*[:\-]\s*([0-9.]+)/i]));
  const percentage = toNumber(
    capture(text, [/percentage\s*[:\-]\s*([0-9.]+)/i, /marks\s*\(%\)\s*[:\-]\s*([0-9.]+)/i]),
  );

  const aicteApprovalNo = capture(text, [
    /aicte\s*approval\s*(?:no|number|#)\s*[:\-]\s*([A-Z0-9\-\/]+)/i,
    /f\.?\s*no\.?\s*[:\-]\s*([A-Z0-9\-\/]+)/i,
  ]);

  const documentDate = capture(text, [
    /date\s*[:\-]\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4})/i,
  ]);

  return {
    studentName,
    fatherName,
    dateOfBirth,
    enrollmentNo,
    instituteName,
    institutePid,
    program,
    admissionYear,
    passingYear,
    durationYears,
    cgpa,
    percentage,
    aicteApprovalNo,
    documentDate,
  };
}

export function normalizeDate(value?: string) {
  if (!value) return undefined;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return value;
  const parts = value.split(/[\/\-.]/).map((p) => p.trim());
  if (parts.length !== 3) return value;
  const [a, b, c] = parts;
  if (c.length === 4) {
    const day = a.padStart(2, "0");
    const month = b.padStart(2, "0");
    return `${c}-${month}-${day}`;
  }
  return value;
}
