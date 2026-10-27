"use client";

export interface User {
  email: string;
  name: string;
  role: "Admin" | "Compliance Analyst" | "Reviewer" | "Inspector";
}

const DEMO_USERS: Record<string, { password: string; user: User }> = {
  "admin@aicte.gov.in": {
    password: "admin123",
    user: { email: "admin@aicte.gov.in", name: "Dr. Rajesh Kumar", role: "Admin" },
  },
  "analyst@aicte.gov.in": {
    password: "analyst123",
    user: { email: "analyst@aicte.gov.in", name: "Sarah Chen", role: "Compliance Analyst" },
  },
  "reviewer@aicte.gov.in": {
    password: "reviewer123",
    user: { email: "reviewer@aicte.gov.in", name: "Priya Patel", role: "Reviewer" },
  },
  "inspector@aicte.gov.in": {
    password: "inspector123",
    user: { email: "inspector@aicte.gov.in", name: "Amit Singh", role: "Inspector" },
  },
};

export function login(email: string, password: string): User | null {
  const entry = DEMO_USERS[email.toLowerCase().trim()];
  if (entry && entry.password === password) {
    if (typeof window !== "undefined") {
      localStorage.setItem("zen_user", JSON.stringify(entry.user));
    }
    return entry.user;
  }
  return null;
}

let cachedUserRaw: string | null = null;
let cachedUser: User | null = null;

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("zen_user");
    if (raw === cachedUserRaw) return cachedUser;
    cachedUserRaw = raw;
    cachedUser = raw ? (JSON.parse(raw) as User) : null;
    return cachedUser;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("zen_user");
  }
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: [
    "View Dashboard",
    "Upload Documents",
    "Review Verifications",
    "Manage Compliance Rules",
    "View Reports",
    "Manage Settings",
    "Manage Users",
    "View Audit Trail",
    "Override Decisions",
  ],
  "Compliance Analyst": [
    "View Dashboard",
    "Upload Documents",
    "Review Verifications",
    "View Compliance Rules",
    "View Reports",
    "View Audit Trail",
  ],
  Reviewer: [
    "View Dashboard",
    "Review Verifications",
    "View Compliance Rules",
    "View Reports",
    "View Audit Trail",
  ],
  Inspector: [
    "View Dashboard",
    "Upload Documents",
    "Review Verifications",
    "View Reports",
    "View Audit Trail",
    "Infrastructure Inspection",
  ],
};
