"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalsApi, Approval } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow, format } from "date-fns";
import { Check, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function ApprovalRow({
  approval,
  showActions,
}: {
  approval: Approval;
  showActions: boolean;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const approveMutation = useMutation({
    mutationFn: () => approvalsApi.approve(approval.id),
    onSuccess: () => {
      toast.success("Approved");
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => approvalsApi.reject(approval.id),
    onSuccess: () => {
      toast.success("Rejected");
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Failed to reject"),
  });

  return (
    <>
      <tr
        className="hover:bg-slate-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-6 py-4 font-medium text-slate-900">{approval.agent_name}</td>
        <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
          <p className="truncate">{approval.action_description}</p>
        </td>
        <td className="px-6 py-4 text-sm text-slate-500">
          {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
        </td>
        <td className="px-6 py-4">
          <StatusBadge
            status={
              approval.status === "pending"
                ? "waiting_approval"
                : approval.status === "approved"
                ? "completed"
                : "failed"
            }
          />
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {showActions && (
              <>
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <Check className="h-3 w-3" /> Approve
                </button>
                <button
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="h-3 w-3" /> Reject
                </button>
              </>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={5} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Action Preview
                </p>
                <pre className="text-xs text-slate-700 bg-gray-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                  {JSON.stringify(approval.action_preview, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Details</p>
                <dl className="text-sm space-y-1">
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Created:</dt>
                    <dd className="text-slate-700">
                      {format(new Date(approval.created_at), "PPp")}
                    </dd>
                  </div>
                  {approval.resolved_at && (
                    <div className="flex gap-2">
                      <dt className="text-slate-500">Resolved:</dt>
                      <dd className="text-slate-700">
                        {format(new Date(approval.resolved_at), "PPp")}
                      </dd>
                    </div>
                  )}
                  {approval.resolved_by && (
                    <div className="flex gap-2">
                      <dt className="text-slate-500">By:</dt>
                      <dd className="text-slate-700">{approval.resolved_by}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ApprovalsTable({
  data,
  isLoading,
  showActions,
}: {
  data?: Approval[];
  isLoading: boolean;
  showActions: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <th className="text-left px-6 py-3">Agent</th>
              <th className="text-left px-6 py-3">Action</th>
              <th className="text-left px-6 py-3">Time</th>
              <th className="text-left px-6 py-3">Status</th>
              <th className="text-left px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No approvals found
                    </td>
                  </tr>
                )
              : data?.map((a) => (
                  <ApprovalRow key={a.id} approval={a} showActions={showActions} />
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const { data: all, isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: approvalsApi.list,
  });

  const pending = all?.filter((a) => a.status === "pending");
  const history = all?.filter((a) => a.status !== "pending");

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
              <p className="text-slate-500 text-sm mt-1">
                Review and action pending agent approvals
              </p>
            </div>

            <Tabs defaultValue="pending">
              <TabsList className="mb-6">
                <TabsTrigger value="pending" className="gap-2">
                  Pending
                  {(pending?.length ?? 0) > 0 && (
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {pending?.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                <ApprovalsTable
                  data={pending}
                  isLoading={isLoading}
                  showActions={true}
                />
              </TabsContent>

              <TabsContent value="history">
                <ApprovalsTable
                  data={history}
                  isLoading={isLoading}
                  showActions={false}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
