/**
 * The languages the demo walkthrough speaks.
 *
 * All twenty-two Eighth Schedule languages plus English. The *site* is still
 * English with Hindi or Tamil beside it (see `src/lib/lang.ts`) — this is the
 * guide's own language, chosen once on arrival, and it also decides which
 * region the demo project is sited in (see `src/lib/demo/regions.ts`).
 *
 * ── Voices ────────────────────────────────────────────────────────────────
 * Narration is pre-rendered with edge-tts, which has neural voices for
 * eleven of these. The rest fall into two cases:
 *
 *  - Same script as a language that has a voice: Assamese and Manipuri are
 *    written in Bengali script, Konkani/Maithili/Dogri/Bodo/Sanskrit in
 *    Devanagari, Kashmiri and Sindhi in Perso-Arabic. Their own text is read
 *    by the neighbouring voice. The accent is wrong; the words are theirs.
 *  - No voice and no script-mate: Punjabi, Odia and Santali. The bubble is in
 *    their language, the voice speaks Hindi, and the guide says so.
 *
 * `font` is the Google font loaded for the bubble, because a judge's phone
 * cannot be assumed to carry Ol Chiki or Meetei Mayek.
 */

export interface TourLanguage {
  code: string;
  /** The language's own name, in its own script. */
  native: string;
  english: string;
  /** edge-tts voice used to read this language's text, or null if none fits. */
  voice: string | null;
  /** Play another language's audio instead of this one's. */
  audioFrom?: string;
  /** True when the voice is a script-mate rather than the language itself. */
  approxVoice?: boolean;
  /** Google font family for the script. */
  font?: string;
  rtl?: boolean;
}

export const TOUR_LANGUAGES: TourLanguage[] = [
  { code: "en", native: "English", english: "English", voice: "en-IN-NeerjaNeural" },
  { code: "hi", native: "हिन्दी", english: "Hindi", voice: "hi-IN-SwaraNeural", font: "Noto Sans Devanagari" },
  { code: "bn", native: "বাংলা", english: "Bengali", voice: "bn-IN-TanishaaNeural", font: "Noto Sans Bengali" },
  { code: "te", native: "తెలుగు", english: "Telugu", voice: "te-IN-ShrutiNeural", font: "Noto Sans Telugu" },
  { code: "mr", native: "मराठी", english: "Marathi", voice: "mr-IN-AarohiNeural", font: "Noto Sans Devanagari" },
  { code: "ta", native: "தமிழ்", english: "Tamil", voice: "ta-IN-PallaviNeural", font: "Noto Sans Tamil" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", voice: "gu-IN-DhwaniNeural", font: "Noto Sans Gujarati" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada", voice: "kn-IN-SapnaNeural", font: "Noto Sans Kannada" },
  { code: "ml", native: "മലയാളം", english: "Malayalam", voice: "ml-IN-SobhanaNeural", font: "Noto Sans Malayalam" },
  { code: "ur", native: "اردو", english: "Urdu", voice: "ur-IN-GulNeural", font: "Noto Nastaliq Urdu", rtl: true },
  { code: "ne", native: "नेपाली", english: "Nepali", voice: "ne-NP-HemkalaNeural", font: "Noto Sans Devanagari" },

  // Same script, borrowed voice.
  { code: "as", native: "অসমীয়া", english: "Assamese", voice: "bn-IN-TanishaaNeural", approxVoice: true, font: "Noto Sans Bengali" },
  { code: "mni", native: "মৈতৈলোন্", english: "Manipuri", voice: "bn-IN-TanishaaNeural", approxVoice: true, font: "Noto Sans Bengali" },
  { code: "kok", native: "कोंकणी", english: "Konkani", voice: "mr-IN-AarohiNeural", approxVoice: true, font: "Noto Sans Devanagari" },
  { code: "mai", native: "मैथिली", english: "Maithili", voice: "hi-IN-SwaraNeural", approxVoice: true, font: "Noto Sans Devanagari" },
  { code: "doi", native: "डोगरी", english: "Dogri", voice: "hi-IN-SwaraNeural", approxVoice: true, font: "Noto Sans Devanagari" },
  { code: "brx", native: "बड़ो", english: "Bodo", voice: "hi-IN-SwaraNeural", approxVoice: true, font: "Noto Sans Devanagari" },
  { code: "sa", native: "संस्कृतम्", english: "Sanskrit", voice: "hi-IN-SwaraNeural", approxVoice: true, font: "Noto Sans Devanagari" },
  { code: "ks", native: "کٲشُر", english: "Kashmiri", voice: "ur-IN-GulNeural", approxVoice: true, font: "Noto Nastaliq Urdu", rtl: true },
  { code: "sd", native: "سنڌي", english: "Sindhi", voice: "ur-IN-GulNeural", approxVoice: true, font: "Noto Nastaliq Urdu", rtl: true },

  // No voice for the script at all: text in their language, voice in Hindi.
  { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi", voice: null, audioFrom: "hi", font: "Noto Sans Gurmukhi" },
  { code: "or", native: "ଓଡ଼ିଆ", english: "Odia", voice: null, audioFrom: "hi", font: "Noto Sans Oriya" },
  { code: "sat", native: "ᱥᱟᱱᱛᱟᱲᱤ", english: "Santali", voice: null, audioFrom: "hi", font: "Noto Sans Ol Chiki" },
];

export const DEFAULT_TOUR_LANG = "en";
export const TOUR_LANG_COOKIE = "nilams_tour_lang";

export function tourLanguage(code: string | null | undefined): TourLanguage {
  return TOUR_LANGUAGES.find((l) => l.code === code) ?? TOUR_LANGUAGES[0];
}

/** Which folder under `public/tour/audio/` holds this language's narration. */
export function audioLangFor(code: string): string {
  const lang = tourLanguage(code);
  return lang.audioFrom ?? lang.code;
}
