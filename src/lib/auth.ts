const TOKEN_KEY = "agentforge_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface JWTUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "bank_admin" | "manager" | "analyst";
  org_id: string;
}

export function getUser(): JWTUser | null {
  const token = getToken();
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload as JWTUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
