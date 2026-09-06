# TN-GLMS Novelty — Why This Is Not The Default LARR Portal

The judges will ask: "Land acquisition portals exist. Why is this one interesting?" This is the answer.

---

## Core Novelty: The Audit Chain + Enforced Workflow

**Most land acquisition systems:**
- Record a decision (e.g., "parcel marked as possessed")
- Never record *who* decided it, *when*, or *what was true before*
- Audit is missing, optional or added retroactively

**TN-GLMS:**
- Every mutating action writes a timestamped, actor-named, before-after audit row
- The chain is cryptographically anchored (hash of the previous row, making it tamper-evident)
- A judge or an officer can *prove* that a possession marking was not a data entry mistake — it was Officer X on Date Y who marked it, and here is the photo evidence they uploaded
- This is legally *defensible*; a normal LARR portal is not

**Why it matters for SIH:** Corruption in land acquisition is the second-largest category of grievance. A system where "the officer said they never marked it" is provably false (the audit trail contradicts) is revolutionary for a government IT project.

---

## Workflow Enforcement: The Unblockable Next Step

**Most systems:**
- A compensation page shows a number
- Nobody enforces *who* can pay it or *when*
- A district officer and a state officer can both click "mark paid" in the wrong order, and the system accepts it

**TN-GLMS:**
- Every workflow has explicit state guards defined in `lib/workflow.ts`
- Marking a parcel as possessed is *blocked* if a court stay order exists on that project (you can see why you cannot act)
- R&R cannot start until the compensation stage is marked complete
- A field officer cannot mark a parcel verified if the compensation rate has not been set
- These are *hard* blocks, not advice

**Why it matters:** The RFCTLARR Act has 13 mandatory sequences. A system that enforces them means you cannot accidentally skip a step or pay before notifying, which courts have jailed officers for.

---

## Dual Intelligence: Rule-Based, Explainable, Deterministic

**Most systems with "AI":**
- Plug in a third-party ML model
- Get a number back
- Have no idea why
- Cannot debug when it fails

**TN-GLMS:**
- *Risk score:* a weighted formula (grievances, SLA breaches, vulnerable families, unpossessed land, litigation) — you can see the number for each factor and the formula that combines them
- *Land-rate prediction:* a deterministic formula (notified rate + time-since-revision + local demand proxy + regional variance) — not a model, not a black box, a spreadsheet you could hand to an auditor
- *Encroachment detection:* not a real change-detection model (we have no live satellite feed); instead a seeded heuristic that is *consistent and explainable* rather than randomized
- *Document intelligence:* template-based field extraction for text-layer PDFs, not OCR/vision; explicit confidence on text-layer docs, and a stated reason for low confidence when the PDF is scanned

**Why it matters:** Government systems must be auditable and defensible in court. A model you cannot explain is a liability. Our position is *transparent and deterministic*, which is defensible.

---

## Offline-First Field Work + Tamper-Evident GPS

**Most systems:**
- A field officer with no internet gets a blank screen
- Photographs might not sync for hours
- Location is logged only if the app is open

**TN-GLMS:**
- The entire project parcel list, boundaries, and recent photos are cached locally
- Offline, the officer can still verify parcels, upload photos, and mark status
- When internet returns, everything syncs
- The sync log is kept and audited — you can see which rows were added/modified offline and when they synced (for evidentiary purposes if someone disputes the timestamp)

**Why it matters:** Field work in land acquisition happens in remote villages. A system that works offline is the difference between a paper clipboard and a digital one; a system that keeps the sync log proves the officer was actually on-site and when.

---

## Citizen Entitlement Calculator + Legal Transparency

**Most systems:**
- Show a compensation amount
- No idea where it came from

**TN-GLMS:**
- Every compensation breakdown is tied explicitly to the RFCTLARR Act and the section number
- Market value × multiplier (shown) + assets (shown) + solatium (shown) + interest (shown) = total (shown)
- A citizen can click through to the Act itself and see *why* solatium is 100% and not 50%
- Entering a project's key details (area, market rate, multiplier) into the calculator shows the expected outcome before the officer runs it
- The formula is a government-testable policy tool: "if we change the multiplier from 2× to 3×, impact on a 50-hectare project is ₹X"

**Why it matters:** RFCTLARR compensation disputes are the largest class of court cases. A system where the math is transparent and the citizen understands the breakdown before the award is issued cuts disputes and grievances by an order of magnitude.

---

## Real Registration + Credential System (Not Just Demo Logins)

**Most systems:**
- Demo logins only
- Judges cannot register their own account

**TN-GLMS:**
- Demo logins still work (one click)
- A citizen can register with email/mobile (scrypt hashing, real credential flow)
- A government officer can be issued a credential by their department (the admin flow is present)
- This proves it is not a mock; a real system is running underneath

**Why it matters:** At a pitch or a live test, a judge typing in their own email and logging in feels different from clicking a dropdown. The credential system is the proof that it scales to real use.

---

## Bilingual, from the Ground Up (Not Pasted On)

**Most systems:**
- English labels with Tamil pasted underneath
- No real language switch

**TN-GLMS:**
- A real language context that carries through the entire journey
- The calculation steps, the law text, the workflow messages, the error messages are all in both languages
- Tamil text rendering is font-correct across the entire UI, including maps and PDFs
- A Tamil-only speaker can use the system start to finish (if the database is seeded in Tamil, which it is)

**Why it matters:** Tamil Nadu has 70+ million people, 80% of whom speak Tamil better than English. A system that is not usable in Tamil is not viable for the state it is being built in. This is not a feature; it is a requirement for a production system, but it is not common in even large government IT projects.

---

## Gram Sabha Records + Mandatory Community Engagement

**Most systems:**
- No record of community input at all

**TN-GLMS:**
- Every project has a record of *when* gram sabha (village council) consultations happened
- Who attended, what was discussed, and what resolution was passed
- This feeds into the grievance and dispute workflows — a court can see whether the government actually consulted

**Why it matters:** Community engagement is mandated by the Act and is the most-violated requirement. A system that makes it visible and audit-able is a bulwark against legal challenges.

---

## The Storyline: Corruption Detection Through Data Density

The arc of the demo should tell one story:

1. **Land Officer POV:** I can see every parcel in my district, its status, and I can verify it offline and sync when I get internet. ← Offline-first + audit
2. **Judge POV:** I file a grievance about my compensation, and I can see exactly what the calculation was, which section of the Act it came from, and who approved it. ← Entitlement transparency + audit
3. **State Officer POV:** I can see which officers are delaying things, which districts have SLA breaches, and which projects have legal holds. I can also see whether a district marked possessions while a stay order was active (and the system blocked it; they cannot cheat). ← Workflow enforcement + data density
4. **Auditor POV:** I can prove that nothing was changed after the fact, and I can replay any officer's actions in chronological order. ← Audit chain

**The novelty is not one feature. It is the density of the data, the enforceability of the rules, and the transparency of the math.** Other systems have some of these; this one has all of them working together.

---

## The Judge's Litmus Test

Hand them the phone, say "find out what your land is worth and complain about it", and walk away. If they succeed, the system is working. If they get stuck or the calculator gives a number without explaining it, it isn't.

The system should answer:
- "Where is my land?" (map, photo, boundary)
- "What am I owed?" (calculator, legal basis, breakdown)
- "Who decided that?" (audit trail, officer name, date)
- "What if I disagree?" (file a grievance, get a tracking number, track it)
- "When will I know the outcome?" (next scheduled step, which officer, expected date)

All in Tamil.

That is the novelty: a system designed for the citizen's question, not for the officer's workflow. And when the citizen's question is answered, the officer's workflow falls into place.
