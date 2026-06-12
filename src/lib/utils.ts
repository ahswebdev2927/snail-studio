import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names using clsx and tailwind-merge to ensure
 * clean Tailwind CSS class resolution.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats currency values represented in paise (cents) into a localized INR string.
 * e.g., 299900 -> "₹2,999.00"
 */
export function formatPrice(paise: number): string {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  };
  return new Intl.NumberFormat('en-IN', options).format(paise / 100);
}
