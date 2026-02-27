import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"
import { GlassCard } from "./glass-card"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: number; label?: string }
  className?: string
  color?: "blue" | "emerald" | "amber" | "red" | "white"
}

const colorMap = {
  blue: "text-blue-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
  white: "text-white",
}

const bgColorMap = {
  blue: "bg-blue-500/10",
  emerald: "bg-emerald-500/10",
  amber: "bg-amber-500/10",
  red: "bg-red-500/10",
  white: "bg-white/[0.06]",
}

export function StatCard({ label, value, icon: Icon, trend, className, color = "white" }: StatCardProps) {
  return (
    <GlassCard hover className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            {label}
          </p>
          <p className={cn("text-2xl font-black tracking-tight", colorMap[color])}>
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn("p-2.5 rounded-xl", bgColorMap[color])}>
            <Icon size={18} className={colorMap[color]} />
          </div>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1.5 mt-3">
          {trend.value >= 0 ? (
            <TrendingUp size={12} className="text-emerald-400" />
          ) : (
            <TrendingDown size={12} className="text-red-400" />
          )}
          <span className={cn(
            "text-[10px] font-bold",
            trend.value >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {trend.value > 0 ? "+" : ""}{trend.value}%
          </span>
          {trend.label && (
            <span className="text-[10px] text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}
    </GlassCard>
  )
}
