import * as React from "react";

import { cn } from "./utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          // Base styles matching design system
          "flex h-10 w-full min-w-0 rounded px-3 py-2.5",
          "bg-[var(--interaction-secondary-base,#FFFFFF)]",
          "text-sm text-[var(--content-dark-primary,#000000)]",
          
          // Border and outline - using design system tokens
          "outline outline-1 outline-offset-[-1px]",
          "outline-[var(--interaction-outline-base,#D9DFEB)]",
          
          // Placeholder
          "placeholder:text-[var(--content-dark-tertiary,#A3A7B0)]",
          
          // Hover state
          "hover:outline-[var(--interaction-outline-hover,#A3A7B0)]",
          
          // Focus state
          "focus:outline-[var(--interaction-outline-active,#6D7076)]",
          "focus-visible:outline-[var(--interaction-outline-active,#6D7076)]",
          
          // Error state (using aria-invalid)
          "aria-invalid:outline-[var(--interaction-red-base,#AF4B4B)]",
          "aria-[invalid=true]:outline-[var(--interaction-red-base,#AF4B4B)]",
          
          // Success state (using data attribute)
          "data-[valid=true]:outline-[var(--interaction-green-base,#589E67)]",
          
          // Disabled state
          "disabled:bg-[var(--interaction-secondary-disabled,#F7F9FB)]",
          "disabled:outline-[var(--interaction-outline-disabled,#E8ECF3)]",
          "disabled:text-[var(--content-dark-disable,#D9DFEB)]",
          "disabled:placeholder:text-[var(--content-dark-disable,#D9DFEB)]",
          "disabled:cursor-not-allowed",
          "disabled:pointer-events-none",
          
          // Transitions
          "transition-all duration-200",
          
          // File input styles
          "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          
          // Selection
          "selection:bg-primary selection:text-primary-foreground",
          
          className,
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
