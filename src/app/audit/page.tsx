"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { auditApi, agentsApi, AuditLog } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { format } from "date-fns";
import { Download, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function AuditRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-slate-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">
          {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
        </td>
        <td className="px-6 py-3 text-sm font-medium text-slate-900">{log.agent_name}</td>
        <td className="px-6 py-3 text-sm text-slate-600">{log.action_type}</td>
        <td className="px-6 py-3 text-sm text-slate-600">{log.actor}</td>
        <td className="px-6 py-3">
          <StatusBadge status={log.status} />
        </td>
        <td className="px-6 py-3 text-sm text-slate-500">
          {log.duration_ms != null ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}
        </td>
        <td className="px-6 py-3">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Input Params
                </p>
                <pre className="text-xs text-slate-700 bg-gray-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-52 whitespace-pre-wrap">
                  {JSON.stringify(log.input_params, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Output Result
                </p>
                <pre className="text-xs text-slate-700 bg-gray-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-52 whitespace-pre-wrap">
                  {JSON.stringify(log.output_result, null, 2)}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionType, setActionType] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit", page, dateFrom, dateTo, agentFilter, statusFilter, actionType],
    queryFn: () =>
      auditApi.list({
        page,
        page_size: PAGE_SIZE,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        agent_id: agentFilter || undefined,
        status: statusFilter || undefined,
        action_type: actionType || undefined,
      }),
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: agentsApi.list,
  });

  async function handleExport() {
    try {
      const blob = await auditApi.exportCsv({
        date_from: dateFrom,
        date_to: dateTo,
        agent_id: agentFilter,
        status: statusFilter,
        action_type: actionType,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch {
      toast.error("Export failed");
    }
  }

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Complete history of all agent actions
                </p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Agent</label>
                  <select
                    value={agentFilter}
                    onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All agents</option>
                    {agents?.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All statuses</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="running">Running</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Action Type</label>
                  <input
                    value={actionType}
                    onChange={(e) => { setActionType(e.target.value); setPage(1); }}
                    placeholder="e.g. send_email"
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-6 py-3">Timestamp</th>
                      <th className="text-left px-6 py-3">Agent</th>
                      <th className="text-left px-6 py-3">Action</th>
                      <th className="text-left px-6 py-3">Actor</th>
                      <th className="text-left px-6 py-3">Status</th>
                      <th className="text-left px-6 py-3">Duration</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 7 }).map((_, j) => (
                              <td key={j} className="px-6 py-3">
                                <Skeleton className="h-4 w-20" />
                              </td>
                            ))}
                          </tr>
                        ))
                      : data?.items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-6 py-12 text-center text-slate-400"
                            >
                              No audit logs found
                            </td>
                          </tr>
                        )
                      : data?.items.map((log) => (
                          <AuditRow key={log.id} log={log} />
                        ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Showing {from}–{to} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>
                    <span className="text-sm text-slate-600">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
