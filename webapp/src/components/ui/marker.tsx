import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const markerVariants = cva(
  "group/marker relative flex min-h-4 w-full items-center gap-2 text-left text-xs tracking-wide text-oklch(0.547 0.021 43.1) uppercase [&_svg:not([class*='size-'])]:size-4 [a]:underline [a]:underline-offset-3 [a]:hover:text-oklch(0.147 0.004 49.3) dark:text-oklch(0.714 0.014 41.2) dark:[a]:hover:text-oklch(0.986 0.002 67.8)",
  {
    variants: {
      variant: {
        default: "",
        separator:
          "before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-oklch(0.922 0.005 34.3) after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-oklch(0.922 0.005 34.3) dark:before:bg-oklch(1 0 0 / 10%) dark:after:bg-oklch(1 0 0 / 10%)",
        border: "border-b border-oklch(0.922 0.005 34.3) pb-2 dark:border-oklch(1 0 0 / 10%)",
      },
    },
  },
);

function Marker({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof markerVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      data-slot="marker"
      data-variant={variant}
      className={cn(markerVariants({ variant, className }))}
      {...props}
    />
  );
}

function MarkerIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      className={cn("size-4 shrink-0 [&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    />
  );
}

function MarkerContent({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="marker-content"
      className={cn(
        "min-w-0 wrap-break-word group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-oklch(0.147 0.004 49.3) dark:*:[a]:hover:text-oklch(0.986 0.002 67.8)",
        className,
      )}
      {...props}
    />
  );
}

export { Marker, MarkerIcon, MarkerContent, markerVariants };
