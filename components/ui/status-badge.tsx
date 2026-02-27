import * as React from "react"
import { cn } from "@/lib/utils"

type StatusType = "active" | "inactive" | "pending" | "completed" | "cancelled" | "draft" | "confirmed" | "in_progress"

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: { label: "Attivo", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  inactive: { label: "Inattivo", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  pending: { label: "In Attesa", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  completed: { label: "Completato", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  cancelled: { label: "Annullato", className: "bg-red-500/15 text-red-400 border-red-500/20" },
  draft: { label: "Bozza", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  confirmed: { label: "Confermato", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  in_progress: { label: "In Corso", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
}

interface StatusBadgeProps {
  status: StatusType | string
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] || {
    label: status,
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
        config.className,
        className
      )}
    >
      {label || config.label}
    </span>
  )
}
