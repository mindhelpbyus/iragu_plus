import * as React from "react";
import { cn } from "./utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

/**
 * SelectField Component
 * Complete select with label and helper text
 * Matches design specification exactly with semantic color tokens
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps {
  label?: string;
  helperText?: string;
  error?: string | boolean;
  success?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  containerClassName?: string;
  triggerClassName?: string;
}

export const SelectField = React.forwardRef<HTMLButtonElement, SelectFieldProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      required,
      disabled,
      placeholder = "Select an option",
      value,
      onValueChange,
      options,
      containerClassName,
      triggerClassName,
    },
    ref
  ) => {
    // Determine validation state
    const isError = error === true || (typeof error === 'string' && error.length > 0);
    const isSuccess = success && !isError;
    const validationHelperText = typeof error === 'string' ? error : helperText;

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

        {/* Select */}
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger 
            ref={ref}
            className={cn(
              // Validation states - override default outline
              isError && "outline-[var(--interaction-red-base)] hover:outline-[var(--interaction-red-hover)] data-[state=open]:outline-[var(--interaction-red-base)]",
              isSuccess && "outline-[var(--interaction-green-base)] hover:outline-[var(--interaction-green-hover)] data-[state=open]:outline-[var(--interaction-green-base)]",
              triggerClassName
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

SelectField.displayName = "SelectField";
