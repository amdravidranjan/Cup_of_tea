/**
 * Possession and land-use answers.
 *
 * The stage at which the abstract becomes physical, and where the questions
 * stop being about entitlement and start being about next week: can I harvest,
 * can I keep living here, when do they come. So these answers are practical
 * first and cite the section second.
 *
 * The encroachment entry is the one to be careful with. The module behind it is
 * a seeded heuristic, not a change-detection model over live satellite imagery,
 * and the answer says so — a citizen must not be led to believe a machine has
 * looked at their land and concluded something about it.
 */

import type { KnowledgeEntry } from "../types";

export const POSSESSION_ENTRIES: KnowledgeEntry[] = [
  {
    id: "poss-when-taken",
    category: "possession",
    question: {
      en: "When can the government actually take my land?",
      ta: "அரசு எப்போது எனது நிலத்தை எடுக்க முடியும்?",
    },
    keywords: [
      "when taken", "possession", "take my land", "vacate", "handover", "eviction",
      "கையகப்படுத்தல்", "எப்போது எடுப்பார்கள்", "காலி செய்ய", "when do i leave",
      "how long do i have", "section 38",
    ],
    answer: {
      en:
        "Only after the full compensation has been paid to you, and after your R&R entitlements have been provided. That order is the law, not a convention: no family may be displaced before both are done.\n\nThe one exception is the urgency provision, where 80% of the estimated compensation must be paid before possession and the rest follows on the award.\n\nSo if you have not been paid and possession is being pressed, the sequence has been broken. This portal blocks it at the source rather than relying on anyone's good behaviour: an officer cannot mark a parcel possessed while the payment is unrecorded, the attempt is refused with the reason shown on screen, and the refused attempt is itself written to the audit trail. That last part matters — the record of the attempt survives.",
      ta:
        "முழு இழப்பீடு உங்களுக்கு வழங்கப்பட்ட பிறகும், உங்கள் மறுவாழ்வு உரிமைகள் நிறைவேற்றப்பட்ட பிறகும் மட்டுமே. இந்த வரிசை சட்டம், வழக்கம் அல்ல: இரண்டும் முடியாமல் எந்தக் குடும்பமும் இடம்பெயர்க்கப்படக் கூடாது.\n\nஒரே விதிவிலக்கு அவசர விதி — மதிப்பிடப்பட்ட இழப்பீட்டின் 80% கையகப்படுத்துவதற்கு முன் வழங்கப்பட வேண்டும்.\n\nஎனவே பணம் வராமல் நிலம் கோரப்பட்டால், வரிசை மீறப்பட்டுள்ளது. இந்த அமைப்பு அதை மூலத்திலேயே தடுக்கிறது: பணம் பதிவாகாமல் அதிகாரி நிலத்தைக் கையகப்படுத்தியதாகக் குறிக்க முடியாது, முயற்சி காரணத்துடன் மறுக்கப்படும், அந்த முயற்சியும் தணிக்கைப் பதிவில் எழுதப்படும்.",
    },
    basis: "s.38(1) — possession only after full payment and provision of R&R entitlements; s.40(3) — urgency",
    followUps: ["poss-notice-first", "comp-when-paid", "rr-when"],
  },
  {
    id: "poss-notice-first",
    category: "possession",
    question: {
      en: "Will I be told before possession is taken?",
      ta: "கையகப்படுத்துவதற்கு முன் எனக்குத் தெரிவிக்கப்படுமா?",
    },
    keywords: [
      "notice before", "will they inform", "warning", "how much notice",
      "அறிவிப்பு", "முன்பே தெரிவிப்பார்களா", "surprise", "came without notice",
      "notice period", "postal notice",
    ],
    answer: {
      en:
        "Yes. Notice must be given to the interested persons, and possession cannot lawfully be a surprise.\n\nWhat this portal adds is a check on whether the notice actually went out. Notification is logged as a record with a channel and a date — postal, SMS, email or voice — and when an officer marks a parcel possessed, the workflow checks for a logged notification against that parcel first. If there is none, the officer is warned and prompted to log one before proceeding, and the possession record is stored with the notification id linked to it.\n\nSo \"I was never told\" becomes a checkable statement rather than an argument. Look at the notification log on the Track page: it shows what was despatched, to which address, on what date, and its delivery status. If nothing was sent, that fact is on the government's own record.",
      ta:
        "ஆம். சம்பந்தப்பட்டவர்களுக்கு அறிவிப்பு வழங்கப்பட வேண்டும்; கையகப்படுத்தல் திடுக்கிடும் நிகழ்வாக இருக்க முடியாது.\n\nஇந்த வலைதளம் அறிவிப்பு உண்மையில் அனுப்பப்பட்டதா என்பதைச் சரிபார்க்கிறது. அறிவிப்பு ஒரு பதிவாக, சேனல் மற்றும் தேதியுடன் சேமிக்கப்படுகிறது — தபால், SMS, மின்னஞ்சல் அல்லது குரல். அதிகாரி நிலத்தைக் கையகப்படுத்தியதாகக் குறிக்கும்போது, அந்த நிலத்திற்கு அறிவிப்பு பதிவாகியுள்ளதா என்று சரிபார்க்கப்படும். இல்லையெனில் எச்சரிக்கப்படுவார்.\n\nஎனவே \"எனக்குத் தெரிவிக்கப்படவில்லை\" என்பது வாதம் அல்ல, சரிபார்க்கக்கூடிய கூற்று. Track பக்கத்தில் அறிவிப்புப் பட்டியலைப் பாருங்கள்.",
    },
    basis: "s.21 (notice to persons interested); s.38 (procedure for taking possession)",
    followUps: ["doc-notice-not-received", "poss-when-taken", "grv-track"],
  },
  {
    id: "poss-still-farming",
    category: "possession",
    question: {
      en: "Can I keep farming until possession is taken?",
      ta: "கையகப்படுத்தும் வரை சாகுபடி செய்யலாமா?",
    },
    keywords: [
      "keep farming", "continue cultivation", "can i sow", "use my land",
      "சாகுபடி", "பயிரிடலாமா", "still my land", "until possession", "meanwhile",
      "can i live there",
    ],
    answer: {
      en:
        "Yes. Until possession is lawfully taken the land is still yours and you may continue to use it — live on it, cultivate it, harvest it. Notification restricts *transferring* the land, not using it.\n\nTwo cautions. Do not put up new construction or plant a new orchard after the notification expecting it to be compensated; assets are valued as at the enumeration, and additions made afterwards can be treated as made in anticipation of the award. And if you sow a crop that will not be harvested before possession, raise it in writing beforehand — standing crops are compensable, but the claim is far easier when it was flagged in advance than when it is made over a bulldozer.",
      ta:
        "ஆம். சட்டப்படி கையகப்படுத்தப்படும் வரை நிலம் உங்களுடையது; அதில் வாழலாம், சாகுபடி செய்யலாம், அறுவடை செய்யலாம். அறிவிப்பு நிலத்தை *மாற்றுவதைத்* தடுக்கிறது, பயன்படுத்துவதை அல்ல.\n\nஇரண்டு எச்சரிக்கைகள். அறிவிப்புக்குப் பிறகு புதிய கட்டிடம் கட்டவோ புதிய தோட்டம் அமைக்கவோ வேண்டாம் — சொத்துகள் கணக்கெடுப்பின் போது இருந்த நிலையிலேயே மதிப்பிடப்படும். கையகப்படுத்துவதற்கு முன் அறுவடைக்கு வராத பயிரை விதைத்தால், முன்பே எழுத்துப்பூர்வமாகத் தெரிவியுங்கள்.",
    },
    basis: "s.11(4) — bar on transactions after notification; s.29 — valuation of assets including standing crops",
    followUps: ["poss-crops", "comp-trees-wells", "poss-when-taken"],
  },
  {
    id: "poss-crops",
    category: "possession",
    question: {
      en: "What about the crop standing in my field?",
      ta: "எனது நிலத்தில் நின்றுள்ள பயிருக்கு என்ன?",
    },
    keywords: [
      "crop", "standing crop", "harvest", "paddy", "sugarcane", "banana",
      "பயிர்", "அறுவடை", "நின்ற பயிர்", "before harvest", "crop loss",
      "season", "they came before harvest",
    ],
    answer: {
      en:
        "Standing crops are valued and compensated as assets attached to the land, added to the award before solatium is applied — so the crop value is effectively doubled in the final figure.\n\nIn practice, the better outcome is usually to be allowed to harvest. Ask for possession to be timed after the harvest and put the request in writing with the crop and its expected harvest date; a request on the file with a date is what gets scheduled around, and it costs the project nothing to wait a few weeks where the alignment is not yet under construction.\n\nIf a crop is destroyed without being valued, that is a compensable loss and a straightforward grievance — photograph the field, with a date, before anything happens to it.",
      ta:
        "நின்ற பயிர்கள் நிலத்துடன் இணைந்த சொத்துகளாக மதிப்பிடப்பட்டு இழப்பீடு வழங்கப்படும், ஆறுதல் தொகைக்கு முன் சேர்க்கப்படுவதால் பயிரின் மதிப்பு இறுதி எண்ணில் இரட்டிப்பாகிறது.\n\nநடைமுறையில், அறுவடை செய்ய அனுமதிக்கப்படுவதே நல்லது. அறுவடைக்குப் பின் கையகப்படுத்தக் கோரி, பயிர் மற்றும் எதிர்பார்க்கப்படும் அறுவடைத் தேதியுடன் எழுத்துப்பூர்வமாகக் கோரிக்கை அளியுங்கள்.\n\nமதிப்பிடப்படாமல் பயிர் அழிக்கப்பட்டால் அது இழப்பீட்டுக்கு உரிய இழப்பு — எதுவும் நடப்பதற்கு முன் நிலத்தை தேதியுடன் புகைப்படம் எடுத்து வையுங்கள்.",
    },
    basis: "s.29 — value of assets attached to the land",
    followUps: ["comp-trees-wells", "poss-still-farming", "grv-how-to-file"],
  },
  {
    id: "poss-structures",
    category: "possession",
    question: {
      en: "My house is on the land. When do I have to move out?",
      ta: "எனது வீடு அந்த நிலத்தில் உள்ளது. எப்போது வெளியேற வேண்டும்?",
    },
    keywords: [
      "house", "move out", "vacate", "demolish", "shift", "relocate",
      "வீடு", "வெளியேற", "இடம் மாற", "when to shift", "where do i go",
      "demolition", "building",
    ],
    answer: {
      en:
        "Not until your compensation has been paid and your R&R entitlements — including the housing unit, or the payment in lieu of it — have actually been provided. Displacement before that is unlawful, and the housing entitlement is not satisfied by a promise of a house.\n\nThe structure itself is valued separately from the land as an asset, and that value is added before solatium is calculated.\n\nBefore you move: get the resettlement allotment in writing, check on the project's Infrastructure tab which amenities at the resettlement site are actually complete rather than planned, and confirm the subsistence grant has started — it runs for twelve months from displacement and it is meant to cover exactly this period.",
      ta:
        "உங்கள் இழப்பீடு வழங்கப்பட்டு, மறுவாழ்வு உரிமைகள் — வீடு அல்லது அதற்குப் பதிலான தொகை உட்பட — உண்மையில் நிறைவேற்றப்படும் வரை இல்லை. அதற்கு முன் இடம்பெயர்ப்பது சட்டவிரோதம்; வீடு தருவோம் என்ற வாக்குறுதி வீட்டு உரிமையை நிறைவேற்றாது.\n\nகட்டிடம் நிலத்திலிருந்து தனியாக சொத்தாக மதிப்பிடப்படும், அந்த மதிப்பு ஆறுதல் தொகைக்கு முன் சேர்க்கப்படும்.\n\nஇடம் மாறும் முன்: மீள்குடியேற்ற ஒதுக்கீட்டை எழுத்துப்பூர்வமாகப் பெறுங்கள், மீள்குடியேற்ற இடத்தில் எந்த வசதிகள் உண்மையில் முடிந்துள்ளன என்று உள்கட்டமைப்பு பக்கத்தில் சரிபாருங்கள், வாழ்வாதார உதவித்தொகை தொடங்கியுள்ளதா என்று உறுதி செய்யுங்கள்.",
    },
    basis: "s.38(1); Second Schedule items 1 and 5; s.29",
    followUps: ["rr-housing", "rr-subsistence", "poss-when-taken"],
  },
  {
    id: "poss-verification-visit",
    category: "possession",
    question: {
      en: "An officer came to my field with a phone. What was that?",
      ta: "ஒரு அதிகாரி கைபேசியுடன் எனது நிலத்திற்கு வந்தார். அது என்ன?",
    },
    keywords: [
      "officer visit", "field verification", "photo of my land", "gps", "survey visit",
      "கள சரிபார்ப்பு", "அதிகாரி வந்தார்", "photograph", "geo tag", "measurement visit",
      "who came", "what were they doing",
    ],
    answer: {
      en:
        "Field verification. The officer confirms on the ground what the record says — the boundary, the classification, what is standing on the land — and photographs it. The photographs are geo-tagged and timestamped, so the record shows not just what was seen but where the officer was standing and when.\n\nIt works without a mobile signal, which is why it is done on a phone: the parcel list, the boundaries and the photographs are held locally and sync when the officer is back in coverage, and the sync log keeps both timestamps. If anyone later disputes whether a visit happened or when, that log is the evidence.\n\nYou are entitled to see what was recorded about your parcel. Search your survey number on the Find My Land page and the verification photographs, the status, the officer's name and the date are all there. If what is recorded does not match what is on your land, that is a specific grievance with a photograph attached to it already.",
      ta:
        "கள சரிபார்ப்பு. பதிவில் உள்ளதை அதிகாரி தரையில் உறுதிப்படுத்துகிறார் — எல்லை, வகைப்பாடு, நிலத்தில் உள்ளவை — மேலும் புகைப்படம் எடுக்கிறார். புகைப்படங்களில் இடம் மற்றும் நேரம் பதிவாகும், எனவே அதிகாரி எங்கே நின்றார், எப்போது என்பதும் பதிவாகும்.\n\nகைபேசி சிக்னல் இல்லாமலும் இது வேலை செய்யும் — நிலப் பட்டியல், எல்லைகள், புகைப்படங்கள் உள்ளூரிலேயே சேமிக்கப்பட்டு, சிக்னல் வந்தபின் ஒத்திசைக்கப்படும். ஒத்திசைவுப் பதிவு இரண்டு நேரங்களையும் வைத்திருக்கும்.\n\nஉங்கள் நிலம் பற்றி என்ன பதிவானது என்று பார்க்க உங்களுக்கு உரிமை உண்டு. \"எனது நிலம்\" பக்கத்தில் அளவை எண்ணைத் தேடுங்கள் — புகைப்படங்கள், நிலை, அதிகாரியின் பெயர், தேதி அனைத்தும் இருக்கும்.",
    },
    links: [{ label: { en: "Find my land", ta: "எனது நிலம்" }, href: "/my-land" }],
    followUps: ["land-boundary-wrong", "sys-audit-trail", "land-partly-affected"],
  },
  {
    id: "poss-encroachment",
    category: "possession",
    question: {
      en: "What is encroachment monitoring?",
      ta: "ஆக்கிரமிப்பு கண்காணிப்பு என்றால் என்ன?",
    },
    keywords: [
      "encroachment", "monitoring", "satellite", "someone occupied", "illegal occupation",
      "ஆக்கிரமிப்பு", "கண்காணிப்பு", "செயற்கைக்கோள்", "trespass", "built on my land",
      "government land occupied",
    ],
    answer: {
      en:
        "It is a review list for land the government has already taken possession of, flagging parcels that look like they need a field visit — a structure or a boundary change that was not there when possession was recorded.\n\nBe clear about what is behind it, because the label oversells it: there is no live satellite feed and no trained change-detection model in this system. What produces the list is a deterministic check over signals the platform already holds — the parcel's status, how long ago possession was taken, whether it sits inside the active construction impact zone — seeded so the same parcel gives the same result every time rather than a different one on each reload.\n\nSo a flag is a prompt to send someone to look, never a finding. Nothing follows from it against any person until an officer has verified it on the ground and recorded what they found. If your parcel appears on it and should not, a field visit is the remedy and a grievance is how you ask for one.",
      ta:
        "அரசு ஏற்கனவே கையகப்படுத்திய நிலங்களுக்கான ஒரு பரிசீலனைப் பட்டியல் — கள வருகை தேவைப்படும் நிலங்களைக் குறிக்கிறது; கையகப்படுத்தும்போது இல்லாத கட்டிடம் அல்லது எல்லை மாற்றம்.\n\nஇதன் உண்மையான தன்மையைத் தெளிவாகச் சொல்கிறோம்: இந்த அமைப்பில் நேரலை செயற்கைக்கோள் தரவு இல்லை, பயிற்றுவிக்கப்பட்ட மாற்றம்-கண்டறியும் மாதிரியும் இல்லை. பட்டியலை உருவாக்குவது, அமைப்பில் ஏற்கனவே உள்ள தகவல்கள் மீதான ஒரு நிலையான சரிபார்ப்பு — நிலத்தின் நிலை, கையகப்படுத்தி எவ்வளவு காலம், கட்டுமான தாக்க வரம்பினுள் உள்ளதா. ஒவ்வொரு முறையும் ஒரே முடிவு வரும்படி அமைக்கப்பட்டுள்ளது.\n\nஎனவே ஒரு குறியீடு \"போய்ப் பாருங்கள்\" என்ற அறிவுறுத்தல் மட்டுமே, முடிவு அல்ல. அதிகாரி தரையில் சரிபார்த்துப் பதிவு செய்யாமல் எவருக்கும் எதிராக எதுவும் நடக்காது.",
    },
    followUps: ["sys-ai-explain", "poss-land-bank", "grv-how-to-file"],
  },
  {
    id: "poss-land-bank",
    category: "possession",
    question: {
      en: "What is the land bank?",
      ta: "நில வங்கி என்றால் என்ன?",
    },
    keywords: [
      "land bank", "idle land", "unused parcels", "repurpose", "நில வங்கி",
      "காலி நிலம்", "vacant government land", "reallocate", "what happens to extra land",
    ],
    answer: {
      en:
        "A register of acquired land that is sitting idle — not being used for the purpose it was taken for. Each entry records the parcel, when it fell idle, why it was flagged, its review status, and what has been decided about it.\n\nIt exists because of s.101: land unutilised for five years from the date of taking over is to be returned to the original owner or their heirs, or transferred to the State's land bank. Keeping the register visible is what makes that provision checkable rather than theoretical — an idle parcel with a date on it is a question someone has to answer.\n\nIt also serves the other direction. Before acquiring fresh land, an officer can look at what the government already holds unused nearby, which is exactly the argument a s.15 objection makes when it says other land is available.",
      ta:
        "கையகப்படுத்தப்பட்டு பயன்படுத்தப்படாமல் உள்ள நிலங்களின் பதிவேடு — எடுக்கப்பட்ட நோக்கத்திற்கு பயன்படுத்தப்படாதவை. ஒவ்வொரு பதிவும் நிலம், எப்போது காலியானது, எதற்காகக் குறிக்கப்பட்டது, பரிசீலனை நிலை, என்ன முடிவு எடுக்கப்பட்டது என்பதைப் பதிவு செய்கிறது.\n\nபிரிவு 101 காரணமாக இது உள்ளது: எடுத்துக்கொண்ட நாளிலிருந்து ஐந்து ஆண்டுகள் பயன்படுத்தப்படாத நிலம் அசல் உரிமையாளர்/வாரிசுகளுக்கு அல்லது மாநில நில வங்கிக்குச் செல்ல வேண்டும். பதிவேட்டைத் தெரியும்படி வைப்பதே அந்த விதியைச் சரிபார்க்கக்கூடியதாக ஆக்குகிறது.\n\nமறுபுறமும் பயன்படுகிறது — புதிய நிலம் எடுப்பதற்கு முன், அரசு ஏற்கனவே அருகில் என்ன வைத்திருக்கிறது என்று பார்க்கலாம்.",
    },
    basis: "s.101 — return of unutilised land; s.99 — no change of purpose",
    followUps: ["rights-unused-land", "grv-object-acquisition"],
  },
];
