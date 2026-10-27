import { verifyDocument } from "./verify";
import type { StoredDocument } from "./types";

const SAMPLES: { id: string; user: string; filename: string; confidence: number; uploadedAt: string; text: string }[] = [
  {
    id: "DOC8912",
    user: "J. Doe",
    filename: "priya-sharma-marksheet.txt",
    confidence: 94,
    uploadedAt: isoHoursAgo(2),
    text: `NATIONAL INSTITUTE OF TECHNOLOGY, TIRUCHIRAPPALLI
MARKSHEET
Student Name: Priya Sharma
Father Name: Rakesh Sharma
Date of Birth: 12/04/2003
Enrollment No: NITT2021CSE045
Institute: National Institute of Technology, Tiruchirappalli
AICTE PID: 1-35147581
Programme: B.Tech Computer Science and Engineering
Year of Admission: 2021
Year of Passing: 2025
Duration: 4 years
CGPA: 8.64
AICTE Approval No: F-No-AICTE-NITT-CSE-2021
Date: 26/10/2023`,
  },
  {
    id: "DOC8913",
    user: "J. Doe",
    filename: "priya-sharma-degree.txt",
    confidence: 93,
    uploadedAt: isoHoursAgo(3),
    text: `DEGREE CERTIFICATE
Name: Priya Sharma
Enrollment No: NITT2021CSE045
Institute: NIT Trichy
Programme: B.Tech Computer Science and Engineering
Year of Admission: 2021
Year of Passing: 2025
CGPA: 8.64
Date: 26/10/2023`,
  },
  {
    id: "DOC8914",
    user: "J. Doe",
    filename: "arjun-deshmukh-dl-scan.txt",
    confidence: 88,
    uploadedAt: isoHoursAgo(4),
    text: `DRIVING LICENCE
Name: Arjun Deshmukh
Date of Birth: 02/11/2001
Enrollment No: COEP2019ME118
Institute: College of Engineering Pune
Programme: B.Tech Mechanical Engineering
Year of Admission: 2019
Year of Passing: 2023
CGPA: 7.91`,
  },
  {
    id: "DOC8915",
    user: "J. Doe",
    filename: "horizon-fake-degree.txt",
    confidence: 71,
    uploadedAt: isoHoursAgo(5),
    text: `DEGREE
Student Name: Rohan Gupta
Father Name: Vinod Gupta
Date of Birth: 15/08/2002
Enrollment No: HRZ2022CSE001
Institute: Horizon Private Polytechnic
Programme: B.Tech Artificial Intelligence
Year of Admission: 2022
Year of Passing: 2023
Duration: 1 years
CGPA: 11.5
Date: 26/10/2023`,
  },
  {
    id: "DOC8916",
    user: "J. Doe",
    filename: "meera-kapoor-transcript.txt",
    confidence: 96,
    uploadedAt: isoHoursAgo(6),
    text: `OFFICIAL TRANSCRIPT
Student Name: Meera Kapoor
Father Name: Anil Kapoor
Date of Birth: 28/01/2004
Enrollment No: DTU2022IT077
Institute: Delhi Technological University
AICTE PID: 1-50991200
Programme: B.Tech Information Technology
Year of Admission: 2022
Year of Passing: 2026
Duration: 4 years
CGPA: 9.12
AICTE Approval No: F-No-AICTE-DTU-IT-2022
Date: 26/10/2023`,
  },
  {
    id: "DOC8917",
    user: "J. Doe",
    filename: "rahul-name-mismatch.txt",
    confidence: 82,
    uploadedAt: isoHoursAgo(7),
    text: `MARKSHEET
Student Name: Rahul M. Nair
Father Name: Suresh Menon
Date of Birth: 09/07/2001
Enrollment No: NITT2020ECE019
Institute: National Institute of Technology, Tiruchirappalli
Programme: B.Tech Electronics and Communication Engineering
Year of Admission: 2020
Year of Passing: 2024
Duration: 4 years
CGPA: 8.05`,
  },
  {
    id: "DOC8918",
    user: "J. Doe",
    filename: "coep-affiliation.txt",
    confidence: 90,
    uploadedAt: isoHoursAgo(8),
    text: `AFFILIATION LETTER
Institute: College of Engineering Pune
AICTE PID: 1-21845612
Programme: B.Tech Mechanical Engineering
Year of Admission: 2019
Year of Passing: 2023
Duration: 4 years
AICTE Approval No: F-No-AICTE-COEP-ME-2019
Student Name: Arjun Deshmukh
Enrollment No: COEP2019ME118
Date of Birth: 02/11/2001
Father Name: Sanjay Deshmukh
CGPA: 7.91`,
  },
];

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

export function seedDocuments(): StoredDocument[] {
  return SAMPLES.map((sample) => {
    const result = verifyDocument({
      ocrText: sample.text,
      ocrConfidence: sample.confidence,
      filename: sample.filename,
    });
    return {
      id: sample.id,
      user: sample.user,
      type: result.type,
      filename: sample.filename,
      uploadedAt: sample.uploadedAt,
      ocrText: sample.text,
      ocrConfidence: sample.confidence,
      aiScore: result.aiScore,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      status: result.status,
      extracted: result.extracted,
      mismatches: result.mismatches,
      compliance: result.compliance,
      factors: result.factors,
      summary: result.summary,
      audit: [
        {
          timestamp: sample.uploadedAt,
          action: "created" as const,
          actor: sample.user,
          note: "Seeded demo document",
        },
      ],
    };
  });
}

export const DEMO_PACKS = SAMPLES.map((s) => ({
  id: s.id,
  filename: s.filename,
  label: s.filename.replace(/-/g, " ").replace(".txt", ""),
  text: s.text,
  confidence: s.confidence,
}));
