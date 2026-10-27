"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck, Lock, Mail } from "lucide-react";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 600));

    const user = login(email, password);
    if (user) {
      router.push("/");
      router.refresh();
    } else {
      setError("Invalid email or password. Try the demo credentials below.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden w-[480px] flex-col justify-between bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 p-10 text-white lg:flex">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl font-black backdrop-blur-sm">
              H
            </span>
            <span className="text-xl font-bold tracking-wide">HAIKU AI</span>
          </div>
          <p className="mt-1 text-sm text-teal-100">Intelligent Document Verification & Forensic Audit</p>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-3xl font-bold leading-tight">
              AICTE<br />Document Verification<br />& Compliance Platform
            </p>
            <p className="mt-3 text-sm leading-relaxed text-teal-100">
              All India Council for Technical Education<br />
              Ministry of Education, Government of India
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">✓</div>
              <div>
                <p className="text-sm font-medium">Intelligent Document Validation</p>
                <p className="text-xs text-teal-200">OCR-based extraction & cross-reference checks</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">✓</div>
              <div>
                <p className="text-sm font-medium">Anomaly & Forgery Detection</p>
                <p className="text-xs text-teal-200">AI-powered suspicious pattern identification</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">✓</div>
              <div>
                <p className="text-sm font-medium">Regulatory Compliance</p>
                <p className="text-xs text-teal-200">AICTE Approval Process Handbook checks</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">✓</div>
              <div>
                <p className="text-sm font-medium">Complete Audit Trail</p>
                <p className="text-xs text-teal-200">Transparent, traceable verification records</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-teal-200">
          © 2024 AICTE · Prototype for evaluation purposes
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/50 px-6">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mb-2 inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-lg font-black text-white shadow-sm">H</span>
              <span className="text-xl font-bold text-slate-900 tracking-wider">HAIKU AI</span>
            </div>
            <p className="text-sm text-slate-500">AICTE Document Verification Platform</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
                <ShieldCheck className="h-6 w-6 text-teal-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
              <p className="mt-1 text-sm text-slate-500">Sign in to your AICTE verification account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@aicte.gov.in"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                  Remember me
                </label>
                <button type="button" className="text-sm text-teal-600 hover:text-teal-700">
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">Demo Credentials</p>
            <div className="space-y-1.5 text-xs text-blue-800">
              <div className="flex justify-between">
                <span className="font-medium">Admin:</span>
                <span>admin@aicte.gov.in / admin123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Analyst:</span>
                <span>analyst@aicte.gov.in / analyst123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Reviewer:</span>
                <span>reviewer@aicte.gov.in / reviewer123</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Inspector:</span>
                <span>inspector@aicte.gov.in / inspector123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
