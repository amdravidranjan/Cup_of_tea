import { ta } from "@/lib/i18n";

/**
 * An English label with its Tamil rendering underneath.
 *
 * Looks the Tamil half up in the shared vocabulary rather than taking it as a
 * prop, so a term is translated once and reads identically everywhere it
 * appears. If a term has no entry yet it degrades to English-only instead of
 * rendering an empty line — adding the entry to `lib/i18n.ts` lights it up
 * across every screen at once.
 */
export function Bilingual({
  children,
  inline = false,
  className = "",
  taClassName = "",
}: {
  /** The English term. Must match a key in the vocabulary to get Tamil. */
  children: string;
  /** Render the Tamil half beside the English rather than beneath it. */
  inline?: boolean;
  className?: string;
  taClassName?: string;
}) {
  const tamil = ta(children);

  if (!tamil) return <span className={className}>{children}</span>;

  return (
    <span className={className}>
      {children}{" "}
      <span
        className={`ta font-normal text-muted-foreground ${
          inline ? "text-[0.85em]" : "block text-xs"
        } ${taClassName}`}
      >
        {tamil}
      </span>
    </span>
  );
}
