import React, { useState, forwardRef } from 'react';
import { Label } from './label';

export interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  required?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
}

/**
 * TextareaField Component - Matches Ataraxia Design System
 * 
 * Features:
 * - All states: base, hover, focus, error, success, disabled, filled
 * - Character counter (bottom-right)
 * - Helper text with state-based coloring
 * - Full accessibility support
 * - Multi-line text input
 * 
 * States:
 * - Base: Gray outline
 * - Hover: Darker gray outline
 * - Focus: Orange outline (2px) with blinking cursor
 * - Error: Red outline + red helper text
 * - Success: Green outline + green helper text
 * - Disabled: Gray background + disabled styling
 * - Filled: Primary text color
 * 
 * Usage:
 * ```tsx
 * <TextareaField
 *   label="Session Notes"
 *   placeholder="Document what happened during the session..."
 *   helperText="Add any relevant observations"
 *   required
 *   showCharCount
 *   maxLength={500}
 *   rows={4}
 * />
 * ```
 */
export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  (
    {
      label,
      helperText,
      error,
      success = false,
      required = false,
      showCharCount = false,
      maxLength,
      disabled = false,
      className = '',
      id,
      value = '',
      onChange,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value);
    const currentValue = value !== undefined ? value : internalValue;
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      return 'outline-[color:var(--interaction-outline-base,#d1d5db)] hover:outline-[color:var(--interaction-outline-hover,#9ca3af)] focus-within:outline-[color:var(--interaction-outline-active,#1E7048)] focus-within:outline-2';
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
      <div className={`flex flex-col justify-start items-start gap-2 ${className}`}>
        {/* Label */}
        {label && (
          <div className="self-stretch flex flex-col justify-center items-start">
            <Label
              htmlFor={textareaId}
              className="justify-start text-[color:var(--content-dark-primary,#111827)] text-sm"
            >
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
          </div>
        )}

        {/* Textarea Container */}
        <div
          className={`self-stretch px-3 py-2.5 relative rounded outline outline-1 outline-offset-[-1px] ${getOutlineClass()} inline-flex justify-start items-start gap-3 transition-all min-h-[8rem]`}
        >
          {/* Textarea Field */}
          <textarea
            ref={ref}
            id={textareaId}
            value={currentValue}
            onChange={handleChange}
            disabled={disabled}
            maxLength={maxLength}
            rows={rows}
            className={`flex-1 w-full bg-transparent border-0 outline-none resize-none ${getTextColor()} text-sm placeholder:text-[color:var(--content-dark-tertiary,#9ca3af)] disabled:cursor-not-allowed leading-5`}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
            }
            {...props}
          />

          {/* Character Count - Positioned at bottom-right */}
          {showCharCount && maxLength && (
            <div
              className={`absolute right-3 bottom-2.5 text-right text-xs ${getIconColor()}`}
            >
              {charCount}/{maxLength}
            </div>
          )}
        </div>

        {/* Helper Text - changes color based on state */}
        {helperText && (
          <div
            id={`${textareaId}-helper`}
            className={`justify-start text-xs ${
              error
                ? 'text-[color:var(--interaction-red-base,#ef4444)]'
                : success
                ? 'text-[color:var(--interaction-green-base,#10b981)]'
                : disabled
                ? 'text-[color:var(--content-dark-disable,#d1d5db)]'
                : 'text-[color:var(--content-dark-tertiary,#6b7280)]'
            }`}
          >
            {helperText}
          </div>
        )}

        {/* Error message (fallback if no helperText provided) */}
        {error && !helperText && (
          <p id={`${textareaId}-error`} className="text-xs text-[color:var(--interaction-red-base,#ef4444)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextareaField.displayName = 'TextareaField';
