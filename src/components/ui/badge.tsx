import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { StatusDot } from "./status-dot";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium w-fit whitespace-nowrap shrink-0 transition-colors",
  {
    variants: {
      variant: {
        // Color variants with dots (rounded-full)
        green: "px-2 py-1 rounded-[36px] bg-[var(--background-green,#ECFDF3)] text-[var(--interaction-green-base,#589E67)]",
        blue: "px-2 py-1 rounded-[36px] bg-[var(--background-blue,#EFF8FF)] text-[var(--interaction-blue-base,#2E90FA)]",
        yellow: "px-2 py-1 rounded-[36px] bg-[var(--background-yellow,#FFFAEB)] text-[var(--interaction-yellow-base,#DC6803)]",
        purple: "px-2 py-1 rounded-[36px] bg-[var(--background-purple,#F4F3FF)] text-[var(--interaction-purple-base,#7F56D9)]",
        red: "px-2 py-1 rounded-[36px] bg-[var(--background-red,#FEF3F2)] text-[var(--interaction-red-base,#AF4B4B)]",
        orange: "px-2 py-1 rounded-[36px] bg-[var(--background-orange,var(--surface-sage))] text-[var(--interaction-orange-base,#1E7048)]",
        neutral: "px-2 py-1 rounded-[36px] bg-[var(--background-secondary,#F7F9FB)] text-[var(--interaction-primary-base,#1E7048)]",

        // Square variants (rounded normal)
        "green-square": "px-1.5 py-1 rounded bg-[var(--background-green,#ECFDF3)] text-[var(--interaction-green-base,#589E67)]",
        "blue-square": "px-1.5 py-1 rounded bg-[var(--background-blue,#EFF8FF)] text-[var(--interaction-blue-base,#2E90FA)]",
        "yellow-square": "px-1.5 py-1 rounded bg-[var(--background-yellow,#FFFAEB)] text-[var(--interaction-yellow-base,#DC6803)]",
        "purple-square": "px-1.5 py-1 rounded bg-[var(--background-purple,#F4F3FF)] text-[var(--interaction-purple-base,#7F56D9)]",
        "red-square": "px-1.5 py-1 rounded bg-[var(--background-red,#FEF3F2)] text-[var(--interaction-red-base,#AF4B4B)]",
        "orange-square": "px-1.5 py-1 rounded bg-[var(--background-orange,var(--surface-sage))] text-[var(--interaction-orange-base,#1E7048)]",
        "neutral-square": "px-1.5 py-1 rounded bg-[var(--background-secondary,#F7F9FB)] text-[var(--interaction-primary-base,#1E7048)]",

        // Legacy variants for backward compatibility
        default: "px-2 py-1 rounded-[36px] bg-[var(--background-orange,var(--surface-sage))] text-[var(--interaction-orange-base,#1E7048)]",
        secondary: "px-2 py-1 rounded-[36px] bg-[var(--background-secondary,#F7F9FB)] text-[var(--interaction-primary-base,#1E7048)]",
        destructive: "px-2 py-1 rounded-[36px] bg-[var(--background-red,#FEF3F2)] text-[var(--interaction-red-base,#AF4B4B)]",
        outline: "px-2 py-1 rounded-[36px] border border-[var(--border-primary,#E8ECF3)] text-[var(--content-dark-primary,#000000)]",
      },
      size: {
        sm: "text-xs py-1",
        md: "text-sm py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    /** Show status dot before text */
    dot?: boolean;
    /** Color variant for the dot (overrides variant if needed) */
    dotVariant?: "blue" | "green" | "orange" | "yellow" | "red" | "neutral" | "purple";
  }
>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      dot = false,
      dotVariant,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "span";

    // Map badge variant to dot variant if not explicitly set
    const getDotVariant = (): typeof dotVariant => {
      if (dotVariant) return dotVariant;
      if (variant?.includes("green")) return "green";
      if (variant?.includes("blue")) return "blue";
      if (variant?.includes("yellow")) return "yellow";
      if (variant?.includes("purple")) return "purple";
      if (variant?.includes("red") || variant === "destructive") return "red";
      if (variant?.includes("orange") || variant === "default") return "orange";
      return "neutral";
    };

    return (
      <Comp
        ref={ref}
        data-slot="badge"
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && <StatusDot variant={getDotVariant()} size="sm" />}
        {children}
      </Comp>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
