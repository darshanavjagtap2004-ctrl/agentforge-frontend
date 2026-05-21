"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Plug,
  CheckSquare,
  ScrollText,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearToken, getUser } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { approvalsApi } from "@/lib/api";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/connectors", label: "Connectors", icon: Plug },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
  { href: "/settings/users", label: "Users", icon: Users, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: pending } = useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: approvalsApi.pending,
    refetchInterval: 30_000,
  });

  const pendingCount = pending?.filter((a) => a.status === "pending").length ?? 0;

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-blue-400" />
          <span className="font-bold text-lg tracking-tight">AgentForge</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">AI Agents for Banking</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== "bank_admin") return null;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {item.href === "/approvals" && pendingCount > 0 && (
                <span className="ml-auto bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-slate-400 capitalize">
              {user?.role?.replace("_", " ")}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden bg-slate-900 text-white p-2 rounded-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white min-h-screen fixed inset-y-0 left-0">
        <SidebarContent />
      </aside>
    </>
  );
}
