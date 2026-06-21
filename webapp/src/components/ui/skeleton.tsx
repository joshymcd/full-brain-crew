import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse bg-oklch(0.96 0.002 17.2) dark:bg-oklch(0.268 0.011 36.5)", className)}
      {...props}
    />
  )
}

export { Skeleton }
