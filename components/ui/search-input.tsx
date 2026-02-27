import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SearchInput({ value, onChange, placeholder = "Cerca...", className, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-10 pl-10 pr-9 rounded-xl",
          "bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm",
          "text-sm text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
          "transition-all duration-200"
        )}
        {...props}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
