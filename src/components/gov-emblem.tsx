/**
 * The TN-GLMS portal emblem.
 *
 * Extracted from PublicHeader so the signed-in console can carry the exact
 * same mark as the public site. Previously the two halves of the product
 * introduced themselves differently — the public site as "Tamil Nadu
 * Government Land Management System" with this emblem, the console as
 * "National Land Acquisition & Management System" with no mark at all —
 * which read as two unrelated applications.
 *
 * Deliberately a stylised composition (chakra-like ring, star, tricolour
 * band) rather than a reproduction of the actual State or National emblem,
 * whose use is restricted by law.
 */
export function GovEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.1}
      viewBox="0 0 64 72"
      fill="none"
      role="img"
      aria-label="TN-GLMS emblem"
      style={{ flexShrink: 0 }}
    >
      <circle cx="32" cy="28" r="26" fill="#0b5394" />
      <circle cx="32" cy="28" r="23.5" fill="none" stroke="#ffc107" strokeWidth="1.2" />
      <circle
        cx="32"
        cy="28"
        r="17"
        fill="none"
        stroke="#ffc107"
        strokeWidth="0.8"
        strokeDasharray="3 2.5"
      />
      <path
        d="M32 10 L34 17.5H41.5L35.5 21.8L37.5 29.3L32 25L26.5 29.3L28.5 21.8L22.5 17.5H30Z"
        fill="#ffc107"
      />
      <circle cx="32" cy="28" r="4" fill="none" stroke="#ffc107" strokeWidth="1.2" />
      <line x1="32" y1="24" x2="32" y2="11" stroke="#ffc107" strokeWidth="0.7" opacity="0.45" />
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontSize="4.8"
        fill="#ffc107"
        fontFamily="serif"
        letterSpacing="0.3"
      >
        सत्यमेव जयते
      </text>
      <rect x="10" y="47" width="44" height="1.8" fill="#138808" />
      <rect x="10" y="49" width="44" height="15" fill="white" />
      <rect x="10" y="64" width="44" height="1.8" fill="#FF9933" />
      <text
        x="32"
        y="59"
        textAnchor="middle"
        fontSize="6.5"
        fill="#0b5394"
        fontFamily="Arial"
        fontWeight="700"
      >
        TN-GLMS
      </text>
    </svg>
  );
}
