"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { connectorsApi, ConnectorSchema, ConnectorField } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Plug,
  Trash2,
  RefreshCw,
  CheckCircle,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const CONNECTOR_ICONS: Record<string, string> = {
  postgresql: "🐘",
  email: "📧",
  slack: "💬",
  rest_api: "🌐",
  mock_bank: "🏦",
};

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  connected: { color: "bg-green-500", label: "Connected" },
  error: { color: "bg-red-500", label: "Error" },
  untested: { color: "bg-gray-400", label: "Untested" },
};

function ConnectorCard({
  connector,
}: {
  connector: { id: string; type: string; name: string; status: string; last_tested_at?: string };
}) {
  const qc = useQueryClient();
  const dot = STATUS_DOT[connector.status] ?? STATUS_DOT.untested;

  const testMutation = useMutation({
    mutationFn: () => connectorsApi.test(connector.id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["connectors"] });
      if (res.success) { toast.success("Connection successful"); } else { toast.error(res.message); }
    },
    onError: () => toast.error("Test failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => connectorsApi.delete(connector.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connectors"] });
      toast.success("Connector deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{CONNECTOR_ICONS[connector.type] ?? "🔌"}</span>
          <div>
            <h3 className="font-semibold text-slate-900">{connector.name}</h3>
            <p className="text-xs text-slate-500 capitalize">{connector.type.replace("_", " ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", dot.color)} />
          <span className="text-xs text-slate-500">{dot.label}</span>
        </div>
      </div>

      {connector.last_tested_at && (
        <p className="text-xs text-slate-400 mb-4">
          Tested{" "}
          {formatDistanceToNow(new Date(connector.last_tested_at), { addSuffix: true })}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => testMutation.mutate()}
          disabled={testMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw className={cn("h-3 w-3", testMutation.isPending && "animate-spin")} />
          Test
        </button>
        <button
          onClick={() => {
            if (confirm("Delete this connector?")) deleteMutation.mutate();
          }}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
    </div>
  );
}

function DynamicField({ field, value, onChange }: {
  field: ConnectorField;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  if (field.type === "select") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
        <option value="">Select…</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.label}
      className={base}
    />
  );
}

export default function ConnectorsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState("");
  const [connName, setConnName] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [testPassed, setTestPassed] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  const { data: connectors, isLoading } = useQuery({
    queryKey: ["connectors"],
    queryFn: connectorsApi.list,
  });

  const { data: schemas } = useQuery({
    queryKey: ["connector-schemas"],
    queryFn: connectorsApi.schemas,
  });

  const selectedSchema = schemas?.find((s) => s.type === selectedType);

  async function handleTest() {
    setTestLoading(true);
    try {
      const res = await connectorsApi.testNew({
        type: selectedType,
        name: connName,
        config: formValues,
      });
      if (res.success) {
        setTestPassed(true);
        toast.success("Connection successful!");
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Test failed");
    } finally {
      setTestLoading(false);
    }
  }

  const createMutation = useMutation({
    mutationFn: () =>
      connectorsApi.create({ type: selectedType, name: connName, config: formValues }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connectors"] });
      toast.success("Connector added");
      setOpen(false);
      resetModal();
    },
    onError: () => toast.error("Failed to save connector"),
  });

  function resetModal() {
    setModalStep(1);
    setSelectedType("");
    setConnName("");
    setFormValues({});
    setTestPassed(false);
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Connectors</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Manage integrations with external systems
                </p>
              </div>
              <button
                onClick={() => { resetModal(); setOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Connector
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-xl" />
                ))}
              </div>
            ) : connectors?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Plug className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No connectors yet</h3>
                <p className="text-slate-400 mb-6">
                  Add your first connector to start automating.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {connectors?.map((c) => <ConnectorCard key={c.id} connector={c} />)}
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetModal(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {modalStep === 1 ? "Choose Connector Type" : "Configure Connector"}
            </DialogTitle>
          </DialogHeader>

          {modalStep === 1 && (
            <div>
              <div className="grid grid-cols-3 gap-3 py-4">
                {(schemas ?? [
                  { type: "postgresql", label: "PostgreSQL", icon: "🐘", fields: [] },
                  { type: "email", label: "Email", icon: "📧", fields: [] },
                  { type: "slack", label: "Slack", icon: "💬", fields: [] },
                  { type: "rest_api", label: "REST API", icon: "🌐", fields: [] },
                  { type: "mock_bank", label: "Mock Bank", icon: "🏦", fields: [] },
                ] as ConnectorSchema[]).map((s) => (
                  <button
                    key={s.type}
                    type="button"
                    onClick={() => setSelectedType(s.type)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors",
                      selectedType === s.type
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-xs font-medium text-slate-700">{s.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-2">
                <button
                  disabled={!selectedType}
                  onClick={() => setModalStep(2)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {modalStep === 2 && selectedSchema && (
            <div className="py-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  value={connName}
                  onChange={(e) => setConnName(e.target.value)}
                  placeholder="e.g. Production DB"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {selectedSchema.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <DynamicField
                    field={field}
                    value={formValues[field.key] ?? ""}
                    onChange={(v) =>
                      setFormValues((prev) => ({ ...prev, [field.key]: v }))
                    }
                  />
                </div>
              ))}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleTest}
                  disabled={testLoading || !connName}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {testLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : testPassed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  Test Connection
                </button>
                <button
                  disabled={!testPassed || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {createMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : null}
                  Save Connector
                </button>
                {testPassed && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>

              <button
                onClick={() => setModalStep(1)}
                className="text-xs text-slate-500 hover:underline"
              >
                ← Back to connector types
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
