/**
 * Turning what someone typed into words the bank can be searched with.
 *
 * Three problems, all of which are real rather than hypothetical:
 *
 *  1. **Transliterated Tamil.** A great many people type Tamil in English
 *     letters, with no standard spelling — `ilappeedu`, `ilapeedu`, `ilappidu`
 *     are one word. Nothing matches unless these fold onto the concept.
 *  2. **Nobody uses the official term.** A citizen asks "how much money will I
 *     get", never "quantum of compensation". The synonym table maps the words
 *     people use onto the words the answers are indexed by.
 *  3. **Typing on a phone.** `compensaton`, `grievence`, `pata` are the same
 *     questions as their correct spellings, and edit-distance matching on a
 *     short token list is cheap enough to do properly.
 *
 * Tamil script is normalised only lightly — no stemming, because Tamil is
 * agglutinative and naive suffix stripping does more damage than it repairs.
 * Instead the Tamil keyword lists in the answer bank carry the inflected forms
 * that actually get typed, which is more work to write and far more reliable.
 */

/** Words carrying no signal, dropped before scoring. */
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "doing", "have", "has", "had", "having",
  "i", "me", "my", "mine", "we", "us", "our", "you", "your", "they", "them", "their",
  "it", "its", "this", "that", "these", "those", "there", "here",
  "of", "to", "in", "on", "at", "for", "with", "from", "by", "about", "as", "into",
  "and", "or", "but", "if", "then", "than", "so", "because",
  "can", "could", "will", "would", "shall", "should", "may", "might", "must",
  "please", "tell", "know", "want", "need", "get", "give", "say", "said",
  "what", "when", "where", "which", "who", "whom", "whose", "why", "how",
  // Tamil particles and pronouns that appear in almost every question.
  "என்", "எனது", "நான்", "எனக்கு", "நீங்கள்", "அது", "இது", "ஒரு",
  "என்ன", "எப்படி", "எங்கே", "யார்", "ஏன்", "எப்போது",
]);

/**
 * Transliterated Tamil onto the concept it names.
 *
 * Deliberately generous with spellings, because there is no correct one — the
 * point is to catch what a thumb produces on a phone keyboard, not to model
 * a transliteration scheme.
 */
const TRANSLITERATIONS: Record<string, string> = {
  // Money
  ilappeedu: "compensation", ilapeedu: "compensation", ilappidu: "compensation",
  izhappeedu: "compensation", ilappeetu: "compensation",
  panam: "money", kaasu: "money", thogai: "amount", tholai: "amount",
  evvalavu: "how much", evlo: "how much", ethana: "how many",
  // Land record
  patta: "patta", pattaa: "patta", chitta: "chitta", chittaa: "chitta",
  adangal: "adangal", nilam: "land", nila: "land", bhoomi: "land",
  alavai: "survey", alavu: "measurement", ellai: "boundary",
  nanjai: "nanjai", punjai: "punjai", manavari: "manavari", natham: "house site",
  poramboke: "poramboke", kiramam: "village", maavattam: "district",
  // Process
  kaiyagappaduthal: "possession", kaiyakappaduthal: "possession",
  arivippu: "notification", theerppu: "award",
  kurai: "grievance", kuraigal: "grievance", manu: "petition", pugar: "complaint",
  aatchepanai: "objection", atchepanai: "objection",
  maruvaazhvu: "rehabilitation", maruvalvu: "rehabilitation",
  meelkudiyetram: "resettlement",
  // Family and people
  kudumbam: "family", varisu: "heir", kuthagai: "lease", kuthakai: "lease",
  adhikari: "officer", aatchiyar: "collector",
  // Assets
  maram: "tree", marangal: "trees", kinaru: "well", veedu: "house", payir: "crop",
  // Common verbs and connectors people type
  illa: "not", illai: "not", venum: "need", vendum: "need", mudiyuma: "can",
  eppadi: "how", eppo: "when", enga: "where", yaar: "who", enna: "what",
  vanakkam: "hello", nandri: "thanks",
};

/**
 * Everyday phrasing onto indexed vocabulary.
 *
 * Multi-word keys are matched against the raw text before tokenising, so
 * "how much money" contributes "compensation" as a whole rather than three
 * loose tokens that each match something different.
 */
const SYNONYM_PHRASES: { pattern: RegExp; add: string[] }[] = [
  { pattern: /how much (money|will i get|do i get|is it)/i, add: ["compensation", "amount"] },
  { pattern: /(not|never) (paid|received|got)/i, add: ["payment", "delay"] },
  { pattern: /too (low|less|small)/i, add: ["disagree", "low"] },
  { pattern: /(take|taking|taken) (my|the) (land|field|property)/i, add: ["possession", "acquisition"] },
  { pattern: /(kick|throw|force) (me|us) out/i, add: ["possession", "vacate"] },
  { pattern: /where do i (go|complain|apply)/i, add: ["office", "file"] },
  { pattern: /(bank|loan|jewel) loan/i, add: ["mortgage", "charge"] },
  { pattern: /(father|mother|husband|wife|owner) (died|expired|passed away|is no more)/i, add: ["deceased", "heir", "succession"] },
  { pattern: /no (patta|title|document|papers?)/i, add: ["no patta", "tenant", "landless"] },
  // Transliterated Tamil negation: "patta illa", "pattaa illai", "document illa".
  // Without this, `illa` folds to "not" and the negation is lost entirely.
  { pattern: /\b(patt?aa?|chittaa?|document|title)\s+(illa|illai|kidaiyathu)\b/i, add: ["no patta", "tenant", "landless"] },
  { pattern: /\b(illa|illai)\s+(patt?aa?|chittaa?|document)\b/i, add: ["no patta", "tenant", "landless"] },
  { pattern: /(cut|split|divide)s? my (land|field) (in|into) (two|half)/i, add: ["severance", "part of land"] },
  { pattern: /(is|are) (this|it) (real|genuine|fake)/i, add: ["official"] },
  { pattern: /(does|do) (this|it) work (offline|without internet)/i, add: ["offline"] },
  { pattern: /(what|which) (act|law)/i, add: ["which act", "rfctlarr"] },
  { pattern: /(machine learning|neural|llm|gpt|trained model)/i, add: ["ai", "model"] },
  { pattern: /(court|case) (stay|order)/i, add: ["stay order", "court"] },
  { pattern: /village (meeting|council|sabha)/i, add: ["gram sabha", "consultation"] },
];

/** Single-word synonyms folded onto the indexed term. */
const SYNONYM_WORDS: Record<string, string[]> = {
  money: ["compensation", "amount"],
  cash: ["compensation", "payment"],
  payment: ["paid", "compensation"],
  rupees: ["amount"],
  complaint: ["grievance"],
  complain: ["grievance"],
  petition: ["grievance"],
  objection: ["object"],
  appeal: ["escalate", "court"],
  tribunal: ["larr authority", "court"],
  house: ["housing", "structure"],
  home: ["housing"],
  farm: ["agricultural", "land"],
  farmland: ["agricultural", "land"],
  field: ["land", "parcel"],
  plot: ["parcel", "land"],
  acre: ["units", "area"],
  acres: ["units", "area"],
  cent: ["units", "area"],
  cents: ["units", "area"],
  hectare: ["units", "area"],
  extent: ["area"],
  owner: ["titleholder", "landowner"],
  tenant: ["lease", "no patta"],
  labourer: ["livelihood", "affected family"],
  tribal: ["st", "scheduled tribe"],
  deadline: ["sla", "timeline"],
  delay: ["delayed", "timeline"],
  stuck: ["delayed"],
  pending: ["delayed", "status"],
  document: ["documents"],
  papers: ["documents"],
  certificate: ["documents"],
  upload: ["upload", "formats"],
  scan: ["scan", "upload"],
  photo: ["photograph"],
  ai: ["ai", "model"],
  chatbot: ["assistant"],
  login: ["account"],
  password: ["account"],
  privacy: ["privacy", "personal data"],
  tamil: ["tamil", "language"],
  voice: ["voice", "speak"],
  helpline: ["talk to person", "contact"],
};

/** Lowercases, strips punctuation, keeps Tamil, collapses whitespace. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/%.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the string contains Tamil script. Decides the reply language. */
export function containsTamilScript(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

/**
 * Tokens for scoring: normalised, stop-words removed, transliterations folded,
 * synonyms expanded. Deduplicated, because a word repeated three times in a
 * rambling question should not outweigh three distinct matching words.
 */
export function expandTokens(text: string): string[] {
  const normalised = normalise(text);
  const tokens = new Set<string>();

  for (const { pattern, add } of SYNONYM_PHRASES) {
    if (pattern.test(text)) for (const word of add) tokens.add(word);
  }

  for (const raw of normalised.split(" ")) {
    if (!raw) continue;
    const word = raw.replace(/^[.-]+|[.-]+$/g, "");
    if (!word || STOP_WORDS.has(word)) continue;

    const transliterated = TRANSLITERATIONS[word];
    if (transliterated) {
      tokens.add(transliterated);
      for (const extra of SYNONYM_WORDS[transliterated] ?? []) tokens.add(extra);
      continue;
    }

    tokens.add(word);
    for (const extra of SYNONYM_WORDS[word] ?? []) tokens.add(extra);

    // Plural to singular, only the safe English case. Tamil is left alone.
    if (/^[a-z]+s$/.test(word) && word.length > 4) {
      const singular = word.slice(0, -1);
      tokens.add(singular);
      for (const extra of SYNONYM_WORDS[singular] ?? []) tokens.add(extra);
    }
  }

  return [...tokens];
}

/**
 * Levenshtein distance, bailed out early past `max`.
 *
 * Bounded because it is called across a keyword list per query: full distance
 * on a pair that is obviously far apart is wasted work, and the answer is only
 * ever compared against a small threshold anyway.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      current[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}

/**
 * Fuzzy token equality. Short words must match exactly — at four characters an
 * edit distance of one is a different word ("well" and "will", "sell" and
 * "cell"), and allowing it produces confident wrong answers.
 */
export function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  const allowed = Math.min(2, Math.floor(Math.min(a.length, b.length) / 4));
  return editDistance(a, b, allowed) <= allowed;
}
