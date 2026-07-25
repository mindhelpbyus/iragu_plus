import React, { useState, forwardRef } from 'react';
import { Label } from './label';

export interface InputFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  required?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'phone'; // phone variant is handled by PhoneInput component
}

/**
 * InputField Component - Matches Ataraxia Design System
 * 
 * Features:
 * - All states: base, hover, focus, error, success, disabled, filled
 * - Optional left/right icons
 * - Character counter
 * - Helper text with state-based coloring
 * - Full accessibility support
 * 
 * States:
 * - Base: Gray outline
 * - Hover: Darker gray outline
 * - Focus: Orange outline (2px)
 * - Error: Red outline + red helper text
 * - Success: Green outline + green helper text
 * - Disabled: Gray background + disabled styling
 * - Filled: Primary text color
 * 
 * Usage:
 * ```tsx
 * <InputField
 *   label="Email Address"
 *   type="email"
 *   placeholder="john.doe@example.com"
 *   helperText="We'll never share your email"
 *   required
 *   showCharCount
 *   maxLength={50}
 * />
 * ```
 */
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      helperText,
      error,
      success = false,
      required = false,
      showCharCount = false,
      maxLength,
      leftIcon,
      rightIcon,
      disabled = false,
      className = '',
      id,
      value = '',
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value);
    const currentValue = value !== undefined ? value : internalValue;
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e);
      } else {
        setInternalValue(e.target.value);
      }
    };

    // Determine outline color based on state priority: disabled > error > success > focus > hover > base
    const getOutlineClass = () => {
      if (disabled) {
        return 'outline-[color:var(--interaction-outline-disabled,#e5e7eb)] bg-[color:var(--interaction-secondary-disabled,#f9fafb)]';
      }
      if (error) {
        return 'outline-[color:var(--interaction-red-base,#ef4444)]';
      }
      if (success) {
        return 'outline-[color:var(--interaction-green-base,#10b981)]';
      }
      return 'outline-[color:var(--interaction-outline-base,#d1d5db)] hover:outline-[color:var(--interaction-outline-hover,#9ca3af)] focus-within:outline-[color:var(--interaction-primary-active,#1E7048)] focus-within:outline-2';
    };

    // Text color: filled = primary, empty = tertiary, disabled = disabled
    const getTextColor = () => {
      if (disabled) {
        return 'text-[color:var(--content-dark-disable,#d1d5db)]';
      }
      return currentValue
        ? 'text-[color:var(--content-dark-primary,#111827)]'
        : 'text-[color:var(--content-dark-tertiary,#6b7280)]';
    };

    const getIconColor = () => {
      if (disabled) {
        return 'text-[color:var(--content-dark-disable,#d1d5db)]';
      }
      return 'text-[color:var(--content-dark-tertiary,#6b7280)]';
    };

    const charCount = typeof currentValue === 'string' ? currentValue.length : 0;

    return (
      <div className={`inline-flex flex-col justify-start items-start gap-2 ${className}`}>
        {/* Label */}
        {label && (
          <div className="self-stretch flex flex-col justify-center items-start">
            <Label
              htmlFor={inputId}
              className="justify-start text-[color:var(--content-dark-primary,#111827)] text-sm"
            >
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
          </div>
        )}

        {/* Input Container */}
        <div
          className={`self-stretch px-3 py-2.5 rounded outline outline-1 outline-offset-[-1px] ${getOutlineClass()} inline-flex justify-start items-center gap-3 transition-all`}
        >
          {/* Left Icon */}
          {leftIcon && <div className={`${getIconColor()}`}>{leftIcon}</div>}

          {/* Input Field */}
          <input
            ref={ref}
            id={inputId}
            value={currentValue}
            onChange={handleChange}
            disabled={disabled}
            maxLength={maxLength}
            className={`flex-1 bg-transparent border-0 outline-none ${getTextColor()} text-sm placeholder:text-[color:var(--content-dark-tertiary,#9ca3af)] disabled:cursor-not-allowed`}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && <div className={`${getIconColor()}`}>{rightIcon}</div>}

          {/* Character Count */}
          {showCharCount && maxLength && (
            <div className={`flex-shrink-0 text-right text-xs ${getIconColor()}`}>
              {charCount}/{maxLength}
            </div>
          )}
        </div>

        {/* Helper Text - changes color based on state */}
        {helperText && (
          <div
            id={`${inputId}-helper`}
            className={`justify-start text-xs ${
              error
                ? 'text-[color:var(--interaction-red-base,#ef4444)]'
                : success
                ? 'text-[color:var(--interaction-green-base,#10b981)]'
                : 'text-[color:var(--content-dark-tertiary,#6b7280)]'
            }`}
          >
            {helperText}
          </div>
        )}

        {/* Error message (fallback if no helperText provided) */}
        {error && !helperText && (
          <p id={`${inputId}-error`} className="text-xs text-[color:var(--interaction-red-base,#ef4444)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

InputField.displayName = 'InputField';
