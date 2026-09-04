/**
 * Custom emblem — a stylized landmark/boundary-marker mark rather than a
 * generic icon-font glyph, meant to read as a small institutional seal
 * (the way an Ashoka-emblem-style mark anchors an Indian government
 * letterhead) without reproducing any real government insignia.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      <path
        d="M20 6 L31 13 V27 L20 34 L9 27 V13 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 24 L18 16 L22 20 L26 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}
