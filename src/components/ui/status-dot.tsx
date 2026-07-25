import * as React from "react";
import { cn } from "./utils";

interface StatusDotProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Status color variant */
  variant?: "blue" | "green" | "orange" | "yellow" | "red" | "neutral" | "purple";
  /** Size of the dot */
  size?: "sm" | "md";
}

const StatusDot = React.forwardRef<HTMLDivElement, StatusDotProps>(
  ({ className, variant = "neutral", size = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-full shrink-0",
          
          // Sizes
          size === "sm" && "size-2",
          size === "md" && "size-2.5",
          
          // Colors
          variant === "blue" && "bg-[var(--interaction-blue-base,#2E90FA)]",
          variant === "green" && "bg-[var(--interaction-green-base,#589E67)]",
          variant === "orange" && "bg-[var(--interaction-orange-base,#1E7048)]",
          variant === "yellow" && "bg-[var(--interaction-yellow-base,#DC6803)]",
          variant === "red" && "bg-[var(--interaction-red-base,#AF4B4B)]",
          variant === "neutral" && "bg-[var(--global-colors-neutral-80,#6D7076)]",
          variant === "purple" && "bg-[var(--interaction-purple-base,#7F56D9)]",
          
          className,
        )}
        {...props}
      />
    );
  }
);

StatusDot.displayName = "StatusDot";

export { StatusDot };
export type { StatusDotProps };
