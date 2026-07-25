import * as React from "react";
import { cn } from "./utils";

/**
 * Country Flag Component
 * Displays country flags as proper images (not emojis) with consistent sizing
 * Matches design specification: w-10 h-7 (40x30px)
 */

export interface CountryFlagProps extends React.HTMLAttributes<HTMLImageElement> {
  countryCode: string;
  size?: "sm" | "md" | "lg";
}

// Country code to flag image URL mapping using reliable CDN
const getFlagUrl = (countryCode: string): string => {
  // Using flagcdn.com which provides high-quality flag images
  // Format: https://flagcdn.com/w40/{country-code}.png
  const code = countryCode.toLowerCase();
  return `https://flagcdn.com/w40/${code}.png`;
};

// Country code mapping (phone codes to ISO country codes)
const phoneToISOCode: Record<string, string> = {
  '+1': 'us',      // USA/Canada
  '+44': 'gb',     // United Kingdom
  '+91': 'in',     // India
  '+61': 'au',     // Australia
  '+49': 'de',     // Germany
  '+33': 'fr',     // France
  '+81': 'jp',     // Japan
  '+86': 'cn',     // China
  '+82': 'kr',     // South Korea
  '+7': 'ru',      // Russia
  '+39': 'it',     // Italy
  '+34': 'es',     // Spain
  '+31': 'nl',     // Netherlands
  '+46': 'se',     // Sweden
  '+47': 'no',     // Norway
  '+45': 'dk',     // Denmark
  '+358': 'fi',    // Finland
  '+41': 'ch',     // Switzerland
  '+43': 'at',     // Austria
  '+32': 'be',     // Belgium
  '+351': 'pt',    // Portugal
  '+30': 'gr',     // Greece
  '+48': 'pl',     // Poland
  '+420': 'cz',    // Czech Republic
  '+36': 'hu',     // Hungary
  '+40': 'ro',     // Romania
  '+353': 'ie',    // Ireland
  '+64': 'nz',     // New Zealand
  '+65': 'sg',     // Singapore
  '+60': 'my',     // Malaysia
  '+66': 'th',     // Thailand
  '+84': 'vn',     // Vietnam
  '+62': 'id',     // Indonesia
  '+63': 'ph',     // Philippines
  '+52': 'mx',     // Mexico
  '+55': 'br',     // Brazil
  '+54': 'ar',     // Argentina
  '+56': 'cl',     // Chile
  '+57': 'co',     // Colombia
  '+51': 'pe',     // Peru
  '+27': 'za',     // South Africa
  '+234': 'ng',    // Nigeria
  '+254': 'ke',    // Kenya
  '+20': 'eg',     // Egypt
  '+971': 'ae',    // UAE
  '+966': 'sa',    // Saudi Arabia
  '+972': 'il',    // Israel
  '+90': 'tr',     // Turkey
};

const sizeClasses = {
  sm: "w-6 h-4",    // 24x16px
  md: "w-10 h-7",   // 40x30px (design spec default)
  lg: "w-14 h-10",  // 56x40px
};

export function CountryFlag({
  countryCode,
  size = "md",
  className,
  ...props
}: CountryFlagProps) {
  // Convert phone code to ISO country code if needed
  const isoCode = phoneToISOCode[countryCode] || countryCode.toLowerCase().replace('+', '');
  const flagUrl = getFlagUrl(isoCode);

  return (
    <img
      src={flagUrl}
      alt={`${countryCode} flag`}
      className={cn(
        "inline-block object-cover rounded-sm",
        sizeClasses[size],
        className
      )}
      loading="lazy"
      onError={(e) => {
        // Fallback to emoji flag if image fails to load
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallback = document.createElement('span');
        fallback.textContent = getEmojiFallback(countryCode);
        fallback.className = cn("inline-flex items-center justify-center", sizeClasses[size]);
        target.parentNode?.replaceChild(fallback, target);
      }}
      {...props}
    />
  );
}

// Emoji fallback mapping
const getEmojiFallback = (countryCode: string): string => {
  const emojiMap: Record<string, string> = {
    '+1': '🇺🇸',
    '+44': '🇬🇧',
    '+91': '🇮🇳',
    '+61': '🇦🇺',
    '+49': '🇩🇪',
    '+33': '🇫🇷',
    '+81': '🇯🇵',
    '+86': '🇨🇳',
    '+82': '🇰🇷',
    '+7': '🇷🇺',
    '+39': '🇮🇹',
    '+34': '🇪🇸',
  };
  return emojiMap[countryCode] || '🏳️';
};
