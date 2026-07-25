import * as React from "react";
import { cn } from "./utils";

interface FormHelperProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: boolean;
  success?: boolean;
}

function FormHelper({ 
  className, 
  error = false,
  success = false,
  ...props 
}: FormHelperProps) {
  return (
    <p
      data-slot="form-helper"
      className={cn(
        // Base styles matching design system
        "text-xs font-normal leading-4",
        
        // Default color
        !error && !success && "text-[var(--content-dark-tertiary,#A3A7B0)]",
        
        // Error state
        error && "text-[var(--interaction-red-base,#AF4B4B)]",
        
        // Success state
        success && "text-[var(--interaction-green-base,#589E67)]",
        
        className,
      )}
      {...props}
    />
  );
}

export { FormHelper };
