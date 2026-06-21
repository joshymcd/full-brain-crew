import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-oklch(0.922 0.005 34.3) border-transparent bg-clip-padding text-xs font-semibold tracking-widest whitespace-nowrap uppercase transition-all outline-none select-none focus-visible:border-oklch(0.714 0.014 41.2) focus-visible:ring-2 focus-visible:ring-oklch(0.714 0.014 41.2)/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-oklch(0.577 0.245 27.325) aria-invalid:ring-2 aria-invalid:ring-oklch(0.577 0.245 27.325)/20 dark:aria-invalid:border-oklch(0.577 0.245 27.325)/50 dark:aria-invalid:ring-oklch(0.577 0.245 27.325)/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 dark:border-oklch(1 0 0 / 10%) dark:focus-visible:border-oklch(0.547 0.021 43.1) dark:focus-visible:ring-oklch(0.547 0.021 43.1)/30 dark:aria-invalid:border-oklch(0.704 0.191 22.216) dark:aria-invalid:ring-oklch(0.704 0.191 22.216)/20 dark:dark:aria-invalid:border-oklch(0.704 0.191 22.216)/50 dark:dark:aria-invalid:ring-oklch(0.704 0.191 22.216)/40",
  {
    variants: {
      variant: {
        default: "bg-oklch(0.214 0.009 43.1) text-oklch(0.986 0.002 67.8) hover:bg-oklch(0.214 0.009 43.1)/80 dark:bg-oklch(0.922 0.005 34.3) dark:text-oklch(0.214 0.009 43.1) dark:hover:bg-oklch(0.922 0.005 34.3)/80",
        outline:
          "border-oklch(0.922 0.005 34.3) bg-transparent hover:bg-oklch(0.96 0.002 17.2) hover:text-oklch(0.147 0.004 49.3) aria-expanded:bg-oklch(0.96 0.002 17.2) aria-expanded:text-oklch(0.147 0.004 49.3) dark:hover:bg-oklch(0.922 0.005 34.3)/30 dark:border-oklch(1 0 0 / 10%) dark:hover:bg-oklch(0.268 0.011 36.5) dark:hover:text-oklch(0.986 0.002 67.8) dark:aria-expanded:bg-oklch(0.268 0.011 36.5) dark:aria-expanded:text-oklch(0.986 0.002 67.8) dark:dark:hover:bg-oklch(1 0 0 / 15%)/30",
        secondary:
          "bg-oklch(0.96 0.002 17.2) text-oklch(0.214 0.009 43.1) hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-oklch(0.96 0.002 17.2) aria-expanded:text-oklch(0.214 0.009 43.1) dark:bg-oklch(0.268 0.011 36.5) dark:text-oklch(0.986 0.002 67.8) dark:aria-expanded:bg-oklch(0.268 0.011 36.5) dark:aria-expanded:text-oklch(0.986 0.002 67.8)",
        ghost:
          "hover:bg-oklch(0.96 0.002 17.2) hover:text-oklch(0.147 0.004 49.3) aria-expanded:bg-oklch(0.96 0.002 17.2) aria-expanded:text-oklch(0.147 0.004 49.3) dark:hover:bg-oklch(0.96 0.002 17.2)/50 dark:hover:bg-oklch(0.268 0.011 36.5) dark:hover:text-oklch(0.986 0.002 67.8) dark:aria-expanded:bg-oklch(0.268 0.011 36.5) dark:aria-expanded:text-oklch(0.986 0.002 67.8) dark:dark:hover:bg-oklch(0.268 0.011 36.5)/50",
        destructive:
          "bg-oklch(0.577 0.245 27.325)/10 text-oklch(0.577 0.245 27.325) hover:bg-oklch(0.577 0.245 27.325)/20 focus-visible:border-oklch(0.577 0.245 27.325)/40 focus-visible:ring-oklch(0.577 0.245 27.325)/20 dark:bg-oklch(0.577 0.245 27.325)/20 dark:hover:bg-oklch(0.577 0.245 27.325)/30 dark:focus-visible:ring-oklch(0.577 0.245 27.325)/40 dark:bg-oklch(0.704 0.191 22.216)/10 dark:text-oklch(0.704 0.191 22.216) dark:hover:bg-oklch(0.704 0.191 22.216)/20 dark:focus-visible:border-oklch(0.704 0.191 22.216)/40 dark:focus-visible:ring-oklch(0.704 0.191 22.216)/20 dark:dark:bg-oklch(0.704 0.191 22.216)/20 dark:dark:hover:bg-oklch(0.704 0.191 22.216)/30 dark:dark:focus-visible:ring-oklch(0.704 0.191 22.216)/40",
        link: "text-oklch(0.214 0.009 43.1) underline underline-offset-4 hover:underline dark:text-oklch(0.922 0.005 34.3)",
      },
      size: {
        default:
          "h-10 gap-1.5 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-11 gap-1.5 px-8 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
