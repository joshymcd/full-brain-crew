import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 border border-oklch(0.922 0.005 34.3) border-transparent border-b-input bg-transparent px-0 py-1 text-base transition-[color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-oklch(0.147 0.004 49.3) placeholder:text-oklch(0.547 0.021 43.1) focus-visible:border-b-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-b-destructive md:text-sm dark:aria-invalid:border-b-destructive/50 dark:border-oklch(1 0 0 / 10%) dark:file:text-oklch(0.986 0.002 67.8) dark:placeholder:text-oklch(0.714 0.014 41.2)",
        className
      )}
      {...props}
    />
  )
}

export { Input }
