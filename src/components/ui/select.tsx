"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";

import { cn } from "./utils";

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        // Base styles matching design system
        "flex w-full items-center justify-between gap-3 rounded px-3 py-2.5",
        "bg-[var(--interaction-secondary-base,#FFFFFF)]",
        "text-sm whitespace-nowrap",

        // Border and outline - using design system tokens
        "outline outline-1 outline-offset-[-1px]",
        "outline-[var(--interaction-outline-base,#D9DFEB)]",

        // Placeholder styling
        "data-[placeholder]:text-[var(--content-dark-tertiary,#A3A7B0)]",

        // Hover state
        "hover:outline-[var(--interaction-outline-hover,#A3A7B0)]",

        // Focus/Active state
        "focus:outline-[var(--interaction-outline-active,#6D7076)]",
        "data-[state=open]:outline-[var(--interaction-outline-active,#6D7076)]",

        // Disabled state
        "disabled:bg-[var(--interaction-secondary-disabled,#F7F9FB)]",
        "disabled:outline-[var(--interaction-outline-disabled,#E8ECF3)]",
        "disabled:text-[var(--content-dark-disable,#D9DFEB)]",
        "disabled:cursor-not-allowed",

        // Transitions
        "transition-all duration-200",

        // Icon styling
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='size-'])]:size-5",
        "[&_svg]:text-[var(--content-dark-primary,#000000)]",

        // Value container
        "*:data-[slot=select-value]:line-clamp-1",
        "*:data-[slot=select-value]:flex",
        "*:data-[slot=select-value]:items-center",
        "*:data-[slot=select-value]:gap-2",
        "*:data-[slot=select-value]:flex-1",
        "*:data-[slot=select-value]:text-left",

        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-5" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          // Base styles matching design system
          "relative z-[100] min-w-[8rem] rounded",
          "bg-card",
          "text-[var(--content-dark-primary,#000000)]",

          // Shadow from design system
          "shadow-[0px_4px_20px_0px_rgba(230,233,239,1.00)]",

          // Border
          "outline outline-1 outline-offset-[-1px] outline-gray-100",

          // Max height
          "max-h-[var(--radix-select-content-available-height)]",
          "max-h-96", // Fallback max height

          "origin-[var(--radix-select-content-transform-origin)]",

          // Animations
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2",
          "data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2",
          "data-[side=top]:slide-in-from-bottom-2",

          position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            "overflow-y-auto", // Enable scrolling on viewport
            position === "popper" &&
            "w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // Base styles matching design system
        "relative flex w-full cursor-default items-center gap-2",
        "px-3 py-1.5",
        "text-sm",
        "text-[var(--content-dark-primary,#000000)]",
        "bg-card",
        "select-none outline-none",

        // Hover state - matching design system
        "hover:bg-[var(--interaction-secondary-hover,#F7F9FB)]",
        "data-[highlighted]:bg-[var(--interaction-secondary-hover,#F7F9FB)]",

        // Disabled state
        "data-[disabled]:pointer-events-none",
        "data-[disabled]:bg-[var(--interaction-secondary-disabled,#F7F9FB)]",
        "data-[disabled]:text-[var(--content-dark-disable,#D9DFEB)]",

        // Icon styling
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='size-'])]:size-4",

        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1 flex items-center gap-2">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
