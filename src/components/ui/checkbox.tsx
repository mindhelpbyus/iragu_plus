"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "./utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // Base styles matching design system
        "peer size-5 shrink-0 rounded",
        "bg-[var(--interaction-secondary-base,#FFFFFF)]",

        // Border - using design system tokens
        "border border-[var(--interaction-outline-base,#D9DFEB)]",

        // Hover state
        "hover:border-[var(--interaction-outline-hover,#A3A7B0)]",

        // Checked state
        "data-[state=checked]:bg-[var(--action-primary-base,#1E7048)]",
        "data-[state=checked]:border-[var(--action-primary-base,#1E7048)]",
        "data-[state=checked]:text-white",

        // Focus state
        "focus-visible:border-[var(--interaction-outline-active,#6D7076)]",
        "outline-none",

        // Disabled state
        "disabled:bg-[var(--interaction-secondary-disabled,#F7F9FB)]",
        "disabled:border-[var(--interaction-outline-disabled,#E8ECF3)]",
        "disabled:cursor-not-allowed",

        // Transitions
        "transition-all duration-200",

        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <CheckIcon className="size-3.5" strokeWidth={2.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
