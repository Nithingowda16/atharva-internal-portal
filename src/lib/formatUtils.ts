/**
 * Indian Rupee (INR) currency and number formatting utilities.
 * Enforces strict Indian grouping (Lakhs / Crores) and exactly two decimal places (paise)
 * to eliminate JavaScript floating point accumulation errors (e.g. ₹16,762.591 -> ₹16,762.59).
 */

export function formatINR(val: number | null | undefined, forceDecimals = true): string {
  if (val === null || val === undefined || isNaN(val)) {
    return forceDecimals ? '₹0.00' : '₹0';
  }
  const num = Math.round(Number(val) * 100) / 100;
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const formatted = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: forceDecimals ? 2 : 0,
    maximumFractionDigits: forceDecimals ? 2 : 0,
  });
  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

export function formatINRRaw(val: number | null | undefined, forceDecimals = true): string {
  if (val === null || val === undefined || isNaN(val)) {
    return forceDecimals ? '0.00' : '0';
  }
  const num = Math.round(Number(val) * 100) / 100;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: forceDecimals ? 2 : 0,
    maximumFractionDigits: forceDecimals ? 2 : 0,
  });
}

