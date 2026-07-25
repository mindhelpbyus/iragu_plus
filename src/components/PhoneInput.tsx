import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { cn } from './ui/utils';
import { CountryFlag } from './ui/country-flag';

// Country codes with flag emojis and phone patterns
// US and India prioritized for primary markets
export const COUNTRY_CODES = [
  {
    code: '+1',
    country: 'US',
    name: 'United States',
    flag: '🇺🇸',
    format: '(###) ###-####',
    placeholder: '(555) 123-4567',
    maxLength: 10
  },
  {
    code: '+91',
    country: 'IN',
    name: 'India',
    flag: '🇮🇳',
    format: '#####-#####',
    placeholder: '98765-43210',
    maxLength: 10
  },
  {
    code: '+1',
    country: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    format: '(###) ###-####',
    placeholder: '(555) 123-4567',
    maxLength: 10
  },
  {
    code: '+44',
    country: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    format: '#### ### ####',
    placeholder: '7123 456 7890',
    maxLength: 10
  },
  {
    code: '+61',
    country: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    format: '#### ### ###',
    placeholder: '0412 345 678',
    maxLength: 9
  },
  {
    code: '+49',
    country: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    format: '### ########',
    placeholder: '151 12345678',
    maxLength: 11
  },
  {
    code: '+33',
    country: 'FR',
    name: 'France',
    flag: '🇫🇷',
    format: '# ## ## ## ##',
    placeholder: '6 12 34 56 78',
    maxLength: 9
  },
  {
    code: '+81',
    country: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    format: '##-####-####',
    placeholder: '90-1234-5678',
    maxLength: 10
  },
  {
    code: '+86',
    country: 'CN',
    name: 'China',
    flag: '🇨🇳',
    format: '### #### ####',
    placeholder: '138 0013 8000',
    maxLength: 11
  },
  {
    code: '+971',
    country: 'AE',
    name: 'UAE',
    flag: '🇦🇪',
    format: '## ### ####',
    placeholder: '50 123 4567',
    maxLength: 9
  },
  {
    code: '+65',
    country: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    format: '#### ####',
    placeholder: '8123 4567',
    maxLength: 8
  },
  {
    code: '+52',
    country: 'MX',
    name: 'Mexico',
    flag: '🇲🇽',
    format: '## #### ####',
    placeholder: '55 1234 5678',
    maxLength: 10
  },
  {
    code: '+55',
    country: 'BR',
    name: 'Brazil',
    flag: '🇧🇷',
    format: '(##) #####-####',
    placeholder: '(11) 98765-4321',
    maxLength: 11
  },
  {
    code: '+27',
    country: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    format: '## ### ####',
    placeholder: '82 123 4567',
    maxLength: 9
  }
];

interface PhoneInputProps {
  value?: string;
  countryCode?: string;
  onChange?: (phone: string, countryCode: string, countryIso: string) => void;
  onPhoneChange?: (phone: string) => void;
  onCountryCodeChange?: (countryCode: string) => void;
  onBlur?: (phone: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  success?: boolean; // Green success state
  disabled?: boolean;
  placeholder?: string;
  helperText?: string; // Custom helper text below input
  className?: string;
  id?: string;
  showCharacterCount?: boolean;
}

/**
 * PhoneInput Component
 * 
 * Features:
 * - Country code selector with flags (using high-quality images)
 * - Auto-formatting based on country
 * - Accepts free-format input (user can type any way)
 * - Automatically formats to country standard
 * - Support for 15+ countries
 * - Multiple states: base, hover, focus, error, success, disabled
 */
export function PhoneInput({
  value = '',
  countryCode = '+1',
  onChange,
  onPhoneChange,
  onCountryCodeChange,
  onBlur,
  label,
  required = false,
  error,
  success = false,
  disabled = false,
  placeholder,
  helperText,
  className = '',
  id = 'phone-input',
  showCharacterCount = false
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]
  );
  const [displayValue, setDisplayValue] = useState(value);

  // Update selected country when countryCode prop changes
  useEffect(() => {
    const country = COUNTRY_CODES.find(c => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
    }
  }, [countryCode]);

  // Update display value when value prop changes
  useEffect(() => {
    if (value !== displayValue) {
      setDisplayValue(formatPhoneNumberUtil(value, selectedCountry));
    }
  }, [value]);

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatPhoneNumberUtil(inputValue, selectedCountry);
    setDisplayValue(formatted);
    const cleanNumber = formatted.replace(/\D/g, '');

    if (onChange) onChange(cleanNumber, selectedCountry.code, selectedCountry.country);
    if (onPhoneChange) onPhoneChange(cleanNumber);
  };

  const handlePhoneInputBlur = (_e: React.FocusEvent<HTMLInputElement>) => {
    if (onBlur) {
      const cleanNumber = displayValue.replace(/\D/g, '');
      onBlur(cleanNumber);
    }
  };

  const handleCountryChange = (newCountryKey: string) => {
    const country = COUNTRY_CODES.find(c => `${c.code}-${c.country}` === newCountryKey);
    if (country) {
      setSelectedCountry(country);
      const formatted = formatPhoneNumberUtil(displayValue, country);
      setDisplayValue(formatted);
      const cleanNumber = formatted.replace(/\D/g, '');

      if (onChange) onChange(cleanNumber, country.code, country.country);
      if (onCountryCodeChange) onCountryCodeChange(country.code);
    }
  };

  // Determine border color based on state
  const getBorderClass = () => {
    if (disabled) return 'border-input bg-muted opacity-50 cursor-not-allowed';
    if (error) return 'border-destructive focus-within:ring-destructive';
    if (success) return 'border-green-500 focus-within:ring-green-500';
    return 'border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2';
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={id} className={cn(error && "text-destructive")}>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      <div
        className={cn(
          "flex h-10 w-full items-center rounded-md border bg-background text-sm ring-offset-background transition-all duration-200",
          getBorderClass()
        )}
      >
        <Select
          value={`${selectedCountry.code}-${selectedCountry.country}`}
          onValueChange={handleCountryChange}
          disabled={disabled}
        >
          <SelectTrigger
            className={cn(
              "h-full w-[100px] border-0 bg-transparent px-3 py-0 shadow-none focus:ring-0",
              "hover:bg-muted/50 transition-colors rounded-l-md rounded-r-none"
            )}
          >
            <SelectValue>
              <div className="flex items-center gap-2">
                <CountryFlag countryCode={selectedCountry.code} size="sm" />
                <span className="text-muted-foreground">{selectedCountry.code}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            {COUNTRY_CODES.map((country) => (
              <SelectItem
                key={`${country.code}-${country.country}`}
                value={`${country.code}-${country.country}`}
              >
                <div className="flex items-center gap-2">
                  <CountryFlag countryCode={country.code} size="sm" />
                  <span className="font-medium">{country.code}</span>
                  <span className="text-muted-foreground text-sm">{country.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-4 w-[1px] bg-border mx-0" />

        <input
          id={id}
          type="tel"
          value={displayValue}
          onChange={handlePhoneInputChange}
          onBlur={handlePhoneInputBlur}
          placeholder={placeholder || selectedCountry.placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed"
          )}
          maxLength={selectedCountry.maxLength + 10} // Allow extra for formatting chars
        />

        {showCharacterCount && (
          <div className="pr-3 text-xs text-muted-foreground">
            {displayValue.replace(/\D/g, '').length}/{selectedCountry.maxLength}
          </div>
        )}
      </div>

      {(helperText || error) && (
        <p className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}

/**
 * Format phone number based on country format
 * Accepts ANY input format and converts to standard format
 */
export const formatPhoneNumberUtil = (input: string, country: typeof COUNTRY_CODES[0]): string => {
  // Remove all non-numeric characters
  const cleaned = input.replace(/\D/g, '');

  // Don't format if empty
  if (!cleaned) return '';

  // Limit to max length for country
  const limited = cleaned.slice(0, country.maxLength);

  // Apply country-specific formatting
  switch (country.code) {
    case '+1': // US/Canada: (555) 123-4567
      if (limited.length <= 3) return limited;
      if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
      return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6, 10)}`;

    case '+91': // India: 98765-43210
      if (limited.length <= 5) return limited;
      return `${limited.slice(0, 5)}-${limited.slice(5, 10)}`;

    case '+44': // UK: 7123 456 7890
      if (limited.length <= 4) return limited;
      if (limited.length <= 7) return `${limited.slice(0, 4)} ${limited.slice(4)}`;
      return `${limited.slice(0, 4)} ${limited.slice(4, 7)} ${limited.slice(7, 11)}`;

    case '+61': // Australia: 0412 345 678
      if (limited.length <= 4) return limited;
      if (limited.length <= 7) return `${limited.slice(0, 4)} ${limited.slice(4)}`;
      return `${limited.slice(0, 4)} ${limited.slice(4, 7)} ${limited.slice(7, 10)}`;

    case '+49': // Germany: 151 12345678
      if (limited.length <= 3) return limited;
      return `${limited.slice(0, 3)} ${limited.slice(3, 11)}`;

    case '+33': // France: 6 12 34 56 78
      if (limited.length <= 1) return limited;
      if (limited.length <= 3) return `${limited.slice(0, 1)} ${limited.slice(1)}`;
      if (limited.length <= 5) return `${limited.slice(0, 1)} ${limited.slice(1, 3)} ${limited.slice(3)}`;
      if (limited.length <= 7) return `${limited.slice(0, 1)} ${limited.slice(1, 3)} ${limited.slice(3, 5)} ${limited.slice(5)}`;
      return `${limited.slice(0, 1)} ${limited.slice(1, 3)} ${limited.slice(3, 5)} ${limited.slice(5, 7)} ${limited.slice(7, 9)}`;

    case '+81': // Japan: 90-1234-5678
      if (limited.length <= 2) return limited;
      if (limited.length <= 6) return `${limited.slice(0, 2)}-${limited.slice(2)}`;
      return `${limited.slice(0, 2)}-${limited.slice(2, 6)}-${limited.slice(6, 10)}`;

    case '+86': // China: 138 0013 8000
      if (limited.length <= 3) return limited;
      if (limited.length <= 7) return `${limited.slice(0, 3)} ${limited.slice(3)}`;
      return `${limited.slice(0, 3)} ${limited.slice(3, 7)} ${limited.slice(7, 11)}`;

    case '+971': // UAE: 50 123 4567
      if (limited.length <= 2) return limited;
      if (limited.length <= 5) return `${limited.slice(0, 2)} ${limited.slice(2)}`;
      return `${limited.slice(0, 2)} ${limited.slice(2, 5)} ${limited.slice(5, 9)}`;

    case '+65': // Singapore: 8123 4567
      if (limited.length <= 4) return limited;
      return `${limited.slice(0, 4)} ${limited.slice(4, 8)}`;

    case '+52': // Mexico: 55 1234 5678
      if (limited.length <= 2) return limited;
      if (limited.length <= 6) return `${limited.slice(0, 2)} ${limited.slice(2)}`;
      return `${limited.slice(0, 2)} ${limited.slice(2, 6)} ${limited.slice(6, 10)}`;

    case '+55': // Brazil: (11) 98765-4321
      if (limited.length <= 2) return limited;
      if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;

    case '+27': // South Africa: 82 123 4567
      if (limited.length <= 2) return limited;
      if (limited.length <= 5) return `${limited.slice(0, 2)} ${limited.slice(2)}`;
      return `${limited.slice(0, 2)} ${limited.slice(2, 5)} ${limited.slice(5, 9)}`;

    default:
      return limited;
  }
};

/**
 * Utility function to validate phone number
 */
export function validatePhoneNumber(phone: string, countryCode: string): boolean {
  const country = COUNTRY_CODES.find(c => c.code === countryCode);
  if (!country) return false;

  // Check if phone number length matches expected length
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === country.maxLength;
}
