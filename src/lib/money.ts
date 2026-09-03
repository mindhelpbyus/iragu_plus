/** Formats an integer paise amount as an Indian-grouped rupee string, e.g. 1627000 -> "₹16,270". */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
