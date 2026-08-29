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
