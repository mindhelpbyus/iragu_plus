import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "./utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/**
 * DatePickerField Component
 * Complete date picker with label, calendar icon, and helper text
 * Matches design specification exactly with semantic color tokens
 */

export interface DatePickerFieldProps {
  label?: string;
  helperText?: string;
  error?: string | boolean;
  success?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  value?: Date;
  onValueChange?: (date: Date | undefined) => void;
  containerClassName?: string;
  triggerClassName?: string;
}

export const DatePickerField = React.forwardRef<HTMLButtonElement, DatePickerFieldProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      required,
      disabled,
      placeholder = "Select Date",
      value,
      onValueChange,
      containerClassName,
      triggerClassName,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);

    // Determine validation state
    const isError = error === true || (typeof error === 'string' && error.length > 0);
    const isSuccess = success && !isError;
    const validationHelperText = typeof error === 'string' ? error : helperText;

    // Get appropriate outline color based on state
    const getOutlineClass = () => {
      if (disabled) return 'outline-[var(--border-secondary)]';
      if (isError) return 'outline-[var(--interaction-red-base)] hover:outline-[var(--interaction-red-hover)] data-[state=open]:outline-[var(--interaction-red-base)]';
      if (isSuccess) return 'outline-[var(--interaction-green-base)] hover:outline-[var(--interaction-green-hover)] data-[state=open]:outline-[var(--interaction-green-base)]';
      if (open) return 'outline-[var(--interaction-primary-active)]';
      return 'outline-[var(--interaction-outline-base)] hover:outline-[var(--content-dark-tertiary)]';
    };

    return (
      <div className={cn("w-full flex flex-col gap-2", containerClassName)}>
        {/* Label */}
        {label && (
          <div className="flex flex-col justify-center">
            <label className="text-sm text-[var(--content-dark-primary)] font-normal leading-5">
              {label}
              {required && <span className="text-[var(--interaction-red-base)] ml-0.5">*</span>}
            </label>
          </div>
        )}

        {/* Date Picker */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              variant="outline"
              disabled={disabled}
              data-state={open ? "open" : "closed"}
              className={cn(
                // Base styles matching design system
                "w-full justify-start text-left font-normal",
                "px-3 py-2.5 h-auto",
                "bg-[var(--background-primary,#FFFFFF)]",
                "rounded",
                
                // Border and outline - using design system tokens
                "outline outline-1 outline-offset-[-1px]",
                getOutlineClass(),
                
                // Text color
                !value && "text-[var(--content-dark-tertiary)]",
                value && "text-[var(--content-dark-primary)]",
                disabled && "text-[var(--content-dark-disable)] bg-slate-50",
                
                // Remove default button styles
                "border-0 shadow-none hover:bg-transparent",
                
                // Transitions
                "transition-all duration-200",
                
                // Flex layout for icons
                "flex items-center gap-3",
                
                triggerClassName
              )}
            >
              {/* Calendar Icon - Left */}
              <CalendarIcon 
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  disabled 
                    ? "text-[var(--content-dark-disable)]" 
                    : "text-[var(--content-dark-secondary)]"
                )} 
              />
              
              {/* Date Text */}
              <span className="flex-1">
                {value ? format(value, "PPP") : placeholder}
              </span>
              
              {/* Chevron Down Icon - Right */}
              <ChevronDown 
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  disabled 
                    ? "text-[var(--content-dark-disable)]" 
                    : "text-[var(--content-dark-primary)]"
                )} 
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-0" 
            align="start"
            side="bottom"
          >
            <Calendar
              mode="single"
              selected={value}
              onSelect={(date) => {
                onValueChange?.(date);
                setOpen(false);
              }}
              disabled={disabled}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Helper Text */}
        {validationHelperText && (
          <div 
            className={cn(
              "text-xs font-normal leading-4",
              isError && "text-[var(--interaction-red-text)]",
              isSuccess && "text-[var(--interaction-green-text)]",
              !isError && !isSuccess && disabled && "text-[var(--content-dark-disable)]",
              !isError && !isSuccess && !disabled && "text-[var(--content-dark-tertiary)]"
            )}
          >
            {validationHelperText}
          </div>
        )}
      </div>
    );
  }
);

DatePickerField.displayName = "DatePickerField";
