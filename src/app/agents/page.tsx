"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsApi, Agent } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Plus, Play, Bot } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const triggerColors: Record<string, string> = {
  manual: "bg-slate-100 text-slate-700",
  scheduled: "bg-purple-100 text-purple-700",
  webhook: "bg-orange-100 text-orange-700",
};

function AgentCard({ agent }: { agent: Agent }) {
  const qc = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => agentsApi.toggle(agent.id, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      toast.success(agent.is_active ? "Agent disabled" : "Agent enabled");
    },
    onError: () => toast.error("Failed to update agent"),
  });

  const runMutation = useMutation({
    mutationFn: () => agentsApi.run(agent.id),
    onSuccess: () => {
      toast.success("Agent started");
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: () => toast.error("Failed to run agent"),
  });

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 truncate">{agent.name}</h3>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                triggerColors[agent.trigger_type] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {agent.trigger_type}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{agent.description}</p>
        </div>
        <Switch
          checked={agent.is_active}
          onCheckedChange={(v) => toggleMutation.mutate(v)}
          disabled={toggleMutation.isPending}
        />
      </div>

      {agent.last_run_at && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Last run:</span>
          {agent.last_run_status && <StatusBadge status={agent.last_run_status} />}
          <span>{formatDistanceToNow(new Date(agent.last_run_at), { addSuffix: true })}</span>
        </div>
      )}

      <div className="mt-auto pt-2 border-t border-slate-100">
        <button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending || !agent.is_active}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Play className="h-3.5 w-3.5" />
          Run Now
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-10" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-8 w-24 mt-2" />
    </div>
  );
}

export default function AgentsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: agentsApi.list,
  });

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Agents</h1>
                <p className="text-slate-500 text-sm mt-1">Manage your automation agents</p>
              </div>
              <Link
                href="/agents/new"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Agent
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : agents?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Bot className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No agents yet</h3>
                <p className="text-slate-400 mb-6">Create your first agent to get started.</p>
                <Link
                  href="/agents/new"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create your first agent
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agents?.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
