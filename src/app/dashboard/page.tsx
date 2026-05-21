"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardApi, approvalsApi, connectorsApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { Bot, Play, AlertCircle, CheckSquare, Check, X } from "lucide-react";
import { toast } from "sonner";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value?: number;
  icon: React.ElementType;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 mt-1">{value ?? 0}</p>
          )}
        </div>
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: dashboardApi.getStats,
  });

  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ["dashboard", "runs"],
    queryFn: dashboardApi.getRecentRuns,
  });

  const { data: approvals, isLoading: approvalsLoading } = useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: approvalsApi.pending,
  });

  const { data: connectors } = useQuery({
    queryKey: ["connectors"],
    queryFn: connectorsApi.list,
  });

  const hasMockBank = connectors?.some((c) => c.type === "mock_bank");
  const pendingApprovals = approvals?.filter((a) => a.status === "pending") ?? [];

  const approveMutation = useMutation({
    mutationFn: approvalsApi.approve,
    onSuccess: () => {
      toast.success("Approved");
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: approvalsApi.reject,
    onSuccess: () => {
      toast.success("Rejected");
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Failed to reject"),
  });

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {hasMockBank && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800 font-medium">
                🏦 Demo Mode — Using mock banking data
              </div>
            )}

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-500 text-sm mt-1">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Active Agents"
                value={stats?.active_agents}
                icon={Bot}
                color="bg-blue-600"
                loading={statsLoading}
              />
              <StatCard
                title="Runs Today"
                value={stats?.runs_today}
                icon={Play}
                color="bg-green-600"
                loading={statsLoading}
              />
              <StatCard
                title="Pending Approvals"
                value={stats?.pending_approvals}
                icon={CheckSquare}
                color="bg-yellow-500"
                loading={statsLoading}
              />
              <StatCard
                title="Failed Today"
                value={stats?.failed_today}
                icon={AlertCircle}
                color="bg-red-500"
                loading={statsLoading}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Recent runs */}
              <div className="xl:col-span-2 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900">Recent Runs</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="text-left px-6 py-3">Agent</th>
                        <th className="text-left px-6 py-3">Status</th>
                        <th className="text-left px-6 py-3 hidden md:table-cell">Triggered By</th>
                        <th className="text-left px-6 py-3">Time</th>
                        <th className="text-left px-6 py-3 hidden lg:table-cell">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {runsLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                              <td className="px-6 py-3"><Skeleton className="h-4 w-32" /></td>
                              <td className="px-6 py-3"><Skeleton className="h-5 w-20" /></td>
                              <td className="px-6 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                              <td className="px-6 py-3"><Skeleton className="h-4 w-20" /></td>
                              <td className="px-6 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-16" /></td>
                            </tr>
                          ))
                        : runs?.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                No runs yet
                              </td>
                            </tr>
                          )
                        : runs?.map((run) => (
                            <tr key={run.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-medium text-slate-900">
                                {run.agent_name}
                              </td>
                              <td className="px-6 py-3">
                                <StatusBadge status={run.status} />
                              </td>
                              <td className="px-6 py-3 text-slate-500 hidden md:table-cell">
                                {run.triggered_by}
                              </td>
                              <td className="px-6 py-3 text-slate-500">
                                {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                              </td>
                              <td className="px-6 py-3 text-slate-500 hidden lg:table-cell">
                                {run.duration_ms != null
                                  ? `${(run.duration_ms / 1000).toFixed(1)}s`
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending approvals */}
              {pendingApprovals.length > 0 && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-900">
                      Pending Approvals
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
                        {pendingApprovals.length}
                      </span>
                    </h2>
                  </div>
                  {approvalsLoading ? (
                    <div className="p-6 space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {pendingApprovals.map((approval) => (
                        <div key={approval.id} className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-900 mb-1">
                            {approval.agent_name}
                          </p>
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                            {approval.action_description}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveMutation.mutate(approval.id)}
                              disabled={approveMutation.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              <Check className="h-3 w-3" /> Approve
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate(approval.id)}
                              disabled={rejectMutation.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-colors"
                            >
                              <X className="h-3 w-3" /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
