import * as React from "react";
import { cn } from "./utils";

interface StatusSquareProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Status color variant */
  variant?: "blue" | "green" | "orange" | "yellow" | "red" | "neutral" | "purple";
}

const StatusSquare = React.forwardRef<HTMLDivElement, StatusSquareProps>(
  ({ className, variant = "neutral", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "size-5 shrink-0 overflow-hidden",
          
          // Colors
          variant === "blue" && "bg-[var(--interaction-blue-base,#2E90FA)]",
          variant === "green" && "bg-[var(--interaction-green-base,#589E67)]",
          variant === "orange" && "bg-[var(--interaction-orange-base,#1E7048)]",
          variant === "yellow" && "bg-[var(--interaction-yellow-base,#DC6803)]",
          variant === "red" && "bg-[var(--interaction-red-base,#AF4B4B)]",
          variant === "neutral" && "bg-[var(--interaction-primary-base,#1E7048)]",
          variant === "purple" && "bg-[var(--interaction-purple-base,#7F56D9)]",
          
          className,
        )}
        {...props}
      />
    );
  }
);

StatusSquare.displayName = "StatusSquare";

export { StatusSquare };
export type { StatusSquareProps };