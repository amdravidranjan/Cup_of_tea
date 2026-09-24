"use client";

/**
 * Nila, the walkthrough guide.
 *
 * Drawn rather than illustrated so she is a few kilobytes and scales from the
 * 44px floating button to the 96px bubble portrait without a second asset.
 * She blinks, breathes, and raises a hand while talking — the small signs of
 * life that make a game tutorial feel like someone is helping you, instead of
 * a tooltip with a picture stuck on it. Her mouth stays still: a flapping
 * mouth at this size reads as a cartoon tic, not as speech.
 */

export type GuideMood = "idle" | "talking" | "working" | "cheer";

export function GuideAvatar({
  size = 72,
  mood = "idle",
  className = "",
}: {
  size?: number;
  mood?: GuideMood;
  className?: string;
}) {
  return (
    <span
      className={`nila ${mood === "talking" ? "nila-talk" : ""} ${mood === "cheer" ? "nila-cheer" : ""} ${className}`}
      style={{ width: size, height: size, display: "inline-block", lineHeight: 0 }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={size} height={size} role="presentation">
        <defs>
          <linearGradient id="nila-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d6fc4" />
            <stop offset="100%" stopColor="#0b3f7a" />
          </linearGradient>
          <linearGradient id="nila-saree" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f7b733" />
            <stop offset="100%" stopColor="#e07b2c" />
          </linearGradient>
          <clipPath id="nila-clip">
            <circle cx="50" cy="50" r="48" />
          </clipPath>
        </defs>

        <circle cx="50" cy="50" r="48" fill="url(#nila-bg)" />
        <g clipPath="url(#nila-clip)">
          {/* Halo, so she reads against any page behind her. */}
          <circle cx="50" cy="44" r="34" fill="#ffffff" opacity="0.10" />

          <g className="nila-body">
            {/* Shoulders and dupatta */}
            <path d="M18 100c0-19 14-30 32-30s32 11 32 30z" fill="url(#nila-saree)" />
            <path d="M32 100c2-13 8-22 18-25 10 3 16 12 18 25z" fill="#ffffff" opacity="0.22" />
            {/* Lanyard: she is an officer, not a mascot. */}
            <path d="M44 72l6 13 6-13" fill="none" stroke="#0b3f7a" strokeWidth="2.4" strokeLinecap="round" />
            <rect x="45.5" y="83" width="9" height="12" rx="2" fill="#0b3f7a" />
            <rect x="47" y="86" width="6" height="2" rx="1" fill="#ffffff" opacity="0.8" />

            <g className="nila-head">
              {/* Hair behind */}
              <path d="M27 44c0-15 10-25 23-25s23 10 23 25c0 8-2 14-4 18V40H31v22c-2-4-4-10-4-18z" fill="#2b1c14" />
              {/* Face */}
              <ellipse cx="50" cy="45" rx="17" ry="19" fill="#eab392" />
              {/* Fringe */}
              <path d="M31 40c3-10 10-15 19-15s16 5 19 15c-6-4-12-6-19-6s-13 2-19 6z" fill="#2b1c14" />
              {/* Eyes */}
              <g className="nila-eyes">
                <ellipse cx="43" cy="45" rx="2.6" ry="3.1" fill="#2b1c14" />
                <ellipse cx="57" cy="45" rx="2.6" ry="3.1" fill="#2b1c14" />
              </g>
              {/* Brows */}
              <path d="M39 39.5q4-2.5 8 0M53 39.5q4-2.5 8 0" stroke="#2b1c14" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              {/* Mouth: a fixed, friendly line — see the note above. */}
              <path className="nila-mouth" d="M45 54q5 5 10 0" stroke="#8c3b3b" strokeWidth="2" fill="#8c3b3b" strokeLinecap="round" />
              {/* Cheeks */}
              <circle cx="38" cy="51" r="3" fill="#e08b7a" opacity="0.45" />
              <circle cx="62" cy="51" r="3" fill="#e08b7a" opacity="0.45" />
            </g>

            {/* Raised hand, pointing at whatever is glowing. */}
            <g className="nila-hand">
              <circle cx="78" cy="70" r="7" fill="#eab392" />
              <rect x="74.5" y="60" width="7" height="12" rx="3.5" fill="#eab392" />
            </g>
          </g>
        </g>
        <circle cx="50" cy="50" r="47" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.85" />
      </svg>

      <style jsx>{`
        .nila :global(.nila-body) {
          animation: nila-breathe 3.6s ease-in-out infinite;
          transform-origin: 50px 90px;
        }
        .nila :global(.nila-eyes) {
          animation: nila-blink 5.2s infinite;
          transform-origin: 50px 45px;
        }
        .nila :global(.nila-hand) {
          transform-origin: 78px 72px;
          animation: nila-wave 4.5s ease-in-out infinite;
        }
        .nila-talk :global(.nila-hand) {
          animation: nila-wave 1.6s ease-in-out infinite;
        }
        .nila-cheer :global(.nila-body) {
          animation: nila-hop 0.9s ease-in-out infinite;
        }
        @keyframes nila-breathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-1.2px) scale(1.012); }
        }
        @keyframes nila-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes nila-wave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-14deg); }
        }
        @keyframes nila-hop {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nila :global(*) { animation: none !important; }
        }
      `}</style>
    </span>
  );
}
