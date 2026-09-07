/**
 * Land-record answers — "where is my land and what does the record say".
 *
 * The most demo-relevant category, because the litmus test in NOVELTY.md is
 * handing someone a phone and saying "find out what your land is worth". These
 * answers all end by pointing at a lookup they can actually perform rather than
 * explaining a concept and stopping.
 *
 * The units entry earns its place: a Tamil Nadu record can state an extent in
 * hectares, acres, cents, ares or the `0-84-00` triple, and a citizen who
 * converts wrong concludes the government has recorded the wrong area. That
 * conversion is the single most common false alarm in a compensation dispute.
 */

import type { KnowledgeEntry } from "../types";

export const LAND_RECORD_ENTRIES: KnowledgeEntry[] = [
  {
    id: "land-find-my-parcel",
    category: "land-records",
    question: {
      en: "How do I find my own land in this system?",
      ta: "இந்த அமைப்பில் எனது நிலத்தை எவ்வாறு கண்டுபிடிப்பது?",
    },
    keywords: [
      "find my land", "my parcel", "my land", "search survey number", "where is my land",
      "எனது நிலம்", "கண்டுபிடி", "தேடு", "look up my land", "is my land affected",
      "am i affected", "check my land",
    ],
    answer: {
      en:
        "Enter your survey number, or your patta number, on the Find My Land page. You do not need to know the project name or to log in.\n\nWhat comes back, if your parcel is in an acquisition: the plot drawn on a map with its boundary and any field photographs, its current status, the compensation award broken down line by line with the section of the Act each line comes from, your R&R entitlements and which have been granted, and who approved each of those decisions and when.\n\nFrom there you can file a grievance about any of it, and track one you have already filed. If nothing comes back, your land is not in any acquisition recorded here — which is worth knowing too.",
      ta:
        "உங்கள் நில அளவை எண்ணை அல்லது பட்டா எண்ணை \"எனது நிலம்\" பக்கத்தில் உள்ளிடுங்கள். திட்டப் பெயர் தெரிய வேண்டியதில்லை, உள்நுழையவும் தேவையில்லை.\n\nஉங்கள் நிலம் கையகப்படுத்தலில் இருந்தால் கிடைப்பது: எல்லையுடன் வரைபடத்தில் நிலம், கள புகைப்படங்கள், தற்போதைய நிலை, சட்டப் பிரிவுடன் வரிவரியாக இழப்பீட்டுத் தொகை, உங்கள் மறுவாழ்வு உரிமைகள் மற்றும் எவை வழங்கப்பட்டன, ஒவ்வொரு முடிவையும் யார் எப்போது அனுமதித்தார்.\n\nஅங்கிருந்தே குறை மனு தாக்கல் செய்யலாம். எதுவும் கிடைக்கவில்லை என்றால், உங்கள் நிலம் இங்கே பதிவான எந்தக் கையகப்படுத்தலிலும் இல்லை.",
    },
    links: [{ label: { en: "Find my land", ta: "எனது நிலம்" }, href: "/my-land" }],
    followUps: ["land-survey-number", "comp-how-much", "grv-how-to-file"],
  },
  {
    id: "land-survey-number",
    category: "land-records",
    question: {
      en: "What does a survey number look like?",
      ta: "நில அளவை எண் எப்படி இருக்கும்?",
    },
    keywords: [
      "survey number", "survey no", "format", "subdivision", "142/2b", "s.no",
      "நில அளவை எண்", "எண் வடிவம்", "what is survey number", "sy no", "field number",
      "punja number",
    ],
    answer: {
      en:
        "A base number, then a subdivision, sometimes with a letter: `142/2B`, `87/1`, `205/4A`. The base number is the original survey field; the subdivision is the part of it that is yours after the field was split between holders.\n\nWhen you search, the subdivision matters. `142` and `142/2B` are different plots — the first may be a whole field of several acres held by several families. If you only know the base number, search it anyway and pick your subdivision from the list that comes back, checking the extent against your patta.\n\nThe number is printed on your patta and your chitta, and it is also on any notice you have received about the acquisition.",
      ta:
        "ஒரு அடிப்படை எண், பின் உட்பிரிவு, சில நேரம் எழுத்துடன்: `142/2B`, `87/1`, `205/4A`. அடிப்படை எண் அசல் அளவைப் புலம்; உட்பிரிவு அது பலருக்குப் பிரிக்கப்பட்ட பிறகு உங்களுக்குச் சொந்தமான பகுதி.\n\nதேடும்போது உட்பிரிவு முக்கியம். `142` மற்றும் `142/2B` வேறுவேறு நிலங்கள். அடிப்படை எண் மட்டும் தெரிந்தால் அதைத் தேடி, வரும் பட்டியலிலிருந்து உங்கள் உட்பிரிவைத் தேர்ந்தெடுத்து, பரப்பளவை பட்டாவுடன் ஒப்பிடுங்கள்.\n\nஇந்த எண் உங்கள் பட்டா மற்றும் சிட்டாவில் அச்சிடப்பட்டிருக்கும்.",
    },
    followUps: ["land-find-my-parcel", "land-patta-vs-survey"],
  },
  {
    id: "land-patta-vs-survey",
    category: "land-records",
    question: {
      en: "What is the difference between a patta number and a survey number?",
      ta: "பட்டா எண் மற்றும் நில அளவை எண் இடையே என்ன வேறுபாடு?",
    },
    keywords: [
      "difference", "patta number vs survey", "which number", "patta no",
      "வேறுபாடு", "பட்டா எண்", "confused", "same thing", "two numbers",
    ],
    answer: {
      en:
        "A survey number identifies a piece of *land*. A patta number identifies a *holder's account* — the set of plots one person or family holds in that village.\n\nSo one patta can cover several survey numbers, and one survey number can be split across several pattas after a partition. If you want to know about a specific field, search the survey number. If you want everything held in your name in that village, search the patta number.\n\nThey are printed together on your patta document, which is why they get confused. Either works as a search here; the survey number is the more precise of the two.",
      ta:
        "நில அளவை எண் ஒரு *நிலத்தை* அடையாளப்படுத்துகிறது. பட்டா எண் ஒரு *உரிமையாளரின் கணக்கை* அடையாளப்படுத்துகிறது — அந்தக் கிராமத்தில் ஒருவர் வைத்திருக்கும் நிலங்களின் தொகுப்பு.\n\nஎனவே ஒரு பட்டாவில் பல அளவை எண்கள் இருக்கலாம், ஒரு அளவை எண் பிரிவினைக்குப் பிறகு பல பட்டாக்களில் பிரியலாம். ஒரு குறிப்பிட்ட நிலம் பற்றி அறிய அளவை எண்ணைத் தேடுங்கள்; உங்கள் பெயரில் உள்ள அனைத்தையும் அறிய பட்டா எண்ணைத் தேடுங்கள்.\n\nஇரண்டும் உங்கள் பட்டா ஆவணத்தில் சேர்ந்தே அச்சிடப்படுவதால் குழப்பம் வருகிறது. இங்கே இரண்டிலும் தேடலாம்.",
    },
    followUps: ["land-survey-number", "doc-patta"],
  },
  {
    id: "land-units",
    category: "land-records",
    question: {
      en: "How do I convert between cents, acres and hectares?",
      ta: "சென்ட், ஏக்கர், ஹெக்டேர் இடையே எவ்வாறு மாற்றுவது?",
    },
    keywords: [
      "cent", "cents", "acre", "hectare", "convert", "units", "area", "ares",
      "சென்ட்", "ஏக்கர்", "ஹெக்டேர்", "சதுர மீட்டர்", "square metre", "ground",
      "how much is one cent", "0-84-00", "extent",
    ],
    answer: {
      en:
        "1 hectare = 2.471 acres = 247.1 cents = 100 ares = 10,000 sq m\n1 acre = 100 cents = 0.4047 hectares = 4,047 sq m\n1 cent = 435.6 sq ft = 40.47 sq m\n1 ground (Chennai usage) = 2,400 sq ft = 0.0223 hectares\n\nA chitta may also print an extent as `0-84-00`, which is hectares-ares-square metres: that is 0.84 hectares, or about 2.08 acres.\n\nThis matters more than it sounds. Compensation is computed per hectare, while most people know their land in cents or acres, and a conversion done wrong is the commonest reason someone concludes the wrong extent has been recorded. Before filing a grievance about the area, convert your patta figure to hectares and compare — the calculator on the Compensation page accepts any of these units and shows the conversion it applied.",
      ta:
        "1 ஹெக்டேர் = 2.471 ஏக்கர் = 247.1 சென்ட் = 100 ஆர் = 10,000 சதுர மீட்டர்\n1 ஏக்கர் = 100 சென்ட் = 0.4047 ஹெக்டேர் = 4,047 சதுர மீட்டர்\n1 சென்ட் = 435.6 சதுர அடி = 40.47 சதுர மீட்டர்\n1 கிரவுண்ட் (சென்னை) = 2,400 சதுர அடி = 0.0223 ஹெக்டேர்\n\nசிட்டாவில் `0-84-00` என்று இருக்கலாம் — அது ஹெக்டேர்-ஆர்-சதுர மீட்டர், அதாவது 0.84 ஹெக்டேர் அல்லது சுமார் 2.08 ஏக்கர்.\n\nஇது முக்கியம். இழப்பீடு ஹெக்டேர் அடிப்படையில் கணக்கிடப்படுகிறது, ஆனால் பலருக்கு நிலம் சென்ட் அல்லது ஏக்கரில் தெரியும். தவறான மாற்றமே பரப்பளவு தவறாகப் பதிவாகியுள்ளது என்ற முடிவுக்கு மிகப் பொதுவான காரணம்.",
    },
    links: [{ label: { en: "Compensation calculator", ta: "இழப்பீடு கணக்கிடு" }, href: "/compensation" }],
    followUps: ["comp-how-much", "land-boundary-wrong"],
  },
  {
    id: "land-classification",
    category: "land-records",
    question: {
      en: "What do nanjai, punjai and manavari mean?",
      ta: "நஞ்சை, புஞ்சை, மானாவாரி என்றால் என்ன?",
    },
    keywords: [
      "nanjai", "punjai", "manavari", "classification", "wet land", "dry land",
      "நஞ்சை", "புஞ்சை", "மானாவாரி", "வகைப்பாடு", "land type", "house site",
      "natham", "poramboke", "irrigated",
    ],
    answer: {
      en:
        "The revenue classification of your land, printed on the chitta:\n\n• **Nanjai** — wet land, with assured irrigation. The highest-value agricultural class.\n• **Punjai** — dry land, rain-fed or with limited irrigation.\n• **Manavari** — rain-fed only, typically single-crop.\n• **Natham / house site** — land classified for residential use.\n• **Poramboke** — government land not assigned to a holder, such as a channel, path or grazing land.\n\nIt affects the award, because comparable land is valued against comparable land: nanjai is not compared with punjai in the same village. If your land is irrigated but recorded as punjai, that is a specific and checkable grievance, and it moves the number.\n\nIt also matters legally. Irrigated multi-cropped land has statutory protection under s.10 and can only be acquired in exceptional circumstances, subject to notified limits.",
      ta:
        "சிட்டாவில் அச்சிடப்படும் உங்கள் நிலத்தின் வருவாய் வகைப்பாடு:\n\n• **நஞ்சை** — உறுதியான பாசனமுள்ள ஈரநிலம். அதிக மதிப்புள்ள வேளாண் வகை.\n• **புஞ்சை** — மானாவாரி அல்லது குறைந்த பாசனமுள்ள வறண்ட நிலம்.\n• **மானாவாரி** — மழையை மட்டுமே நம்பிய, பொதுவாக ஒரு பயிர் நிலம்.\n• **நத்தம் / வீட்டுமனை** — குடியிருப்புக்கு வகைப்படுத்தப்பட்ட நிலம்.\n• **புறம்போக்கு** — உரிமையாளருக்கு ஒதுக்கப்படாத அரசு நிலம்.\n\nஇது தொகையைப் பாதிக்கிறது — ஒத்த நிலத்துடன் ஒத்த நிலமே ஒப்பிடப்படும். உங்கள் நிலம் பாசனமுள்ளது ஆனால் புஞ்சையாகப் பதிவாகியிருந்தால், அது துல்லியமான, சரிபார்க்கக்கூடிய குறை.\n\nசட்டப்படியும் முக்கியம் — பாசன பல்பயிர் நிலத்திற்கு பிரிவு 10-இன் கீழ் பாதுகாப்பு உண்டு.",
    },
    basis: "Revenue classification under the Tamil Nadu land records; s.10 — special provision to safeguard food security",
    followUps: ["rights-multi-crop", "comp-market-value", "grv-how-to-file"],
  },
  {
    id: "land-boundary-wrong",
    category: "land-records",
    question: {
      en: "The boundary or the area on the record is wrong. How do I fix it?",
      ta: "பதிவில் உள்ள எல்லை அல்லது பரப்பளவு தவறு. எப்படி சரிசெய்வது?",
    },
    keywords: [
      "boundary wrong", "wrong area", "extent wrong", "less area", "measurement wrong",
      "எல்லை தவறு", "பரப்பளவு தவறு", "அளவு", "map wrong", "my land is bigger",
      "resurvey", "remeasure", "encroached by neighbour",
    ],
    answer: {
      en:
        "First convert both figures to the same unit and compare — a cents-to-hectares slip accounts for most of these before anything else is wrong.\n\nIf they still disagree, file a grievance with your patta extent, the extent recorded here, and the survey number, and ask for a re-measurement. A joint measurement in your presence, with the FMB sketch and the adjoining holders present, is what settles it. You are entitled to be there; do not accept a measurement done without you.\n\nIf the disagreement is about *where the line runs* rather than how much land there is, the FMB sketch is the document that decides it, and the adjoining survey numbers on it are the check: if the neighbour named on the sketch is not the neighbour on the ground, a subdivision has gone wrong at some point and that is the thing to correct.\n\nRaise it before the award if you can. Correcting an extent after the award means reopening the award.",
      ta:
        "முதலில் இரண்டு எண்களையும் ஒரே அலகுக்கு மாற்றி ஒப்பிடுங்கள் — சென்ட்-ஹெக்டேர் மாற்றத் தவறே பெரும்பாலான சந்தேகங்களுக்குக் காரணம்.\n\nஅப்படியும் வேறுபட்டால், பட்டா பரப்பளவு, இங்கே பதிவான பரப்பளவு, அளவை எண்ணுடன் குறை மனு தாக்கல் செய்து மறு அளவீடு கோருங்கள். உங்கள் முன்னிலையில், FMB வரைபடத்துடன், அருகாமை உரிமையாளர்கள் இருக்கும்போது செய்யப்படும் கூட்டு அளவீடே இதைத் தீர்க்கும். நீங்கள் இருக்க உரிமை உண்டு.\n\nதகராறு *எல்லை எங்கே செல்கிறது* என்பதாக இருந்தால், FMB வரைபடமே முடிவு செய்யும்.\n\nமுடிந்தால் தீர்ப்புக்கு முன்பே எழுப்புங்கள். தீர்ப்புக்குப் பின் பரப்பளவு திருத்த வேண்டுமெனில் தீர்ப்பையே மீண்டும் திறக்க வேண்டும்.",
    },
    basis: "s.12 — power to enter and survey; s.20 — land to be marked out, measured and planned",
    links: [{ label: { en: "File a grievance", ta: "குறை தாக்கல்" }, href: "/grievances" }],
    followUps: ["doc-fmb", "land-units", "poss-verification-visit"],
  },
  {
    id: "land-joint-owners",
    category: "land-records",
    question: {
      en: "The record shows the wrong owner name. What do I do?",
      ta: "பதிவில் தவறான உரிமையாளர் பெயர் உள்ளது. என்ன செய்வது?",
    },
    keywords: [
      "wrong name", "owner name", "name mistake", "spelling", "not my name",
      "தவறான பெயர்", "பெயர் மாற்றம்", "mutation", "name transfer", "sold to me",
      "bought this land", "previous owner",
    ],
    answer: {
      en:
        "It depends which kind of wrong it is, and the two need different things:\n\n• **A spelling or initial error** on the right person — a correction request at the taluk office, with your identity document. Quick, and it does not affect your entitlement in the meantime.\n• **The previous owner still named** after you bought the land — this is a pending mutation. Produce the registered sale deed and apply for transfer of the patta. Until then the record names them, and an award paid on that record goes to them, which is the problem.\n\nEither way, file a grievance here as well as applying for the correction, so the fact is on the acquisition file with a date. An award that has already been passed in the wrong name has to be reopened for apportionment, which takes far longer than fixing the record before it.",
      ta:
        "எந்த வகையான தவறு என்பதைப் பொறுத்தது:\n\n• **எழுத்துப் பிழை அல்லது முதலெழுத்துத் தவறு** — வட்டாட்சியர் அலுவலகத்தில் அடையாள ஆவணத்துடன் திருத்தக் கோரிக்கை. விரைவானது.\n• **நீங்கள் வாங்கிய பிறகும் பழைய உரிமையாளர் பெயர்** — இது நிலுவையில் உள்ள பட்டா மாற்றம். பதிவான விற்பனைப் பத்திரத்தைச் சமர்ப்பித்து பட்டா மாற்றத்திற்கு விண்ணப்பியுங்கள். அதுவரை பதிவு அவர்கள் பெயரிலேயே இருக்கும், தொகையும் அவர்களுக்கே செல்லும்.\n\nஎப்படியிருந்தாலும், திருத்தத்திற்கு விண்ணப்பிப்பதுடன் இங்கேயும் குறை மனு தாக்கல் செய்யுங்கள் — உண்மை தேதியுடன் கோப்பில் பதிவாகும்.",
    },
    followUps: ["comp-joint-owners", "doc-patta", "grv-how-to-file"],
  },
  {
    id: "land-partly-affected",
    category: "land-records",
    question: {
      en: "How do I know how much of my land is being taken?",
      ta: "எனது நிலத்தில் எவ்வளவு எடுக்கப்படுகிறது என்று எப்படி அறிவது?",
    },
    keywords: [
      "how much taken", "part of my land", "which portion", "affected extent",
      "எவ்வளவு எடுக்கிறார்கள்", "எந்தப் பகுதி", "alignment", "impact", "inside project",
      "buffer", "will my house go",
    ],
    answer: {
      en:
        "Open your parcel on the map. The project alignment and its impact zone are drawn over the plot boundaries, so you can see which part of your field falls inside it and which does not, and the affected extent is stated as a figure alongside.\n\nField verification photographs, geo-tagged at the time they were taken, are attached to the parcel record — so you can see what the officer saw when the extent was fixed, and when they were there.\n\nIf the drawn extent does not match what you were told at the enumeration, that discrepancy is exactly what a grievance is for. And if the part left over would be unworkable, say so: the loss in value of the remainder is separately compensable, and you can ask for the whole holding to be acquired instead.",
      ta:
        "வரைபடத்தில் உங்கள் நிலத்தைத் திறங்கள். திட்டத்தின் வழித்தடமும் அதன் தாக்க வரம்பும் நிலத்தின் எல்லைகள் மேல் வரையப்பட்டிருக்கும் — உங்கள் நிலத்தின் எந்தப் பகுதி அதனுள் வருகிறது என்று பார்க்கலாம், பாதிக்கப்படும் பரப்பளவும் எண்ணாகக் காட்டப்படும்.\n\nகள சரிபார்ப்பின் போது எடுக்கப்பட்ட, இடம் குறிக்கப்பட்ட புகைப்படங்கள் நிலப் பதிவில் இணைக்கப்பட்டிருக்கும் — அதிகாரி எப்போது வந்தார், என்ன பார்த்தார் என்பதைக் காணலாம்.\n\nவரையப்பட்ட பரப்பளவு கணக்கெடுப்பில் சொன்னதுடன் பொருந்தவில்லை என்றால், அதற்காகவே குறை மனு உள்ளது. மீதி நிலம் பயனற்றதாகிவிடும் என்றால் அதைத் தெரிவியுங்கள்.",
    },
    followUps: ["comp-partial-land", "land-boundary-wrong", "poss-verification-visit"],
  },
];
