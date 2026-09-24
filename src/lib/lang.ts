/**
 * The portal's second language.
 *
 * English is always shown. Beside it the portal shows one Indian language —
 * Hindi by default, Tamil when the reader switches to it. The choice lives in
 * a cookie so server-rendered pages come back in the right language on the
 * first paint, not after a client-side flash.
 */
export type SecondLang = "hi" | "ta";

export const SECOND_LANG_COOKIE = "nilams_l2";
export const DEFAULT_SECOND_LANG: SecondLang = "hi";

export const SECOND_LANGS: { code: SecondLang; native: string; english: string }[] = [
  { code: "hi", native: "हिन्दी", english: "Hindi" },
  { code: "ta", native: "தமிழ்", english: "Tamil" },
];

export function parseSecondLang(value: string | null | undefined): SecondLang {
  return value === "ta" ? "ta" : "hi";
}
