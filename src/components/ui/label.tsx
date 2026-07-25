"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "./utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        // Design system label styles
        "flex items-center gap-2",
        "text-sm font-normal leading-5",
        "text-[var(--content-dark-primary,#000000)]",
        "select-none",
        
        // Disabled state
        "group-data-[disabled=true]:pointer-events-none",
        "group-data-[disabled=true]:text-[var(--content-dark-disable,#D9DFEB)]",
        "peer-disabled:cursor-not-allowed",
        "peer-disabled:text-[var(--content-dark-disable,#D9DFEB)]",
        
        className,
      )}
      {...props}
    />
  );
}

export { Label };
