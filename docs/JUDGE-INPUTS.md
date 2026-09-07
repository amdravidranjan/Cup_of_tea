# Judge Inputs — what happens when someone tries to break it

Lane E's core task in `DELEGATION.md` is the judge-input contingency work:

> Every feature that is frontend-only, or depends on something that can fail
> (AI modules, tile servers, speech API, any fetch), gets a deterministic local
> fallback that always returns a sensible, explainable answer.
> **Rule: nothing may show an infinite spinner or a raw error, ever.**

This document is the matrix that rule is tested against. Every row is covered by
a test in `src/lib/ai/**`; the whole file is 217 assertions and runs in under two
seconds.

The four modules a judge will actually poke are the ones with a number in them
that invites being changed: the risk score, the rate projection, the document
reader, and the assistant. On the project workspace all four compute from
database counts, so they can be looked at but not tested — which is precisely
what makes them read as an oracle rather than as arithmetic. `/app/ai-sandbox`
removes that asymmetry.

---

## The one-sentence answer to "is this real AI?"

None of the four is a trained model, and the sandbox says so in the module's own
words rather than in a footnote. A judge asks this within two minutes of finding
the assistant, and `sys-ai-explain` in the answer bank is the reply:

| Module | What it actually is |
|---|---|
| Risk score | Weighted sum of six project signals, capped 0–100 |
| Rate projection | A base rate with four percentage adjustments |
| Encroachment | Deterministic check over parcel status, time since possession, impact-zone position. **No live satellite feed, no change-detection model.** A flag means "send someone to look", never a finding |
| Document reading | Template extraction per category, field-level confidence. **No character recognition on images** |

The test to hand a judge: *change one input and see whether one line of the
working changes in a way you can follow.* If it does, it is arithmetic and it is
checkable. That is the entire claim.

---

## 1. Numbers typed into any form

Handled centrally in `src/lib/ai/input-guard.ts`, so every module inherits it.

| Input | Behaviour |
|---|---|
| `45` | Read as 45 |
| `₹45,00,000` / `Rs. 1,20,000` / `INR 5000` | Currency marks and Indian grouping stripped |
| `45 lakh` / `1.2 crore` / `2 cr` | Scaled — 45,00,000 and 1,20,00,000 |
| `42,00,000 per hectare` / `38,00,000/ha` | Suffix stripped |
| `-5` | Clamped to the floor, **with a visible note** |
| `1e9`, `999999999999` | Capped at the field maximum, with a note |
| `abcd`, `many` | Field left at its default, note marked *rejected* |
| `NaN`, `Infinity`, `[]`, `{}`, `undefined` | Default, no crash |
| Blank | Default, **no note** — an empty field is not an error |
| `2.5` where an integer is expected | Rounded, note marked *info* |

**Nothing is repaired silently.** A clamp that happens invisibly is a lie about
what was computed, so each function returns the value *and* a note, and the UI
prints the notes above the answer — above, because a repaired input changes how
the answer should be read and finding that out afterwards is finding out too
late.

## 2. Extents, in the units a Tamil Nadu record actually uses

| Input | Read as |
|---|---|
| `0.84` | 0.84 ha — a bare number is hectares, matching the upload templates |
| `2.08 acres` | 0.8417 ha |
| `37 cents` | 0.1497 ha |
| `8400 sqm` | 0.84 ha |
| `2400 sq ft` | 0.0223 ha |
| `1 ground` | 0.0223 ha (Chennai usage) |
| `0-84-00` | 0.84 ha — the hectare-are-square-metre triple a chitta prints |
| `plenty`, `-3` | Null; the caller substitutes 1 ha and says so |

This matters more than it looks. Compensation is computed per hectare while most
people know their land in cents or acres, and a conversion done wrong is the
commonest reason someone concludes the wrong extent was recorded.

## 3. Dates

| Input | Behaviour |
|---|---|
| `2026-04-01` | ISO |
| `01-04-2026`, `01/04/2026` | Day-first, as every Indian form prints it, with a note |
| `2030-01-01` in a "last revised" field | **Pulled back to today**, with a note — a future date silently produces negative elapsed time and then a nonsensical projection |
| `32-13-2026`, `new Date("nonsense")` | Ignored, note marked *rejected* |

## 4. Risk score

Eight presets, one press each. Two of them exist because of what they expose:

| Preset | Score | Why it is in the list |
|---|---|---|
| Well-run project | 3 (Low) | What Low looks like when it is earned |
| Mid-acquisition, minor slippage | 29 (Moderate) | The ordinary case |
| Mostly vulnerable households | 48 (High) | R&R exposure alone, no litigation |
| Litigation-heavy | 74 (Critical) | Litigation is the heaviest single term, 30 points |
| Statutory deadlines blown | 79 (Critical) | The 25-point cap holding instead of running away |
| Awarded but no land taken | 91 (Critical) | The classic stalled-project shape |
| Every signal at maximum | 100 | Terms sum to 125; the cap holds |
| **Brand-new project (all zeros)** | **5, not 0** | An empty file is *unassessed*, not safe. The card says "No adverse signals" rather than certifying the project |
| **Impossible numbers** | 80, with three repair notes | See below |

### The contradictory-input case, which is the interesting one

"40 open grievances out of 12 filed, 90 parcels possessed out of 20" is what a
judge types when they change one box and not the other. Fed **raw** to the
scorer, that produces:

```
Open grievances          = +67    (40 ÷ 12 × 20)
Vulnerable-household share = +60
Land not yet possessed   = −70    (1 − 90 ÷ 20) × 20
```

A **negative seventy point** possession term — "more possessed than exists"
reads as risk-*reducing*. That is the bug the coercion layer exists to prevent,
and it is asserted in
`risk-score-sandbox.test.ts › protects the scorer from impossible counts`.

Guarded, every term lands in 0–30 and three notes appear naming each repair. A
blank total alongside a filled "open" count is read as *all of them open* —
the charitable reading of someone who filled in one box — rather than the field
being dropped.

### What-if levers

Six single-lever scenarios, so a movement is attributable to one action rather
than a bundle: resolve every grievance, clear all breaches, dispose of all
litigation, complete possession, one more court case, another deadline breached.

## 5. Land rate projection

| Input | Behaviour |
|---|---|
| A district in the table | Its indicative band, **labelled indicative, not a gazette value** |
| `Trichy`, `Tuticorin`, `Bangalore`, `Kovai`, `Madras` | Alternate spellings resolved |
| `Sivaganga Reach`, `Chennai district` | District found inside a longer phrase |
| An unknown district (`Ariyalur`, `Nowhere`) | State band, **and the answer names the fallback it used** |
| Rate `-500` or `0` | Reference rate substituted, with a note |
| Rate blank | District band, `baseSource` reported |
| Revision date 48 months ago | Drift applied — **capped at 18%** however stale |
| 900 parcels | Demand term is logarithmic — **capped at 10%**, not 900% |
| Classification `BANANA` | No adjustment, note marked *info* |
| Everything bad at once (the `nonsense` preset) | A usable figure plus every repair listed |

Districts are ordered so the *relative* picture is right — Chennai above
Kanchipuram above Perambalur above Koraput — because a judge checks the
ordering, not the absolute figure.

### The policy question

`compareMultiplierPolicy` answers what `NOVELTY.md` promises: *"if we change the
multiplier from 2× to 3×, impact on a 50-hectare project is ₹X"*. On 50 ha at
₹40,00,000/ha the step from 2× to 3× costs **₹40 crore**, and the table shows
market value, solatium and interest per multiplier.

It runs through Lane C's `calculateCompensation` — the same function a real award
uses — so the table cannot drift from what the workspace shows for an actual
parcel. Asserted in
`land-rate-sandbox.test.ts › uses the same award maths as a real parcel`.

## 6. Document upload

Twelve outcomes, each bilingual, each with a next action. **No outcome is a dead
end, including the refusals.**

| What a judge drops in | Outcome | Ceiling |
|---|---|---|
| PDF with a text layer | Read directly | 97% |
| PDF with no text layer | Named as a picture of a page — **the reason is the file, not the reader** | 78% |
| A phone photograph | No character recognition runs; **nothing is read off the image** | 78% |
| Word document | Body and tables read, embedded images not | 94% |
| Spreadsheet | Routed to bulk intake, one row per record | 99% |
| A 0-byte upload | Interrupted upload, retry | — |
| A 40 MB scan | Refused, with the size it saw and a 300 dpi suggestion | — |
| Password-protected PDF | Kept as an attachment, nothing read | — |
| `.zip`, `.exe`, `.mp4` | Not a document; accepted formats listed | — |
| **A JPEG named `project_report_final_FINAL.pdf`** | Mismatch flagged, **read by contents not by name** | 70% |
| Unrecognised type | Attachment only | — |

A rejected file gets a sentence explaining the rejection, never a
plausible-looking extraction. A system that invents a survey number off a
picture of a cat is worse than one that says it cannot read pictures of cats.

### Category inference from the file name

An officer picks the category from a dropdown; a judge drags a file in without
touching it. `pattaa_extract.pdf` → `PATTA_CHITTA`, `FMB_sketch_142-2B.pdf` →
`FMB_SKETCH`, `section19_declaration.pdf` → `DECLARATION`, and the guess is shown
with its reason so it can be overridden.

> **A bug worth recording.** The first version used `\b` word boundaries, which
> never fire against an underscore — because an underscore is a word character.
> That missed the majority of real uploads, since real revenue files are named
> `pattaa_extract.pdf`. Separators are now normalised to spaces before matching.
> The same trap bit the Tamil greeting regex in the assistant: `\b` is defined
> over ASCII word characters, so `வணக்கம்\b` can never match.

An inferred guess **never** overrules an officer who was explicit.

### Project details off a project document

New capability: a DPR or a s.11 notification reads into the new-project form.
Eight fixtures, one press each, between them hitting every branch.

| Fixture | What it demonstrates |
|---|---|
| DPR (complete) | Fills every field, cost and family estimate included |
| s.11 notification | Statutory particulars and gazette number; **cost stays blank, because a notification does not state one** |
| SIA report | Strong on villages and families, silent on requiring body and cost |
| Untagged file | Category inferred from the name, and the answer says that is why |
| Photographed notification | Confidence capped at 78%, reason given |
| Encumbrance certificate | A valid document carrying no project particulars — **says so instead of inventing a project** |
| Password-protected PDF | Blocked with a next action |
| Holiday photo named `.pdf` | Mismatch, nothing invented |

`missingFields` is part of the answer, not an omission. A reader that returns
eight fields and stays quiet about the four it could not find invites an officer
to submit an incomplete project.

> **A second bug worth recording.** Confidence was averaged over all fields
> including state and district supplied by the project *context* — which carry a
> confidence of 1 because they were not read from the document at all. A
> photographed notification therefore reported 82% against a stated 78% ceiling.
> Context-supplied fields are now excluded from the read average and the result
> is clamped to the ceiling.

## 7. The assistant

~100 pre-written answers in ten subject categories, every one bilingual, 40+
citing a section of the Act.

### Adversarial input — none of it throws

`undefined`, `null`, `""`, `"   "`, `0`, `42`, `[]`, `{}`, `NaN`, `true`, `"."`,
`"?"`, `"!!!"`, `"😀😀😀"`, a 40,000-character paste, `"' OR 1=1 --"`,
`"<script>alert('xss')</script>"`, `"{{constructor.constructor(...)()}}"`,
`"../../../etc/passwd"`, a SQL UNION, null bytes, ASCII art.

Every one produces a reply with a non-empty message and at least one suggestion.

| Input class | Reply |
|---|---|
| Empty or punctuation only | The subject menu — **"please enter a question" is a scolding; a menu is help** |
| An injection probe | Answered as literal text and *named as such* — silently returning "no match" reads like a crash to whoever typed it |
| A 40,000-character paste | Both ends kept, middle dropped. A pasted question usually ends with the question, so truncating from the front throws it away |
| Off-topic (weather, cricket, recipes) | Redirected, rather than mis-matched on a stray word like "value" |
| Gibberish | The subject menu, not an apology |
| Two equally close answers | **Asks which was meant.** A confident wrong answer costs more trust than an honest question |
| Inside an open category with no match | Stays in that category rather than dumping the user back to the top |

### Phrasing coverage

60 real questions are asserted to reach a specific answer. Beyond exact
phrasing:

- **Transliterated Tamil** — `ilappeedu evvalavu`, `patta illa`,
  `kurai manu eppadi`. There is no correct spelling for these, so the tables are
  deliberately generous.
- **Typos** — `compensaton`, `grievence`, `rehabilitaton`. Words under five
  characters must match exactly: at four characters an edit distance of one is a
  *different word* ("well"/"will", "sell"/"cell"), and allowing it produces
  confident wrong answers.
- **Everyday phrasing over official terms** — "how much money will I get" rather
  than "quantum of compensation"; "father died and patta is in his name";
  "they cut my field in two".
- **Tamil script** — replies in the language asked in, and switches mid-conversation.

### Project lookup, tightened

The existing VANI scores any word over three characters against a project's
name, district and state, so *"what is the status of my land"* can resolve to a
project with "Land" in its title. Two extra conditions now apply:

1. Generic words (`project`, `corridor`, `land`, `road`, `phase`, …) are excluded.
2. A match must rest on something **beyond the district or state name**.

That second rule fixes a case caught in testing: *"how is compensation
calculated in Coimbatore"* matched the Coimbatore–Sathyamangalam Bypass, because
the district name is also in the project's title. A place name on its own is a
topic question that mentions a place, not a project reference.

---

## What is still honestly weak

Worth saying out loud rather than discovering at the table:

- **Tamil wording needs a native review.** ~100 Tamil answers were written
  against Revenue Department usage, but Lane D owns the bilingual layer and
  should check the terminology.
- **The district rate table is indicative, not gazetted.** It is labelled that
  way everywhere it surfaces. The ordering is defensible; the absolute figures
  are not gazette values and must not be presented as such.
- **The assistant cannot answer about a specific person's case.** It says so and
  routes to a grievance, which is the right answer, but a judge hoping for
  "what will *my* award be" will hit that boundary.
- **Encroachment monitoring is a review prompt, not detection.** No imagery
  pipeline exists. Both the answer bank and the page say this plainly.
