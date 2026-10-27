"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  BarChart3,
  CloudUpload,
  FileSearch,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { getUser, logout } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Document Upload", icon: CloudUpload },
  { href: "/verification", label: "Verification", icon: FileSearch },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/audit", label: "Audit Trail", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const user = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => getUser(),
    () => null,
  );

  useEffect(() => {
    if (mounted && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [mounted, user, pathname, router]);

  if (!mounted) return null;

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-5">
        <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-lg font-black text-white shadow-sm ring-1 ring-black/5">
            H
          </span>
          <div>
            <span className="text-[15px] font-bold tracking-[0.14em] text-slate-900">
              HAIKU AI
            </span>
            <p className="text-[10px] font-medium text-slate-400">AICTE Verification</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-teal-50 font-medium text-teal-700 shadow-sm ring-1 ring-teal-200"
                    : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-gray-200 pt-3">
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700">
              <User size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
              <p className="truncate text-[11px] text-slate-400">{user.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-7 py-6">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const stamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="mb-6">
      <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">{title}</h1>
      <p suppressHydrationWarning className="mt-1 text-sm text-slate-500">{subtitle ?? stamp}</p>
    </header>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Verified: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Flagged: "bg-red-50 text-red-700 ring-1 ring-red-200",
  };
  const mark = status === "Verified" ? " ✓" : "";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-gray-100 text-slate-600"}`}>
      {status}{mark}
    </span>
  );
}
