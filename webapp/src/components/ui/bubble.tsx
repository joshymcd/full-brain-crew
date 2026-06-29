import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  );
}

const bubbleVariants = cva(
  "group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full",
  {
    variants: {
      variant: {
        default:
          "*:data-[slot=bubble-content]:bg-oklch(0.214 0.009 43.1) *:data-[slot=bubble-content]:text-oklch(0.986 0.002 67.8) [&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.214 0.009 43.1)/80 dark:*:data-[slot=bubble-content]:bg-oklch(0.922 0.005 34.3) dark:*:data-[slot=bubble-content]:text-oklch(0.214 0.009 43.1) dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.922 0.005 34.3)/80",
        secondary:
          "*:data-[slot=bubble-content]:bg-oklch(0.96 0.002 17.2) *:data-[slot=bubble-content]:text-oklch(0.214 0.009 43.1) [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] dark:*:data-[slot=bubble-content]:bg-oklch(0.268 0.011 36.5) dark:*:data-[slot=bubble-content]:text-oklch(0.986 0.002 67.8)",
        muted:
          "*:data-[slot=bubble-content]:bg-oklch(0.96 0.002 17.2) [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_5%)] dark:*:data-[slot=bubble-content]:bg-oklch(0.268 0.011 36.5)",
        tinted:
          "*:data-[slot=bubble-content]:bg-[oklch(from_var(--primary)_0.93_calc(c*0.4)_h)] *:data-[slot=bubble-content]:text-oklch(0.147 0.004 49.3) dark:*:data-[slot=bubble-content]:bg-[oklch(from_var(--primary)_0.3_calc(c*0.4)_h)] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[oklch(from_var(--primary)_0.88_calc(c*0.5)_h)] dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-[oklch(from_var(--primary)_0.35_calc(c*0.5)_h)] dark:*:data-[slot=bubble-content]:text-oklch(0.986 0.002 67.8)",
        outline:
          "*:data-[slot=bubble-content]:border-oklch(0.922 0.005 34.3) *:data-[slot=bubble-content]:bg-oklch(1 0 0) [&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.96 0.002 17.2) [&>[data-slot=bubble-content]:is(button,a):hover]:text-oklch(0.147 0.004 49.3) dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.922 0.005 34.3)/30 dark:*:data-[slot=bubble-content]:border-oklch(1 0 0 / 10%) dark:*:data-[slot=bubble-content]:bg-oklch(0.147 0.004 49.3) dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.268 0.011 36.5) dark:[&>[data-slot=bubble-content]:is(button,a):hover]:text-oklch(0.986 0.002 67.8) dark:dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(1 0 0 / 15%)/30",
        ghost:
          "border-none *:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0 [&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.96 0.002 17.2) [&>[data-slot=bubble-content]:is(button,a):hover]:text-oklch(0.147 0.004 49.3) dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.96 0.002 17.2)/50 dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.268 0.011 36.5) dark:[&>[data-slot=bubble-content]:is(button,a):hover]:text-oklch(0.986 0.002 67.8) dark:dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.268 0.011 36.5)/50",
        destructive:
          "*:data-[slot=bubble-content]:bg-oklch(0.577 0.245 27.325)/10 *:data-[slot=bubble-content]:text-oklch(0.577 0.245 27.325) dark:*:data-[slot=bubble-content]:bg-oklch(0.577 0.245 27.325)/20 [&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.577 0.245 27.325)/20 dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.577 0.245 27.325)/30 dark:*:data-[slot=bubble-content]:bg-oklch(0.704 0.191 22.216)/10 dark:*:data-[slot=bubble-content]:text-oklch(0.704 0.191 22.216) dark:dark:*:data-[slot=bubble-content]:bg-oklch(0.704 0.191 22.216)/20 dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.704 0.191 22.216)/20 dark:dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-oklch(0.704 0.191 22.216)/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bubbleVariants> & {
    align?: "start" | "end";
  }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  );
}

function BubbleContent({
  asChild = false,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      data-slot="bubble-content"
      className={cn(
        "w-fit max-w-full min-w-0 overflow-hidden rounded-none border border-oklch(0.922 0.005 34.3) border-transparent px-4 py-3 text-sm leading-relaxed wrap-break-word group-data-[align=end]/bubble:self-end [button]:text-left [button,a]:transition-colors [button,a]:outline-none [button,a]:focus-visible:border-oklch(0.714 0.014 41.2) [button,a]:focus-visible:ring-2 [button,a]:focus-visible:ring-oklch(0.714 0.014 41.2)/30 dark:border-oklch(1 0 0 / 10%) dark:[button,a]:focus-visible:border-oklch(0.547 0.021 43.1) dark:[button,a]:focus-visible:ring-oklch(0.547 0.021 43.1)/30",
        className,
      )}
      {...props}
    />
  );
}

const bubbleReactionsVariants = cva(
  "absolute z-10 flex w-fit shrink-0 items-center justify-center gap-1 rounded-none bg-oklch(0.96 0.002 17.2) px-2 py-0.5 text-sm ring-3 ring-oklch(1 0 0) has-[button]:p-0 dark:bg-oklch(0.268 0.011 36.5) dark:ring-oklch(0.214 0.009 43.1)",
  {
    variants: {
      side: {
        top: "top-0 -translate-y-3/4",
        bottom: "bottom-0 translate-y-3/4",
      },
      align: {
        start: "left-3",
        end: "right-3",
      },
    },
    defaultVariants: {
      side: "bottom",
      align: "end",
    },
  },
);

function BubbleReactions({
  side = "bottom",
  align = "end",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "end";
  side?: "top" | "bottom";
}) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(bubbleReactionsVariants({ side, align }), className)}
      {...props}
    />
  );
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions };
