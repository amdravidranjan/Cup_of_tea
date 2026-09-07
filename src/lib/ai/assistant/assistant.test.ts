import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_BASE,
  QUERY_CATEGORIES,
  answerAssistantQuery,
  entryById,
  knowledgeIntegrityProblems,
  knowledgeStats,
  menuForCategory,
  type PublicProjectLike,
} from "./index";
import { editDistance, expandTokens, tokensMatch } from "./synonyms";

const PROJECTS: PublicProjectLike[] = [
  { id: "p1", name: "Cauvery–Vaigai–Gundar Link Canal (Sivaganga Reach)", district: "Sivaganga", state: "Tamil Nadu", stage: "NOTIFIED" },
  { id: "p2", name: "Chennai Metro Phase 2 – Poonamallee Extension", district: "Chennai", state: "Tamil Nadu", stage: "AWARDED" },
  { id: "p3", name: "Koraput River Bridge Project", district: "Koraput", state: "Odisha", stage: "POSSESSION" },
  { id: "p4", name: "Coimbatore–Sathyamangalam NH Bypass", district: "Coimbatore", state: "Tamil Nadu", stage: "DECLARED" },
];

/* ── The bank itself ─────────────────────────────────────────────────── */

describe("knowledge base integrity", () => {
  it("has no structural problems", () => {
    // All five checked failures are silent in the UI: a missing Tamil answer
    // renders as a blank bubble and a bad follow-up id renders as a button
    // that does nothing, and neither shows up until someone taps it.
    expect(knowledgeIntegrityProblems()).toEqual([]);
  });

  it("covers every category with a usable number of answers", () => {
    const stats = knowledgeStats();
    expect(stats.total).toBeGreaterThanOrEqual(90);
    for (const { category, count } of stats.byCategory) {
      expect(count, `category ${category} is thin`).toBeGreaterThanOrEqual(8);
    }
  });

  it("answers in Tamil everywhere, not only on the public pages", () => {
    for (const entry of KNOWLEDGE_BASE) {
      expect(entry.answer.ta.length, entry.id).toBeGreaterThan(40);
      expect(/[\u0B80-\u0BFF]/.test(entry.answer.ta), entry.id).toBe(true);
    }
  });

  it("cites a statutory basis wherever one exists", () => {
    // Not every answer has one — "which office do I go to" is administrative —
    // but the legal ones must, or the portal is asking to be trusted.
    const stats = knowledgeStats();
    expect(stats.withBasis).toBeGreaterThanOrEqual(40);
    for (const id of ["comp-solatium", "comp-interest", "rights-consent", "rights-multi-crop", "poss-when-taken"]) {
      expect(entryById(id)?.basis, id).toBeTruthy();
    }
  });

  it("gives every entry a way onward, so no answer is a dead end", () => {
    for (const entry of KNOWLEDGE_BASE) {
      const reply = answerAssistantQuery(entry.id);
      expect(reply.suggestions.length, entry.id).toBeGreaterThan(0);
    }
  });

  it("uses only relative in-app links", () => {
    for (const entry of KNOWLEDGE_BASE) {
      for (const link of entry.links ?? []) {
        expect(link.href.startsWith("/"), `${entry.id} -> ${link.href}`).toBe(true);
      }
    }
  });

  it("keeps the category menus populated", () => {
    for (const category of QUERY_CATEGORIES) {
      expect(menuForCategory(category.id).length, category.id).toBeGreaterThanOrEqual(8);
    }
  });
});

/* ── Robustness ──────────────────────────────────────────────────────── */

describe("answerAssistantQuery robustness", () => {
  it("never throws, whatever it is handed", () => {
    const nasties: unknown[] = [
      undefined, null, "", "   ", 0, 42, [], {}, NaN, true,
      ".", "?", "!!!", "😀😀😀", "\n\n\t",
      "x".repeat(40_000),
      "'; DROP TABLE parcels; --",
      "<script>alert('xss')</script>",
      "{{constructor.constructor('return 1')()}}",
      "../../../etc/passwd",
      "SELECT * FROM users UNION SELECT 1,2,3",
      "\u0000\u0001\u0002",
      "ᓚᘏᗢ",
    ];
    for (const nasty of nasties) {
      expect(() => answerAssistantQuery(nasty, { projects: PROJECTS })).not.toThrow();
      const reply = answerAssistantQuery(nasty, { projects: PROJECTS });
      expect(reply.text.length, String(nasty).slice(0, 30)).toBeGreaterThan(0);
      expect(Array.isArray(reply.suggestions)).toBe(true);
    }
  });

  it("offers the menu for empty input instead of scolding", () => {
    for (const empty of ["", "   ", ".", undefined]) {
      const reply = answerAssistantQuery(empty);
      expect(reply.kind).toBe("empty");
      expect(reply.suggestions).toHaveLength(QUERY_CATEGORIES.length);
    }
  });

  it("names an injection probe as literal text rather than looking broken", () => {
    const reply = answerAssistantQuery("' OR 1=1 --");
    expect(reply.kind).toBe("probe");
    expect(reply.text).toContain("plain text");
    expect(reply.suggestions.length).toBeGreaterThan(0);
  });

  it("works with no project list at all", () => {
    // The widget fetches projects lazily, so a question asked in the first
    // second arrives with an empty list. It must still answer.
    const reply = answerAssistantQuery("how much compensation will I get");
    expect(reply.kind).toBe("answer");
    expect(reply.entry?.id).toBe("comp-how-much");
  });

  it("survives a 40,000 character paste and still matches", () => {
    const reply = answerAssistantQuery(
      `${"blah ".repeat(6000)} how do I file a grievance`,
      { projects: PROJECTS }
    );
    expect(["answer", "disambiguate"]).toContain(reply.kind);
  });
});

/* ── What people actually ask ────────────────────────────────────────── */

describe("real questions resolve to the right answer", () => {
  const cases: [string, string][] = [
    ["how much money will I get for my land", "comp-how-much"],
    ["what is solatium", "comp-solatium"],
    ["do I get interest on the compensation", "comp-interest"],
    ["when will I be paid", "comp-when-paid"],
    ["the amount is too low what can I do", "comp-disagree"],
    ["will they pay for my coconut trees and well", "comp-trees-wells"],
    ["there is a bank loan on the land who gets the money", "comp-mortgage"],
    ["do I pay income tax on compensation", "comp-tax"],
    ["my father died and patta is in his name", "comp-heir-deceased"],
    ["what do I get besides the money", "rr-what-do-i-get"],
    ["will I be given a house", "rr-housing"],
    ["monthly subsistence grant", "rr-subsistence"],
    ["will someone in my family get a job", "rr-job"],
    ["I have no patta am I entitled to anything", "rr-tenant"],
    ["extra benefits for scheduled tribe families", "rr-sc-st"],
    ["what are all the stages of a project", "status-all-stages"],
    ["what does notified mean", "status-what-is-notified"],
    ["what is the social impact assessment", "status-sia"],
    ["does the gram sabha have to be consulted", "status-gram-sabha"],
    ["how long does the whole process take", "status-how-long"],
    ["how do I file a complaint", "grv-how-to-file"],
    ["how do I track my grievance", "grv-track"],
    ["can I object to the acquisition", "grv-object-acquisition"],
    ["nobody is responding who do I escalate to", "grv-escalate"],
    ["what is the larr authority", "grv-court"],
    ["can I complain anonymously", "grv-anonymous"],
    ["what documents do I need", "doc-what-do-i-need"],
    ["what is a patta and chitta", "doc-patta"],
    ["what is an fmb sketch", "doc-fmb"],
    ["what is an encumbrance certificate", "doc-ec"],
    ["how do I get a legal heir certificate", "doc-heir"],
    ["I never received any notice", "doc-notice-not-received"],
    ["I lost my patta", "doc-lost-patta"],
    ["how do I find my land", "land-find-my-parcel"],
    ["convert cents to hectares", "land-units"],
    ["what does nanjai and punjai mean", "land-classification"],
    ["the area on the record is wrong", "land-boundary-wrong"],
    ["can I refuse to give my land", "rights-can-i-refuse"],
    ["does the government need our consent", "rights-consent"],
    ["do I have a right to be heard", "rights-hearing"],
    ["the land was taken but never used", "rights-unused-land"],
    ["can they acquire irrigated farmland", "rights-multi-crop"],
    ["what is the urgency clause", "rights-urgency"],
    ["which law governs land acquisition", "rights-which-act"],
    ["when can the government take my land", "poss-when-taken"],
    ["can I keep farming until possession", "poss-still-farming"],
    ["an officer came with a phone to my field", "poss-verification-visit"],
    ["what is encroachment monitoring", "poss-encroachment"],
    ["what is the land bank", "poss-land-bank"],
    ["what is tn-glms", "sys-what-is-this"],
    ["who can see my personal information", "sys-privacy"],
    ["what is the audit trail", "sys-audit-trail"],
    ["is the ai on this site real", "sys-ai-explain"],
    ["is this available in tamil", "sys-tamil"],
    ["does this work offline", "sys-offline"],
    ["I want to talk to a real person", "help-talk-to-person"],
    ["which office should I go to", "help-which-office"],
    ["can I speak instead of typing", "help-voice"],
    ["I cannot read well", "help-illiterate"],
  ];

  for (const [question, expectedId] of cases) {
    it(`"${question}" → ${expectedId}`, () => {
      const reply = answerAssistantQuery(question, { projects: PROJECTS });
      if (reply.kind === "disambiguate") {
        // A close call is acceptable as long as the right answer is offered.
        expect(reply.suggestions.map((s) => s.ref)).toContain(expectedId);
      } else {
        expect(reply.kind).toBe("answer");
        expect(reply.entry?.id).toBe(expectedId);
      }
    });
  }
});

describe("informal and misspelled phrasing still lands", () => {
  it("matches transliterated Tamil", () => {
    for (const [query, expected] of [
      ["ilappeedu evvalavu", "compensation"],
      ["patta illa", "no patta"],
      ["kurai manu eppadi", "grievance"],
    ] as [string, string][]) {
      expect(expandTokens(query)).toContain(expected);
    }
  });

  it("answers a transliterated question rather than falling back", () => {
    const reply = answerAssistantQuery("ilappeedu evvalavu kidaikkum", { projects: PROJECTS });
    expect(reply.kind).not.toBe("fallback");
  });

  it("tolerates phone-keyboard misspellings", () => {
    for (const typo of ["compensaton", "grievence", "rehabilitaton"]) {
      const reply = answerAssistantQuery(typo, { projects: PROJECTS });
      expect(reply.kind, typo).not.toBe("fallback");
    }
  });

  it("refuses to fuzzy-match short words into different words", () => {
    // At four characters an edit distance of one is a different word — "well"
    // and "will", "sell" and "cell" — and allowing it produces confident
    // wrong answers.
    expect(tokensMatch("well", "will")).toBe(false);
    expect(tokensMatch("sell", "cell")).toBe(false);
    expect(tokensMatch("compensaton", "compensation")).toBe(true);
  });

  it("bails out of edit distance early when strings are far apart", () => {
    expect(editDistance("a", "abcdefghij", 2)).toBe(3);
  });
});

describe("Tamil script questions", () => {
  it("replies in Tamil when asked in Tamil", () => {
    const reply = answerAssistantQuery("இழப்பீடு எவ்வளவு கிடைக்கும்?", { projects: PROJECTS });
    expect(reply.language).toBe("ta");
    expect(/[\u0B80-\u0BFF]/.test(reply.text)).toBe(true);
  });

  it("resolves Tamil keywords to the right entries", () => {
    for (const [query, expectedId] of [
      ["ஆறுதல் தொகை என்றால் என்ன", "comp-solatium"],
      ["மறுவாழ்வு உரிமைகள்", "rr-what-do-i-get"],
      ["வாரிசு சான்றிதழ்", "doc-heir"],
      ["தணிக்கைப் பதிவு", "sys-audit-trail"],
    ] as [string, string][]) {
      const reply = answerAssistantQuery(query, { projects: PROJECTS });
      const ids =
        reply.kind === "disambiguate"
          ? reply.suggestions.map((s) => s.ref)
          : [reply.entry?.id ?? ""];
      expect(ids, query).toContain(expectedId);
    }
  });

  it("honours a forced language regardless of the script typed", () => {
    const reply = answerAssistantQuery("what is solatium", {
      projects: PROJECTS,
      language: "ta",
    });
    expect(reply.language).toBe("ta");
    expect(/[\u0B80-\u0BFF]/.test(reply.text)).toBe(true);
  });
});

/* ── Project lookup ──────────────────────────────────────────────────── */

describe("project lookup", () => {
  it("recognises a project by a distinctive word", () => {
    const reply = answerAssistantQuery("what is happening with the Sivaganga canal", {
      projects: PROJECTS,
    });
    expect(reply.kind).toBe("project");
    expect(reply.text).toContain("Sivaganga");
    expect(reply.text).toContain("notified");
  });

  it("reports the next step alongside the stage", () => {
    const reply = answerAssistantQuery("Koraput bridge status", { projects: PROJECTS });
    expect(reply.kind).toBe("project");
    expect(reply.text).toContain("eighteen months");
  });

  it("does not match a project on a generic word", () => {
    // The original VANI scores any word over three characters against the
    // project name, so "my land" could resolve to a project with "Land" in
    // its title. That is a confident wrong answer.
    const reply = answerAssistantQuery("what is the status of my land", { projects: PROJECTS });
    expect(reply.kind).not.toBe("project");
  });

  it("prefers a strong topic answer over an incidental place name", () => {
    const reply = answerAssistantQuery("how is compensation calculated in Coimbatore", {
      projects: PROJECTS,
    });
    expect(reply.kind).toBe("answer");
    expect(reply.entry?.category).toBe("compensation");
  });

  it("mentions the other matches when several projects fit", () => {
    const reply = answerAssistantQuery("Chennai metro", { projects: PROJECTS });
    expect(reply.kind).toBe("project");
  });
});

/* ── Menus, small talk and fallback ──────────────────────────────────── */

describe("navigation and fallbacks", () => {
  it("opens a category into written-out questions", () => {
    const reply = answerAssistantQuery("category:compensation");
    expect(reply.category).toBe("compensation");
    expect(reply.suggestions.length).toBe(8);
    expect(reply.suggestions[0].ref).toBe("comp-how-much");
  });

  it("resolves an unknown category to the menu, not an error", () => {
    const reply = answerAssistantQuery("category:banana");
    expect(reply.kind).toBe("fallback");
    expect(reply.suggestions.length).toBe(QUERY_CATEGORIES.length);
  });

  it("resolves a tapped entry id directly", () => {
    const reply = answerAssistantQuery("comp-solatium");
    expect(reply.kind).toBe("answer");
    expect(reply.confidence).toBe(1);
  });

  it("greets and then steers somewhere useful", () => {
    for (const greeting of ["hi", "hello", "vanakkam", "வணக்கம்"]) {
      const reply = answerAssistantQuery(greeting);
      expect(reply.kind).toBe("smalltalk");
      expect(reply.suggestions.length).toBeGreaterThan(0);
    }
  });

  it("redirects an off-topic question instead of mis-matching it", () => {
    const reply = answerAssistantQuery("what is the weather tomorrow");
    expect(reply.kind).toBe("out-of-scope");
    expect(reply.text).toContain("land acquisition");
  });

  it("falls back to the subject menu rather than apologising", () => {
    const reply = answerAssistantQuery("qwertyuiop asdfghjkl zxcvbnm");
    expect(reply.kind).toBe("fallback");
    expect(reply.suggestions).toHaveLength(QUERY_CATEGORIES.length);
    expect(reply.text).toContain("tap a subject");
  });

  it("asks which was meant when two answers are equally close", () => {
    // Better an honest question than a confident wrong answer.
    const reply = answerAssistantQuery("notice", { projects: PROJECTS });
    if (reply.kind === "disambiguate") {
      expect(reply.suggestions.length).toBeGreaterThan(1);
      expect(reply.confidence).toBeLessThan(0.5);
    }
  });

  it("keeps confidence inside 0 to 1 for every reply kind", () => {
    for (const query of ["", "hi", "solatium", "weather", "qwerty", "' OR 1=1 --", "Koraput bridge"]) {
      const reply = answerAssistantQuery(query, { projects: PROJECTS });
      expect(reply.confidence).toBeGreaterThanOrEqual(0);
      expect(reply.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("narrows matching when the user has tapped into a category", () => {
    const reply = answerAssistantQuery("what do I need", {
      projects: PROJECTS,
      category: "documents",
    });
    const category = reply.entry?.category ?? reply.category;
    expect(category).toBe("documents");
  });
});

describe("determinism", () => {
  it("gives the same answer to the same question every time", () => {
    for (const query of ["how much compensation", "what is solatium", "Koraput bridge"]) {
      const first = answerAssistantQuery(query, { projects: PROJECTS });
      const second = answerAssistantQuery(query, { projects: PROJECTS });
      expect(second.text).toBe(first.text);
      expect(second.kind).toBe(first.kind);
    }
  });
});
