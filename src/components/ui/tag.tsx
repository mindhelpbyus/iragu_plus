import * as React from "react";
import { X } from "lucide-react";
import { cn } from "./utils";

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Tag variant */
  variant?: "filled" | "outlined";
  /** Whether the tag can be removed */
  removable?: boolean;
  /** Callback when tag is removed */
  onRemove?: () => void;
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  (
    {
      className,
      children,
      variant = "filled",
      removable = false,
      onRemove,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        data-slot="tag"
        className={cn(
          // Base styles
          "inline-flex items-center gap-1.5 rounded-full",
          "px-2 py-1",
          "text-xs font-medium",
          "text-[var(--content-dark-primary,#000000)]",
          "transition-colors duration-150",
          
          // Filled variant
          variant === "filled" && [
            "bg-[var(--action-secondary-base-2,#F7F9FB)]",
            "hover:bg-[var(--action-secondary-hover,#E8ECF3)]",
          ],
          
          // Outlined variant
          variant === "outlined" && [
            "bg-[var(--action-secondary-base,#FFFFFF)]",
            "outline outline-1 outline-offset-[-1px]",
            "outline-[var(--interaction-outline-base,#D9DFEB)]",
            "hover:outline-[var(--interaction-outline-hover,#A3A7B0)]",
          ],
          
          className,
        )}
        {...props}
      >
        {variant === "outlined" && removable && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center justify-center hover:opacity-70 transition-opacity"
            aria-label="Remove tag"
          >
            <X className="size-3" />
          </button>
        )}
        
        {children}
        
        {variant === "filled" && removable && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center justify-center hover:opacity-70 transition-opacity"
            aria-label="Remove tag"
          >
            <X className="size-3" />
          </button>
        )}
      </span>
    );
  }
);

Tag.displayName = "Tag";

export { Tag };
export type { TagProps };
