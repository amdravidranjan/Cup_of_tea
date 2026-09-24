"use client";

import { useSecondLang } from "@/components/lang-provider";
import { hindiFor, inSecondLang } from "@/lib/phrases";

/**
 * The second-language half of a bilingual label.
 *
 * Takes both renderings and shows the one the reader picked, so a page written
 * once reads as English + Hindi or English + Tamil without being duplicated.
 * `hi` may be omitted when the Tamil phrase is in the shared phrase map.
 * Keeps the `ta` class as the styling hook every existing page already uses;
 * the `lang` attribute switches the font to Devanagari for Hindi.
 */
export function L2({
  ta,
  hi,
  className = "ta",
  style,
}: {
  ta: string;
  hi?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { l2 } = useSecondLang();
  return (
    <span className={className} lang={l2} style={style}>
      {l2 === "ta" ? ta : hi ?? hindiFor(ta)}
    </span>
  );
}

/**
 * A mixed "English · Tamil" label rendered in the reader's second language.
 * For labels that live in data arrays as plain strings — the render site wraps
 * them in <T2> instead of every array being restructured.
 */
export function T2({ children }: { children: string }) {
  const { l2 } = useSecondLang();
  return <>{inSecondLang(children, l2)}</>;
}

/** A plain string version, for places that need text rather than an element. */
export function useL2() {
  const { l2 } = useSecondLang();
  return (ta: string, hi?: string) => (l2 === "ta" ? ta : hi ?? hindiFor(ta));
}
