import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background,color,border-color,opacity] duration-150 outline-none select-none focus-visible:border-[var(--accent)] focus-visible:shadow-[var(--shadow-focus)] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-35 aria-invalid:border-[var(--status-danger)] aria-invalid:shadow-[0_0_0_2px_rgba(239,68,68,0.20)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] font-semibold text-[var(--text-inverse)] hover:bg-[var(--accent-dim)]",
        outline:
          "border-[var(--surface-border)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)] aria-expanded:bg-[var(--surface-overlay)] aria-expanded:text-[var(--text-primary)]",
        secondary:
          "border border-[var(--surface-border)] bg-[var(--surface-overlay)] text-[var(--text-primary)] hover:bg-[var(--surface-card)] aria-expanded:bg-[var(--surface-overlay)] aria-expanded:text-[var(--text-primary)]",
        ghost:
          "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)] aria-expanded:bg-[var(--surface-overlay)] aria-expanded:text-[var(--text-primary)]",
        destructive:
          "border border-[rgba(239,68,68,0.35)] bg-[var(--status-danger-bg)] text-[var(--status-danger)] hover:bg-[rgba(239,68,68,0.18)] focus-visible:border-[var(--status-danger)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
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
