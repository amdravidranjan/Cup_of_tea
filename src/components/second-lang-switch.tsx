"use client";

import { useSecondLang } from "@/components/lang-provider";
import { SECOND_LANGS } from "@/lib/lang";

/**
 * English is always on; this picks the language shown beside it.
 * A segmented control rather than a dropdown so both options are visible —
 * a judge landing on the page sees at once that Tamil is one tap away.
 */
export function SecondLangSwitch({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { l2, setL2 } = useSecondLang();
  const muted = tone === "dark" ? "rgba(255,255,255,.75)" : "#607d8b";
  return (
    <span
      data-tour="lang-switch"
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: muted }}
      aria-label="Second language"
    >
      <span>English +</span>
      {SECOND_LANGS.map((lang) => {
        const active = l2 === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            lang={lang.code}
            onClick={() => setL2(lang.code)}
            aria-pressed={active}
            title={`Show ${lang.english} beside English`}
            style={{
              border: `1px solid ${active ? "#e56b00" : "rgba(96,125,139,.45)"}`,
              background: active ? "#e56b00" : "transparent",
              color: active ? "#fff" : muted,
              borderRadius: 4,
              padding: "1px 7px",
              fontSize: 11.5,
              lineHeight: "18px",
              cursor: "pointer",
              fontFamily:
                lang.code === "hi"
                  ? "var(--font-noto-sans-devanagari), sans-serif"
                  : "var(--font-noto-sans-tamil), sans-serif",
            }}
          >
            {lang.native}
          </button>
        );
      })}
    </span>
  );
}
