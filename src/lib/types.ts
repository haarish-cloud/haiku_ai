export type DocumentStatus = "Verified" | "Pending" | "Flagged";
export type DocumentType =
  | "Degree"
  | "Marksheet"
  | "Transcript"
  | "AICTE Approval"
  | "Affiliation"
  | "ID"
  | "Passport"
  | "DL";

export type RiskLevel = "Low" | "Medium" | "High";

export interface ExtractedFields {
  studentName?: string;
  fatherName?: string;
  dateOfBirth?: string;
  enrollmentNo?: string;
  instituteName?: string;
  institutePid?: string;
  program?: string;
  admissionYear?: number;
  passingYear?: number;
  durationYears?: number;
  cgpa?: number;
  percentage?: number;
  aicteApprovalNo?: string;
  documentDate?: string;
}

export interface FieldMismatch {
  field: string;
  extracted: string;
  expected: string;
  severity: "high" | "medium" | "low";
  reason: string;
}

export interface ComplianceCheck {
  id: string;
  guideline: string;
  clause: string;
  passed: boolean;
  detail: string;
}

export interface RiskFactor {
  id: string;
  label: string;
  points: number;
  evidence: string;
  recommendation: string;
}

export interface VerificationResult {
  extracted: ExtractedFields;
  mismatches: FieldMismatch[];
  compliance: ComplianceCheck[];
  factors: RiskFactor[];
  riskScore: number;
  aiScore: number;
  riskLevel: RiskLevel;
  status: DocumentStatus;
  matchedStudentId?: string;
  matchedInstitutePid?: string;
  summary: string;
}

export interface DocumentAIAnalysis {
  classification?: string;
  confidenceScore?: number;
  overallRisk?: RiskLevel | string;
  forgeryProbability?: number;
  anomalies?: string[];
  verdictSummary?: string;
  recommendedAction?: string;
  details?: {
    analyze?: Record<string, unknown>;
    anomaly?: Record<string, unknown>;
  };
  model?: string;
  analyzedAt?: string;
}

export interface StoredDocument {
  id: string;
  user: string;
  type: DocumentType;
  filename: string;
  uploadedAt: string;
  ocrText: string;
  ocrConfidence: number;
  previewUrl?: string;
  aiScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  status: DocumentStatus;
  extracted: ExtractedFields;
  mismatches: FieldMismatch[];
  compliance: ComplianceCheck[];
  factors: RiskFactor[];
  summary: string;
  audit: AuditEntry[];
  aiAnalysis?: DocumentAIAnalysis;
}

export interface AuditEntry {
  timestamp: string;
  action: "created" | "status_changed" | "re_verified";
  actor: string;
  from?: string;
  to?: string;
  note?: string;
}

export interface DashboardStats {
  totalDocs: number;
  pending: number;
  verified: number;
  flagged: number;
  totalDelta: number;
  pendingDelta: number;
  verifiedRate: number;
  flaggedRate: number;
  avgRisk: number;
  highRiskDocs: number;
  statusSeries: { day: string; Verified: number; Pending: number; Flagged: number }[];
  riskTrend: { day: string; risk: number }[];
  issueBreakdown: { name: string; value: number; color: string }[];
  anomalyFlags: { name: string; value: number; color: string }[];
  alerts: { id: string; title: string; time: string; tone: "high" | "warn" }[];
  recent: StoredDocument[];
  typeBreakdown: { name: string; value: number; color: string }[];
}

export interface ReportStats {
  weeklyTrend: { week: string; processed: number; verified: number; flagged: number }[];
  complianceOverTime: { month: string; passRate: number }[];
  riskDistribution: { bucket: string; count: number }[];
  topFailures: { reason: string; count: number }[];
  docTypeVolume: { type: string; count: number }[];
  summary: {
    totalProcessed: number;
    avgRiskScore: number;
    complianceRate: number;
    avgProcessingTime: string;
  };
}

export interface BatchResult {
  id: string;
  filename: string;
  status: DocumentStatus;
  riskLevel: RiskLevel;
  aiScore: number;
  riskScore: number;
  error?: string;
}
