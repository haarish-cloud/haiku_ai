import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAIKU AI · AICTE Document Verification",
  description:
    "AI-powered document ingestion, OCR, mismatch detection and AICTE compliance scoring powered by Haiku AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
