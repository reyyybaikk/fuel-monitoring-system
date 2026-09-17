"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    const [checked, setChecked] = React.useState(props.checked || false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked
      setChecked(isChecked)
      if (onCheckedChange) {
        onCheckedChange(isChecked)
      }
    }

    return (
      <div className="relative flex items-center justify-center h-4 w-4 shrink-0 shadow-sm">
        <input
          type="checkbox"
          ref={ref}
          className={cn(
            "peer h-4 w-4 appearance-none rounded-[4px] border border-slate-300 bg-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pln-cyan focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-pln-cyan checked:border-pln-cyan transition-all",
            className
          )}
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        <Check
          className="absolute h-3 w-3 text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none stroke-[4px]"
        />
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
