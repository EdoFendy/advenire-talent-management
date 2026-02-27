import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { pageTransition } from "@/lib/animations"

interface AnimatedContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
}

export function AnimatedContainer({ children, className, ...props }: AnimatedContainerProps) {
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
      transition={pageTransition.transition}
      className={cn("w-full", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}
