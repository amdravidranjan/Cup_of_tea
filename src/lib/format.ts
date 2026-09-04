const LOCALE = "en-IN";
const TIME_ZONE = "Asia/Kolkata";

// Pinning both locale and timeZone (not just locale) is what actually
// prevents an SSR/client hydration mismatch here: the server and a given
// browser can still differ in OS locale AND timezone, and either
// difference alone changes toLocaleString()'s output.
export function formatDate(date: Date): string {
  return date.toLocaleDateString(LOCALE, {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString(LOCALE, {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Rupee amounts are stored as floats (rate x hectares produces long
// fractions), so formatting them raw leaked values like "Rs 60,42,558.387" —
// three decimal places of a paisa — into the compensation tables. Money is
// always rendered through these two helpers instead.

/** Full rupee amount, Indian digit grouping, no fractional paise. */
export function formatCurrency(amount: number): string {
  return `\u20B9${Math.round(amount).toLocaleString(LOCALE, {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Crore/lakh short form for headline totals, where a 12-digit rupee figure
 * is unreadable. Falls back to the full form below one lakh.
 */
export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `\u20B9${(amount / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `\u20B9${(amount / 1e5).toFixed(2)} L`;
  return formatCurrency(amount);
}

/** Hectares, always two decimals. */
export function formatArea(hectares: number): string {
  return `${hectares.toFixed(2)} ha`;
}
