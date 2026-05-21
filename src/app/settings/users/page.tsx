"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, UserProfile, InvitePayload } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, UserX, Loader2 } from "lucide-react";
import { getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ROLE_LABELS: Record<string, string> = {
  bank_admin: "Admin",
  manager: "Manager",
  analyst: "Analyst",
};

const ROLE_COLORS: Record<string, string> = {
  bank_admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  analyst: "bg-slate-100 text-slate-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-600",
};

export default function UsersPage() {
  const router = useRouter();
  const currentUser = getUser();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.role !== "bank_admin") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvitePayload>();

  const inviteMutation = useMutation({
    mutationFn: usersApi.invite,
    onSuccess: () => {
      toast.success("User invited");
      qc.invalidateQueries({ queryKey: ["users"] });
      setInviteOpen(false);
      reset();
    },
    onError: () => toast.error("Failed to invite user"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserProfile["role"] }) =>
      usersApi.updateRole(id, role),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Failed to update role"),
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => {
      toast.success("User deactivated");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Failed to deactivate"),
  });

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Users</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Manage team members and their access
                </p>
              </div>
              <button
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" /> Invite Member
              </button>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-6 py-3">User</th>
                      <th className="text-left px-6 py-3">Email</th>
                      <th className="text-left px-6 py-3">Role</th>
                      <th className="text-left px-6 py-3">Status</th>
                      <th className="text-left px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j} className="px-6 py-4">
                                <Skeleton className="h-4 w-24" />
                              </td>
                            ))}
                          </tr>
                        ))
                      : users?.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                  {user.first_name?.[0]}
                                  {user.last_name?.[0]}
                                </div>
                                <span className="font-medium text-slate-900">
                                  {user.first_name} {user.last_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{user.email}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  ROLE_COLORS[user.role] ?? "bg-slate-100"
                                }`}
                              >
                                {ROLE_LABELS[user.role] ?? user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  STATUS_COLORS[user.status] ?? "bg-gray-100"
                                }`}
                              >
                                {user.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <select
                                  defaultValue={user.role}
                                  onChange={(e) =>
                                    roleMutation.mutate({
                                      id: user.id,
                                      role: e.target.value as UserProfile["role"],
                                    })
                                  }
                                  disabled={user.id === currentUser?.id}
                                  className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                  <option value="bank_admin">Admin</option>
                                  <option value="manager">Manager</option>
                                  <option value="analyst">Analyst</option>
                                </select>
                                {user.status === "active" &&
                                  user.id !== currentUser?.id && (
                                    <button
                                      onClick={() => {
                                        if (confirm("Deactivate this user?"))
                                          deactivateMutation.mutate(user.id);
                                      }}
                                      disabled={deactivateMutation.isPending}
                                      className="flex items-center gap-1 px-2 py-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <UserX className="h-3 w-3" /> Deactivate
                                    </button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => inviteMutation.mutate(d))}
            className="space-y-4 py-2"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                {...register("email", { required: "Required" })}
                type="email"
                placeholder="user@bank.com"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  First Name
                </label>
                <input
                  {...register("first_name", { required: "Required" })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Last Name
                </label>
                <input
                  {...register("last_name", { required: "Required" })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                {...register("role", { required: "Required" })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="analyst">Analyst</option>
                <option value="manager">Manager</option>
                <option value="bank_admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Temporary Password
              </label>
              <input
                {...register("temp_password", { required: "Required" })}
                type="password"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {inviteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Send Invite
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
