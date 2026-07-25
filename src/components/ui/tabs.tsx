"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  variant = "underline",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: "underline" | "solid" | "button-group";
}) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "inline-flex w-fit items-center justify-center",
        
        // Underline variant (default)
        variant === "underline" && "gap-8",
        
        // Solid variant (with background)
        variant === "solid" && "gap-2.5 p-0",
        
        // Button group variant
        variant === "button-group" && "gap-0",
        
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = props["data-variant" as keyof typeof props] as string || "underline";
  
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "text-sm font-medium whitespace-nowrap",
        "transition-all duration-150",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
        
        // Underline variant
        variant === "underline" && [
          "p-4 border-b-2 border-transparent",
          "text-[var(--content-dark-secondary,#6D7076)]",
          "data-[state=active]:border-[var(--content-dark-primary,#000000)]",
          "data-[state=active]:text-[var(--content-dark-primary,#000000)]",
          "hover:text-[var(--content-dark-primary,#000000)]",
        ],
        
        // Solid variant
        variant === "solid" && [
          "px-4 py-2",
          "text-[var(--content-dark-secondary,#6D7076)]",
          "data-[state=active]:bg-[var(--content-dark-primary,#000000)]",
          "data-[state=active]:text-[var(--content-light-primary,#FFFFFF)]",
          "data-[state=inactive]:outline data-[state=inactive]:outline-1 data-[state=inactive]:outline-offset-[-0.5px]",
          "data-[state=inactive]:outline-[var(--border-primary,#E8ECF3)]",
        ],
        
        // Button group variant
        variant === "button-group" && [
          "px-4 py-2",
          "text-[var(--content-dark-secondary,#6D7076)]",
          "outline outline-1 outline-offset-[-0.5px] outline-[var(--border-primary,#E8ECF3)]",
          "data-[state=active]:bg-[var(--content-dark-primary,#000000)]",
          "data-[state=active]:text-[var(--content-light-primary,#FFFFFF)]",
          "data-[state=active]:z-10",
          "first:rounded-l",
          "last:rounded-r",
          "-ml-px first:ml-0",
        ],
        
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
