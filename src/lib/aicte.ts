export interface ApprovedProgram {
  name: string;
  code: string;
  durationYears: number;
  intake: number;
  approvalFrom: number;
  approvalTo: number;
  level: "UG" | "PG" | "Diploma";
}

export interface InstituteRecord {
  pid: string;
  name: string;
  aliases: string[];
  state: string;
  aicteApproved: boolean;
  programs: ApprovedProgram[];
}

export interface StudentRecord {
  id: string;
  enrollmentNo: string;
  name: string;
  fatherName: string;
  dateOfBirth: string;
  institutePid: string;
  program: string;
  admissionYear: number;
  expectedPassingYear: number;
  cgpa: number;
}

export const AICTE_GUIDELINES = [
  {
    id: "G1",
    clause: "Approval Process Handbook 2024, Ch. I",
    title: "Institute must hold valid AICTE approval",
    text: "Technical institutions offering degree/diploma programmes shall operate only with a current AICTE approval covering the academic year of admission.",
  },
  {
    id: "G2",
    clause: "APH 2024, Programme Duration",
    title: "Programme duration must match approved level",
    text: "UG engineering (B.E./B.Tech) is 4 academic years, Diploma 3 years, PG (M.E./M.Tech/MBA/MCA) 2 years unless otherwise notified.",
  },
  {
    id: "G3",
    clause: "APH 2024, Appendix 1",
    title: "Programme must be on the approved list",
    text: "A student credential is valid only if the course/branch appears in the institute’s AICTE-approved programme list for that year.",
  },
  {
    id: "G4",
    clause: "UGC/AICTE Credit Framework",
    title: "Assessment scores must be in a valid range",
    text: "CGPA shall be on a 10-point scale (0–10). Percentage marks shall be between 0 and 100.",
  },
  {
    id: "G5",
    clause: "APH 2024, Intake",
    title: "Admission year must fall inside approval window",
    text: "The year of admission must lie between the programme’s approval-from and approval-to years inclusive.",
  },
  {
    id: "G6",
    clause: "Academic Integrity",
    title: "Identity fields must be consistent",
    text: "Candidate name, parent name, date of birth and enrollment number must cross-match the institute student record and companion documents.",
  },
  {
    id: "G7",
    clause: "Minimum instructional days",
    title: "Passing year cannot precede minimum duration",
    text: "Year of passing shall not be earlier than admission year plus approved programme duration minus one (allowing the final exam year).",
  },
] as const;

export const INSTITUTES: InstituteRecord[] = [
  {
    pid: "1-35147581",
    name: "National Institute of Technology, Tiruchirappalli",
    aliases: ["NIT Trichy", "NITT", "NIT Tiruchirappalli"],
    state: "Tamil Nadu",
    aicteApproved: true,
    programs: [
      {
        name: "B.Tech Computer Science and Engineering",
        code: "CSE",
        durationYears: 4,
        intake: 120,
        approvalFrom: 2008,
        approvalTo: 2027,
        level: "UG",
      },
      {
        name: "B.Tech Electronics and Communication Engineering",
        code: "ECE",
        durationYears: 4,
        intake: 120,
        approvalFrom: 2008,
        approvalTo: 2027,
        level: "UG",
      },
      {
        name: "M.Tech Data Analytics",
        code: "DA",
        durationYears: 2,
        intake: 30,
        approvalFrom: 2016,
        approvalTo: 2027,
        level: "PG",
      },
    ],
  },
  {
    pid: "1-21845612",
    name: "College of Engineering Pune",
    aliases: ["COEP", "COEP Pune", "COEP Technological University"],
    state: "Maharashtra",
    aicteApproved: true,
    programs: [
      {
        name: "B.Tech Mechanical Engineering",
        code: "ME",
        durationYears: 4,
        intake: 180,
        approvalFrom: 2005,
        approvalTo: 2026,
        level: "UG",
      },
      {
        name: "MBA",
        code: "MBA",
        durationYears: 2,
        intake: 60,
        approvalFrom: 2012,
        approvalTo: 2026,
        level: "PG",
      },
    ],
  },
  {
    pid: "1-50991200",
    name: "Delhi Technological University",
    aliases: ["DTU", "Delhi College of Engineering", "DCE"],
    state: "Delhi",
    aicteApproved: true,
    programs: [
      {
        name: "B.Tech Information Technology",
        code: "IT",
        durationYears: 4,
        intake: 150,
        approvalFrom: 2010,
        approvalTo: 2027,
        level: "UG",
      },
      {
        name: "MCA",
        code: "MCA",
        durationYears: 2,
        intake: 60,
        approvalFrom: 2014,
        approvalTo: 2026,
        level: "PG",
      },
    ],
  },
  {
    pid: "1-00000001",
    name: "Horizon Private Polytechnic",
    aliases: ["Horizon Polytechnic"],
    state: "Rajasthan",
    aicteApproved: false,
    programs: [],
  },
];

export const STUDENTS: StudentRecord[] = [
  {
    id: "STU-001",
    enrollmentNo: "NITT2021CSE045",
    name: "Priya Sharma",
    fatherName: "Rakesh Sharma",
    dateOfBirth: "2003-04-12",
    institutePid: "1-35147581",
    program: "B.Tech Computer Science and Engineering",
    admissionYear: 2021,
    expectedPassingYear: 2025,
    cgpa: 8.64,
  },
  {
    id: "STU-002",
    enrollmentNo: "COEP2019ME118",
    name: "Arjun Deshmukh",
    fatherName: "Sanjay Deshmukh",
    dateOfBirth: "2001-11-02",
    institutePid: "1-21845612",
    program: "B.Tech Mechanical Engineering",
    admissionYear: 2019,
    expectedPassingYear: 2023,
    cgpa: 7.91,
  },
  {
    id: "STU-003",
    enrollmentNo: "DTU2022IT077",
    name: "Meera Kapoor",
    fatherName: "Anil Kapoor",
    dateOfBirth: "2004-01-28",
    institutePid: "1-50991200",
    program: "B.Tech Information Technology",
    admissionYear: 2022,
    expectedPassingYear: 2026,
    cgpa: 9.12,
  },
  {
    id: "STU-004",
    enrollmentNo: "NITT2020ECE019",
    name: "Rahul Menon",
    fatherName: "Suresh Menon",
    dateOfBirth: "2002-07-09",
    institutePid: "1-35147581",
    program: "B.Tech Electronics and Communication Engineering",
    admissionYear: 2020,
    expectedPassingYear: 2024,
    cgpa: 8.05,
  },
];

export function findInstitute(nameOrPid?: string) {
  if (!nameOrPid) return undefined;
  const q = nameOrPid.toLowerCase().trim();
  return INSTITUTES.find(
    (i) =>
      i.pid.toLowerCase() === q ||
      i.name.toLowerCase() === q ||
      i.aliases.some((a) => a.toLowerCase() === q) ||
      i.name.toLowerCase().includes(q) ||
      i.aliases.some((a) => q.includes(a.toLowerCase()) || a.toLowerCase().includes(q)),
  );
}

export function findStudent(enrollmentOrName?: string) {
  if (!enrollmentOrName) return undefined;
  const q = enrollmentOrName.toLowerCase().replace(/\s+/g, "");
  return STUDENTS.find(
    (s) =>
      s.enrollmentNo.toLowerCase() === q ||
      s.name.toLowerCase().replace(/\s+/g, "") === q ||
      s.enrollmentNo.toLowerCase().includes(q),
  );
}

export function findProgram(institute: InstituteRecord, program?: string) {
  if (!program) return undefined;
  const q = program.toLowerCase();
  return institute.programs.find(
    (p) =>
      p.name.toLowerCase() === q ||
      p.code.toLowerCase() === q ||
      p.name.toLowerCase().includes(q) ||
      q.includes(p.code.toLowerCase()),
  );
}
