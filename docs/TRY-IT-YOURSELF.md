# Try It Yourself — the printed card for the table

Print this. Put it face-up in front of the judges and say "type any of these in."

Everything on this card resolves. That is the point of it: an invitation to test
the system is only worth making if nothing on the list can dead-end, so every
line here is covered by a test.

---

## Ask the assistant (the chat button, bottom right — no login)

Tap a subject and pick a question, or type any of these in your own words:

- **How much compensation will I get for my land?**
- **What is solatium and why is it 100%?**
- **I have no patta. Am I entitled to anything?** ← the answer most people don't know
- **Can I refuse to give my land?**
- **The amount is too low. What can I do?**
- **What is the urgency clause?**
- **Is the AI on this site real?** ← ask this one
- **இழப்பீடு எவ்வளவு கிடைக்கும்?** (Tamil — the reply comes back in Tamil)
- **ilappeedu evvalavu** (Tamil typed in English letters — still works)

Then try to break it: paste a paragraph, type `' OR 1=1 --`, send an empty
message, type gibberish. Nothing errors; you get the subject menu or an honest
"which did you mean".

## Look up a project by name or district

- *"What is happening with the Sivaganga canal?"*
- *"Koraput bridge status"*
- *"Chennai metro"*

You do not need the official title, and *"compensation in Coimbatore"* gets the
compensation answer rather than the Coimbatore bypass — a place name on its own
is not a project reference.

## The analytics sandbox — `/app/ai-sandbox` (any login)

### Risk score — press the presets, then change a box

| Press this | You get |
|---|---|
| Well-run project | 3 / 100, Low |
| Mid-acquisition, minor slippage | 29, Moderate |
| Mostly vulnerable households | 48, High |
| Litigation-heavy | 74, Critical |
| Every signal at maximum | 100 — terms sum to 125, the cap holds |
| **Brand-new project (all zeros)** | **5, not 0** — an empty file is unassessed, not safe |
| **Impossible numbers** | 80, with three repair notes naming each fix |

Then type nonsense into any box — `-40`, `abcd`, `999999999999` — and watch the
note appear above the score saying what was done with it.

Open **"How this risk score was calculated"** to see each term with your own
numbers substituted into the formula.

### Land rate — type any district

| Try | You get |
|---|---|
| `Chennai` | ₹4.2 crore/ha, metropolitan band, 1× multiplier |
| `Sivaganga` + 48 months since revision | Drift applied, **capped at 18%** |
| `Trichy` / `Tuticorin` / `Kovai` | Resolved to the real district names |
| `Ariyalur` (not in the table) | State band, **and it names the fallback it used** |
| `Nowhere` + rate `-500` | A usable figure, plus every repair listed |
| 900 parcels | Demand adds **10%, not 900%** — the term is logarithmic |

### The policy question

Set extent `50` ha and open the multiplier table:

> **2× → 3× on 50 hectares at ₹40,00,000/ha costs ₹40 crore.**

Same award maths as a real parcel — s.26 market value, s.29 assets, s.30(1)
solatium, s.30(3) interest.

### Document reading — press a sample, then describe your own file

| Press this | You get |
|---|---|
| Detailed Project Report | Every field filled, cost included |
| s.11 notification (gazette) | Statutory particulars — **cost stays blank, because a notification doesn't state one** |
| Untagged file | Category inferred from the name, with the reason shown |
| Photographed notification | Confidence **capped at 78%**, and the reason is the file, not the reader |
| Encumbrance certificate | **"This document carries no project particulars"** — no project invented |
| Password-protected PDF | Blocked, with a next action |
| Holiday photo named `.pdf` | Mismatch flagged, read by contents, nothing invented |

Then change the file name to anything, set the size to `0` or `40000` KB, untick
"has a text layer", tick "password protected". Every combination gives a
sentence and a next action.

---

## Seeded values that resolve

| Type this | Where |
|---|---|
| `Koraput River Bridge Project` | Project search, assistant |
| `Cauvery–Vaigai–Gundar Link Canal` | Project search |
| `Chennai Metro Phase 2` | Project search |
| `Coimbatore–Sathyamangalam NH Bypass` | Project search |
| `142/2B` | Survey number format (base / subdivision) |
| `0-84-00` | Extent — reads as 0.84 ha, the form a chitta prints |
| `2.08 acres`, `37 cents`, `1 ground` | Any extent field |
| `45 lakh`, `₹45,00,000`, `1.2 crore` | Any rate field |

## Demo logins

One click each from the login page — District (Koraput), State (Tamil Nadu),
Central (DoLR), Project Agency, Field Officer. A citizen can also register with
a real email or mobile.

Every public feature above works **without any login at all**.

---

## The litmus test from NOVELTY.md

Hand a judge the phone and say: *"find out what your land is worth and complain
about it."* Then walk away.

If they get stuck, or the calculator gives a number without explaining it, it
isn't done.
