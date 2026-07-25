"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { Check, Minus, Circle } from "lucide-react";

import { cn } from "./utils";

/**
 * Avatar Status Types matching design specification:
 * - active: Green with checkmark (top-right)
 * - busy: Orange with minus/hyphen (top-right)
 * - away: Gray with pause/double-line (top-right)
 * - online: Green dot only (bottom-right)
 * - dnd: Red with X or dot (bottom-right)
 * - focus: Purple/Indigo with timer (bottom-right)
 * - offline: Gray with dot (bottom-right)
 */
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    /** Status indicator type */
    status?: "active" | "busy" | "away" | "online" | "dnd" | "focus" | "offline" | "none";
    /** Status indicator placement - defaults based on status type */
    statusPlacement?: "top-right" | "bottom-right";
    /** Show border (zinc-100) */
    bordered?: boolean;
  }
>(
  (
    {
      className,
      status = "none",
      statusPlacement,
      bordered = false,
      children,
      ...props
    },
    ref
  ) => {
    // Determine default placement based on status type if not explicitly set
    const getDefaultPlacement = () => {
      if (statusPlacement) return statusPlacement;

      // Top-right for work status (active, busy, away)
      if (status === "active" || status === "busy" || status === "away") {
        return "top-right";
      }

      // Bottom-right for presence status (online, dnd, focus, offline)
      return "bottom-right";
    };

    const placement = getDefaultPlacement();

    const getStatusColor = () => {
      switch (status) {
        case "active":
        case "online":
          return "bg-emerald-500";  // Green for active/online
        case "busy":
          return "bg-action-dark";  // Orange for busy
        case "away":
          return "bg-zinc-200";  // Gray for away
        case "dnd":
          return "bg-red-500";  // Red for do not disturb
        case "focus":
          return "bg-indigo-700";  // Purple/Indigo for focus
        case "offline":
          return "bg-slate-500";  // Gray for offline
        default:
          return "";
      }
    };

    const getStatusIcon = () => {
      switch (status) {
        case "active":
          return <Check className="w-2 h-1.5 text-white" strokeWidth={4} />;
        case "busy":
          return <Minus className="w-1.5 h-1.5 text-white" strokeWidth={3} />;
        case "away":
          return (
            <div className="w-1.5 h-2 bg-slate-600 flex flex-col gap-0.5 items-center justify-center">
              {/* Pause icon - two vertical bars */}
            </div>
          );
        case "online":
          return null; // Just a dot, no icon
        case "dnd":
          return <Circle className="w-1.5 h-1.5 text-white" fill="white" strokeWidth={0} />;
        case "focus":
          return (
            <div className="w-2.5 h-2.5 bg-indigo-700 flex items-center justify-center">
              {/* Timer/Focus icon */}
            </div>
          );
        case "offline":
          return <Circle className="w-1.5 h-1.5 text-zinc-200" fill="currentColor" strokeWidth={0} />;
        default:
          return null;
      }
    };

    // Status badge position
    const statusPositionClass = placement === "top-right"
      ? "-top-0.5 -right-0.5"
      : "bottom-0 right-0";

    // Determine status badge size based on avatar size
    const getStatusBadgeSize = () => {
      // Extract size from className if provided


      // Default to size-3.5 for 40px avatar (default)
      // You can make this more sophisticated based on actual size detection
      return "size-3.5";
    };

    return (
      <AvatarPrimitive.Root
        ref={ref}
        data-slot="avatar"
        className={cn(
          "relative flex size-10 shrink-0 overflow-hidden rounded-full",
          bordered && "border border-zinc-100",
          className,
        )}
        {...props}
      >
        {children}

        {status !== "none" && (
          <div
            className={cn(
              "absolute flex items-center justify-center",
              getStatusBadgeSize(),
              "rounded-[10px]",
              "outline outline-2 outline-offset-[-2px] outline-white",
              getStatusColor(),
              statusPositionClass,
            )}
          >
            {getStatusIcon()}
          </div>
        )}
      </AvatarPrimitive.Root>
    );
  }
);

Avatar.displayName = "Avatar";

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
