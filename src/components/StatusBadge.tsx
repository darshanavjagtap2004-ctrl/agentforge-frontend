import { cn } from "@/lib/utils";
import type { RunStatus } from "@/lib/api";

const styles: Record<RunStatus, string> = {
  completed: "bg-green-100 text-green-800",
  running: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
  waiting_approval: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const labels: Record<RunStatus, string> = {
  completed: "Completed",
  running: "Running",
  failed: "Failed",
  waiting_approval: "Waiting Approval",
  cancelled: "Cancelled",
};

export default function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        styles[status] ?? "bg-gray-100 text-gray-800"
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
