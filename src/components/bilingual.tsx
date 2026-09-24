import { ta, hi } from "@/lib/i18n";
import { L2 } from "@/components/l2";

/**
 * An English label with its second-language rendering underneath.
 *
 * Looks the second half up in the shared vocabulary rather than taking it as a
 * prop, so a term is translated once and reads identically everywhere it
 * appears. Hindi or Tamil is chosen by the reader (see `lang-provider`). If a
 * term has no entry yet it degrades to English-only instead of rendering an
 * empty line — adding the entry to `lib/i18n.ts` lights it up everywhere.
 */
export function Bilingual({
  children,
  inline = false,
  className = "",
  taClassName = "",
}: {
  /** The English term. Must match a key in the vocabulary to get the second language. */
  children: string;
  /** Render the second-language half beside the English rather than beneath it. */
  inline?: boolean;
  className?: string;
  taClassName?: string;
}) {
  const tamil = ta(children);
  const hindi = hi(children);

  if (!tamil || !hindi) return <span className={className}>{children}</span>;

  return (
    <span className={className}>
      {children}{" "}
      <L2
        ta={tamil}
        hi={hindi}
        className={`ta font-normal text-muted-foreground ${inline ? "text-[0.85em]" : "block text-xs"} ${taClassName}`}
      />
    </span>
  );
}
