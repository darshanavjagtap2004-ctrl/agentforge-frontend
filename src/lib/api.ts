import axios from "axios";
import { clearToken, getToken } from "./auth";

// Read the env var at call time, not at module-init time.
// Next.js inlines NEXT_PUBLIC_ vars at build time for client bundles,
// but reading it here (rather than in axios.create) avoids the SSR/client
// snapshot mismatch and makes misconfiguration immediately visible.
function getBaseURL(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url && typeof window !== "undefined") {
    console.error(
      "[AgentForge] NEXT_PUBLIC_API_URL is not set. " +
        "Set it in .env.local (dev) or Vercel environment variables (prod) " +
        "and redeploy so the build picks it up."
    );
  }
  // Strip any trailing slash — a double-slash in the path causes Railway
  // to issue a redirect, which browsers silently convert POST → GET/HEAD.
  return (url ?? "").replace(/\/+$/, "");
}

export const api = axios.create({
  // Do NOT set baseURL here — see interceptor below.
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // Set baseURL on every request so it always reflects the current env var.
  config.baseURL = getBaseURL();

  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Types ──────────────────────────────────────────────────────────────────

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload {
  org_name: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}
export interface AuthResponse { token: string; user: UserProfile }

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "bank_admin" | "manager" | "analyst";
  org_id: string;
  status: "active" | "inactive";
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  trigger_type: "manual" | "scheduled" | "webhook";
  cron_expression?: string;
  guardrail?: string;
  is_active: boolean;
  last_run_at?: string;
  last_run_status?: RunStatus;
  created_at: string;
}

export type RunStatus = "completed" | "running" | "failed" | "waiting_approval" | "cancelled";

export interface Run {
  id: string;
  agent_id: string;
  agent_name: string;
  status: RunStatus;
  triggered_by: string;
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
}

export interface AgentStep {
  order: number;
  connector_name: string;
  action_name: string;
  description: string;
  params: Record<string, unknown>;
}

export interface AgentPlan {
  feasible: boolean;
  infeasible_reason?: string;
  name: string;
  description: string;
  steps: AgentStep[];
}

export interface Connector {
  id: string;
  type: string;
  name: string;
  status: "connected" | "error" | "untested";
  last_tested_at?: string;
  config: Record<string, unknown>;
}

export interface ConnectorSchema {
  type: string;
  label: string;
  icon: string;
  fields: ConnectorField[];
}

export interface ConnectorField {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "select";
  required: boolean;
  options?: string[];
}

export interface Approval {
  id: string;
  run_id: string;
  agent_id: string;
  agent_name: string;
  action_description: string;
  action_preview: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface AuditLog {
  id: string;
  agent_id: string;
  agent_name: string;
  action_type: string;
  actor: string;
  status: RunStatus;
  duration_ms?: number;
  input_params: Record<string, unknown>;
  output_result: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogPage {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  active_agents: number;
  runs_today: number;
  pending_approvals: number;
  failed_today: number;
}

export interface InvitePayload {
  email: string;
  first_name: string;
  last_name: string;
  role: "bank_admin" | "manager" | "analyst";
  temp_password: string;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<AuthResponse>("/api/auth/login", data).then((r) => r.data),
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>("/api/auth/register", data).then((r) => r.data),
};

// ── Dashboard ──────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () =>
    api.get<DashboardStats>("/api/dashboard/stats").then((r) => r.data),
  getRecentRuns: () =>
    api.get<Run[]>("/api/runs?limit=10").then((r) => r.data),
};

// ── Agents ─────────────────────────────────────────────────────────────────

export const agentsApi = {
  list: () => api.get<Agent[]>("/api/agents").then((r) => r.data),
  get: (id: string) => api.get<Agent>(`/api/agents/${id}`).then((r) => r.data),
  plan: (description: string) =>
    api.post<AgentPlan>("/api/agents/plan", { description }).then((r) => r.data),
  create: (data: Partial<Agent> & { steps?: AgentStep[] }) =>
    api.post<Agent>("/api/agents", data).then((r) => r.data),
  update: (id: string, data: Partial<Agent>) =>
    api.patch<Agent>(`/api/agents/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/api/agents/${id}`),
  run: (id: string) =>
    api.post<Run>(`/api/agents/${id}/run`).then((r) => r.data),
  toggle: (id: string, is_active: boolean) =>
    api.patch<Agent>(`/api/agents/${id}`, { is_active }).then((r) => r.data),
};

// ── Connectors ─────────────────────────────────────────────────────────────

export const connectorsApi = {
  list: () => api.get<Connector[]>("/api/connectors").then((r) => r.data),
  schemas: () =>
    api.get<ConnectorSchema[]>("/api/connectors/schemas").then((r) => r.data),
  create: (data: Partial<Connector>) =>
    api.post<Connector>("/api/connectors", data).then((r) => r.data),
  test: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/api/connectors/${id}/test`).then((r) => r.data),
  testNew: (data: Partial<Connector>) =>
    api.post<{ success: boolean; message: string }>("/api/connectors/test", data).then((r) => r.data),
  delete: (id: string) => api.delete(`/api/connectors/${id}`),
};

// ── Approvals ──────────────────────────────────────────────────────────────

export const approvalsApi = {
  list: () => api.get<Approval[]>("/api/approvals").then((r) => r.data),
  pending: () =>
    api.get<Approval[]>("/api/approvals?status=pending").then((r) => r.data),
  approve: (id: string) =>
    api.post(`/api/approvals/${id}/approve`).then((r) => r.data),
  reject: (id: string) =>
    api.post(`/api/approvals/${id}/reject`).then((r) => r.data),
};

// ── Audit ──────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    date_from?: string;
    date_to?: string;
    agent_id?: string;
    status?: string;
    action_type?: string;
  }) => api.get<AuditLogPage>("/api/audit", { params }).then((r) => r.data),
  exportCsv: (params?: Record<string, string>) =>
    api.get("/api/audit/export", { params, responseType: "blob" }).then((r) => r.data),
};

// ── Users ──────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => api.get<UserProfile[]>("/api/users").then((r) => r.data),
  invite: (data: InvitePayload) =>
    api.post<UserProfile>("/api/users/invite", data).then((r) => r.data),
  updateRole: (id: string, role: UserProfile["role"]) =>
    api.patch<UserProfile>(`/api/users/${id}`, { role }).then((r) => r.data),
  deactivate: (id: string) =>
    api.patch<UserProfile>(`/api/users/${id}`, { status: "inactive" }).then((r) => r.data),
};
