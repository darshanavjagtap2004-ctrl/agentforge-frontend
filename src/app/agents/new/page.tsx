"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsApi, AgentPlan, AgentStep } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Daily failed transaction report",
  "Weekly reconciliation summary",
  "Morning pending approvals alert",
];

const TRIGGER_OPTIONS = [
  { value: "manual", emoji: "🖱️", label: "Manual", desc: "Run when you click a button" },
  { value: "scheduled", emoji: "📅", label: "Scheduled", desc: "Runs automatically on a schedule" },
  { value: "webhook", emoji: "🔗", label: "Webhook", desc: "Triggered by an external event" },
] as const;

const GUARDRAILS = [
  { value: "", label: "None" },
  { value: "require_approval", label: "Require Approval" },
  { value: "dry_run", label: "Dry Run Only" },
  { value: "amount_limit_1000", label: "Amount Limit $1,000" },
];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold",
              s < step
                ? "bg-blue-600 text-white"
                : s === step
                ? "bg-blue-600 text-white ring-4 ring-blue-100"
                : "bg-slate-200 text-slate-500"
            )}
          >
            {s}
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              s === step ? "text-blue-600" : "text-slate-400"
            )}
          >
            {s === 1 ? "Describe" : s === 2 ? "Review Plan" : "Configure"}
          </span>
          {s < 3 && <ChevronRight className="h-4 w-4 text-slate-300 ml-1" />}
        </div>
      ))}
    </div>
  );
}

function StepCard({ step, index }: { step: AgentStep; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
          {index + 1}
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
          {step.connector_name}
        </span>
        <span className="text-sm font-medium text-slate-700">{step.action_name}</span>
        <span className="text-sm text-slate-500 flex-1 truncate">{step.description}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-slate-400 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-gray-50 p-4">
          <pre className="text-xs text-slate-600 whitespace-pre-wrap overflow-auto">
            {JSON.stringify(step.params, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function NewAgentPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [agentName, setAgentName] = useState("");
  const [triggerType, setTriggerType] = useState<"manual" | "scheduled" | "webhook">("manual");
  const [scheduleEvery, setScheduleEvery] = useState("1");
  const [scheduleUnit, setScheduleUnit] = useState("days");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [guardrail, setGuardrail] = useState("");

  const planMutation = useMutation({
    mutationFn: agentsApi.plan,
    onSuccess: (data) => {
      setPlan(data);
      setAgentName(data.name);
      setStep(2);
    },
    onError: () => toast.error("Failed to generate plan"),
  });

  const createMutation = useMutation({
    mutationFn: agentsApi.create,
    onSuccess: () => {
      toast.success("Agent created!");
      qc.invalidateQueries({ queryKey: ["agents"] });
      router.push("/agents");
    },
    onError: () => toast.error("Failed to create agent"),
  });

  function buildCron(): string {
    const [h, m] = scheduleTime.split(":");
    if (scheduleUnit === "hours") return `${m} */${scheduleEvery} * * *`;
    if (scheduleUnit === "weeks") return `${m} ${h} * * 1`;
    return `${m} ${h} */${scheduleEvery} * *`;
  }

  function cronHumanLabel(): string {
    const [h, m] = scheduleTime.split(":");
    const t = `${h}:${m} ${parseInt(h) >= 12 ? "PM" : "AM"}`;
    if (scheduleUnit === "hours") return `Every ${scheduleEvery} hour(s)`;
    if (scheduleUnit === "weeks") return `Every week on Monday at ${t}`;
    return `Every ${scheduleEvery} day(s) at ${t}`;
  }

  function handleSave() {
    if (!plan) return;
    createMutation.mutate({
      name: agentName,
      description: plan.description,
      trigger_type: triggerType,
      cron_expression: triggerType === "scheduled" ? buildCron() : undefined,
      guardrail: guardrail || undefined,
      steps: plan.steps,
    });
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Create New Agent</h1>
            <p className="text-slate-500 text-sm mb-6">
              Describe what you want, and AI will build it for you.
            </p>

            <ProgressBar step={step} />

            {/* STEP 1 */}
            {step === 1 && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  What should your agent do?
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                  Describe in plain English — be as specific as you like.
                </p>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    "e.g. Every morning, get failed transactions\nfrom our banking system and email me a summary"
                  }
                  rows={5}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />

                <div className="flex flex-wrap gap-2 mt-3 mb-5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setDescription(ex)}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => planMutation.mutate(description)}
                  disabled={!description.trim() || planMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {planMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      🤖 AI is analyzing your request…
                    </>
                  ) : (
                    <>
                      Build My Agent
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && plan && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                {!plan.feasible ? (
                  <div>
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Cannot build this agent</p>
                        <p className="text-sm text-red-700 mt-1">{plan.infeasible_reason}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" /> Try Again
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Agent Name
                      </label>
                      <input
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <p className="text-sm text-slate-500 mb-5">{plan.description}</p>

                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      Steps ({plan.steps.length})
                    </h3>
                    <div className="space-y-2 mb-6">
                      {plan.steps.map((s, i) => (
                        <StepCard key={i} step={s} index={i} />
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(1)}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" /> Change Description
                      </button>
                      <button
                        onClick={() => setStep(3)}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Configure <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-5">
                  Configure &amp; Save
                </h2>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Trigger Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TRIGGER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTriggerType(opt.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors text-center",
                          triggerType === opt.value
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
                        <span className="text-xs text-slate-500">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {triggerType === "scheduled" && (
                  <div className="bg-slate-50 rounded-xl p-4 mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Schedule
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-slate-600">Every</span>
                      <select
                        value={scheduleEvery}
                        onChange={(e) => setScheduleEvery(e.target.value)}
                        className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {[1, 2, 3, 4, 6, 8, 12].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <select
                        value={scheduleUnit}
                        onChange={(e) => setScheduleUnit(e.target.value)}
                        className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="hours">hours</option>
                        <option value="days">days</option>
                        <option value="weeks">weeks</option>
                      </select>
                      {scheduleUnit !== "hours" && (
                        <>
                          <span className="text-sm text-slate-600">at</span>
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </>
                      )}
                    </div>
                    <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-3 font-medium">
                      Will run {cronHumanLabel()}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Cron: <code>{buildCron()}</code>
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Guardrail
                  </label>
                  <select
                    value={guardrail}
                    onChange={(e) => setGuardrail(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {GUARDRAILS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={createMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "💾"
                    )}
                    Save Agent
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
