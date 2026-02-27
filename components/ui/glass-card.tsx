import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "prominent" | "interactive"
  hover?: boolean
  children: React.ReactNode
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", hover = false, children, ...props }, ref) => {
    const variants = {
      default: "bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]",
      prominent: "bg-white/[0.05] backdrop-blur-2xl border border-white/[0.12]",
      interactive: "bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] cursor-pointer",
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-2xl",
          variants[variant],
          hover && "hover:bg-white/[0.06] hover:border-white/[0.15] hover:shadow-lg hover:shadow-white/[0.02]",
          "transition-colors duration-300",
          className
        )}
        {...(hover ? {
          whileHover: { y: -3, scale: 1.005 },
          whileTap: { scale: 0.995 },
          transition: { type: "spring", stiffness: 400, damping: 25 },
        } : {})}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }
