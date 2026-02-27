import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8", className)}
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-1.5">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </motion.div>
  )
}
