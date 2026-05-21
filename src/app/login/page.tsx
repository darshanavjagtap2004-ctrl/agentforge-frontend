"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, Loader2, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { authApi, LoginPayload } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginPayload>();

  async function onSubmit(data: LoginPayload) {
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login(data);
      setToken(res.token);
      toast.success("Welcome back!");
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Invalid credentials";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setValue("email", "admin@demobank.com");
    setValue("password", "Demo@1234");
    toast.info("Demo credentials filled");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">AgentForge</h1>
          <p className="text-slate-500 text-sm mt-1">AI Agents for Banking Operations</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              {...register("email", { required: "Email is required" })}
              type="email"
              placeholder="you@bank.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              {...register("password", { required: "Password is required" })}
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={fillDemo}
            className="w-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <ClipboardCopy className="h-4 w-4" />
            Copy Demo Credentials
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          No account?{" "}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
