/**
 * Compensation answers.
 *
 * This is the category that decides whether the assistant is useful, because
 * "how much do I get and who decided that" is the question the whole portal
 * exists to answer, and it is the largest class of land-acquisition litigation
 * in the country. Every number below names its section so a citizen can check
 * it against the Act rather than take the portal's word for it.
 */

import type { KnowledgeEntry } from "../types";

export const COMPENSATION_ENTRIES: KnowledgeEntry[] = [
  {
    id: "comp-how-much",
    category: "compensation",
    question: {
      en: "How much compensation will I get for my land?",
      ta: "எனது நிலத்திற்கு எவ்வளவு இழப்பீடு கிடைக்கும்?",
    },
    keywords: [
      "how much", "how much money", "amount", "my compensation", "what will i get",
      "value of my land", "land value", "ilappeedu", "evvalavu", "எவ்வளவு", "இழப்பீடு",
      "பணம்", "தொகை", "payment amount", "award amount", "money for land",
    ],
    answer: {
      en:
        "It depends on four things: the extent of your land, the market value fixed for your village, the First Schedule multiplier for your area, and the value of anything standing on the land — trees, wells, a house. Those are added, then solatium of the same amount again is added, then 12% interest for the time since the process began.\n\nFor a concrete figure, open the Compensation page and use the calculator: enter your extent and your village's rate and it shows every line of the working. If your parcel is already in the system, search your survey number on the Find My Land page and the actual award for your parcel is shown, line by line, with the officer who approved it.",
      ta:
        "நான்கு விஷயங்களைப் பொறுத்தது: உங்கள் நிலத்தின் பரப்பளவு, உங்கள் கிராமத்திற்கு நிர்ணயிக்கப்பட்ட சந்தை மதிப்பு, உங்கள் பகுதிக்கான பெருக்கல் காரணி, மற்றும் நிலத்தில் உள்ள மரங்கள், கிணறு, வீடு போன்றவற்றின் மதிப்பு. இவை கூட்டப்பட்டு, அதே தொகை மீண்டும் ஆறுதல் தொகையாக (சொலேஷியம்) சேர்க்கப்படும், பின்னர் 12% வட்டி சேர்க்கப்படும்.\n\nதுல்லியமான தொகைக்கு, இழப்பீடு பக்கத்தில் உள்ள கணக்கிடும் கருவியைப் பயன்படுத்துங்கள். உங்கள் நிலம் ஏற்கனவே பதிவாகியிருந்தால், நில அளவை எண்ணைத் தேடினால் உங்கள் சொந்த தொகை வரிவரியாகக் காட்டப்படும்.",
    },
    basis: "RFCTLARR Act 2013, ss.26–30 and the First Schedule",
    links: [
      { label: { en: "Compensation calculator", ta: "இழப்பீடு கணக்கிடு" }, href: "/compensation" },
      { label: { en: "Find my land", ta: "எனது நிலம்" }, href: "/my-land" },
    ],
    followUps: ["comp-formula", "comp-market-value", "comp-disagree"],
  },
  {
    id: "comp-formula",
    category: "compensation",
    question: {
      en: "What exactly is the compensation formula?",
      ta: "இழப்பீடு கணக்கிடும் சூத்திரம் என்ன?",
    },
    keywords: [
      "formula", "calculation", "how is it calculated", "how calculated", "breakdown",
      "working", "arithmetic", "compute", "கணக்கு", "சூத்திரம்", "எப்படி கணக்கிடுகிறார்கள்",
      "calculate compensation", "award calculation",
    ],
    answer: {
      en:
        "Market value = extent in hectares × the rate per hectare notified for your village.\nMultiplied market value = market value × the First Schedule factor (1× in urban areas, up to 4× in the most rural, as notified by the State).\nAssets = the assessed value of trees, wells, structures and standing crops on the land.\nSolatium = 100% of (multiplied market value + assets).\nInterest = 12% per annum on the market value, for the period from the initial notification to the award.\n\nTotal award = multiplied market value + assets + solatium + interest.\n\nThe portal shows all six lines for every award. If any line is blank on your award, that is a question worth raising in a grievance.",
      ta:
        "சந்தை மதிப்பு = ஹெக்டேரில் பரப்பளவு × கிராமத்திற்கு அறிவிக்கப்பட்ட ஹெக்டேர் விலை.\nபெருக்கிய சந்தை மதிப்பு = சந்தை மதிப்பு × முதல் அட்டவணை காரணி (நகரில் 1×, கிராமப்புறத்தில் 4× வரை).\nசொத்துகள் = மரங்கள், கிணறுகள், கட்டிடங்கள், நின்ற பயிர்களின் மதிப்பு.\nஆறுதல் தொகை = (பெருக்கிய சந்தை மதிப்பு + சொத்துகள்) × 100%.\nவட்டி = சந்தை மதிப்பு மீது ஆண்டுக்கு 12%, அறிவிப்பு முதல் தீர்ப்பு வரை.\n\nமொத்தம் = பெருக்கிய சந்தை மதிப்பு + சொத்துகள் + ஆறுதல் தொகை + வட்டி.\n\nஒவ்வொரு தீர்ப்பிலும் இந்த ஆறு வரிகளும் இந்த வலைதளத்தில் காட்டப்படும்.",
    },
    basis: "ss.26 (market value), 29 (assets), 30(1) (solatium), 30(3) (interest); First Schedule",
    links: [{ label: { en: "See a worked example", ta: "எடுத்துக்காட்டு" }, href: "/compensation" }],
    followUps: ["comp-solatium", "comp-interest", "comp-multiplier"],
  },
  {
    id: "comp-solatium",
    category: "compensation",
    question: { en: "What is solatium and why is it 100%?", ta: "ஆறுதல் தொகை என்றால் என்ன? ஏன் 100%?" },
    keywords: [
      "solatium", "solacium", "100%", "hundred percent", "extra amount", "double",
      "ஆறுதல்", "சொலேஷியம்", "why double", "twice", "why so much",
    ],
    answer: {
      en:
        "Solatium is compensation for the fact that you did not choose to sell. It recognises the disturbance of being made to give up land, separately from the land's price.\n\nUnder the 1894 Act it was 30%. The 2013 Act raised it to 100% of the market value plus assets — so that component alone doubles the award. It is a statutory minimum, not a discretionary payment: no officer can reduce it, and you do not have to ask for it.",
      ta:
        "ஆறுதல் தொகை என்பது நீங்கள் விற்க விரும்பாத நிலத்தை விட்டுக்கொடுக்க வேண்டியிருந்ததற்கான இழப்பீடு. நிலத்தின் விலைக்கு அப்பால், இடம்பெயர்வின் துன்பத்திற்கு வழங்கப்படுகிறது.\n\n1894 சட்டத்தில் இது 30% மட்டுமே. 2013 சட்டம் அதை 100% ஆக உயர்த்தியது — அதாவது தொகை இரட்டிப்பாகிறது. இது சட்டப்படி குறைந்தபட்ச உரிமை; எந்த அதிகாரியும் குறைக்க முடியாது, நீங்கள் கேட்கவும் தேவையில்லை.",
    },
    basis: "s.30(1) — solatium equal to 100% of the compensation amount",
    followUps: ["comp-formula", "comp-interest"],
  },
  {
    id: "comp-multiplier",
    category: "compensation",
    question: {
      en: "What is the multiplier and how is mine decided?",
      ta: "பெருக்கல் காரணி என்றால் என்ன? எனக்கு எது பொருந்தும்?",
    },
    keywords: [
      "multiplier", "factor", "first schedule", "2x", "3x", "4x", "rural factor",
      "urban factor", "பெருக்கல்", "காரணி", "why 2 times", "multiply",
    ],
    answer: {
      en:
        "The First Schedule multiplies the market value by a factor set by how far your land is from an urban area. In urban areas it is 1×. In rural areas the State Government notifies a factor, sliding with distance from the nearest town — the further out, the higher, up to 4× in the most remote blocks.\n\nThe reason is that a rural guideline value understates what land is worth to the person farming it, and the further from a town, the greater that understatement. Your project page shows the factor applied to your parcel and the district it was notified for. If the factor looks wrong for your village, that is a specific, answerable grievance.",
      ta:
        "முதல் அட்டவணை, உங்கள் நிலம் நகரத்திலிருந்து எவ்வளவு தூரம் என்பதைப் பொறுத்து சந்தை மதிப்பைப் பெருக்குகிறது. நகரப் பகுதியில் 1×. கிராமப் பகுதியில் மாநில அரசு அறிவிக்கும் காரணி — நகரத்திலிருந்து தூரம் அதிகரிக்க காரணியும் அதிகரிக்கும், தொலைதூரப் பகுதிகளில் 4× வரை.\n\nகிராமப்புற வழிகாட்டி மதிப்பு உண்மையான மதிப்பைக் குறைத்துக் காட்டுகிறது என்பதே காரணம். உங்கள் நிலத்திற்குப் பயன்படுத்தப்பட்ட காரணி திட்டப் பக்கத்தில் காட்டப்படும்.",
    },
    basis: "First Schedule, read with s.26(2)",
    followUps: ["comp-formula", "comp-market-value", "grv-how-to-file"],
  },
  {
    id: "comp-market-value",
    category: "compensation",
    question: {
      en: "How is the market value of my land decided?",
      ta: "எனது நிலத்தின் சந்தை மதிப்பு எவ்வாறு நிர்ணயிக்கப்படுகிறது?",
    },
    keywords: [
      "market value", "guideline value", "sale deed", "how do they decide rate",
      "rate per hectare", "rate fixed", "சந்தை மதிப்பு", "வழிகாட்டி மதிப்பு",
      "valuation", "who fixes the rate", "guideline",
    ],
    answer: {
      en:
        "The Collector must take the *highest* of three figures, not the lowest and not an average:\n\n1. The guideline value — the minimum land value fixed for registration in your area under the Stamp Act.\n2. The average sale price of the top 50% of registered sale deeds for similar land in the nearest village, over the preceding three years.\n3. Any amount consented to for a private negotiated purchase for the same project.\n\nThat highest figure is the market value, and the multiplier is then applied to it. If you know of sale deeds in your village at a higher rate than the one used, produce them — the second test exists exactly for that, and a grievance citing specific deeds is the strongest kind.",
      ta:
        "ஆட்சியர் மூன்று எண்களில் *அதிகபட்சத்தை* எடுக்க வேண்டும் — சராசரியை அல்ல, குறைந்ததை அல்ல:\n\n1. வழிகாட்டி மதிப்பு — பத்திரப் பதிவுக்காக நிர்ணயிக்கப்பட்ட குறைந்தபட்ச மதிப்பு.\n2. அருகிலுள்ள கிராமத்தில் கடந்த மூன்று ஆண்டுகளில் பதிவான, ஒத்த நிலத்தின் விற்பனைப் பத்திரங்களில் மேல் 50%-இன் சராசரி விலை.\n3. அதே திட்டத்திற்கு தனியார் பேச்சுவார்த்தை மூலம் ஒப்புக்கொள்ளப்பட்ட தொகை.\n\nஉங்கள் கிராமத்தில் அதிக விலையில் விற்பனைப் பத்திரங்கள் இருந்தால் அவற்றை சமர்ப்பியுங்கள் — இரண்டாவது சோதனை அதற்காகவே உள்ளது.",
    },
    basis: "s.26(1) — the higher of the guideline value, the top-50% sale-deed average, or a consented amount",
    followUps: ["comp-disagree", "doc-ec", "grv-how-to-file"],
  },
  {
    id: "comp-interest",
    category: "compensation",
    question: {
      en: "Do I get interest, and from what date?",
      ta: "வட்டி கிடைக்குமா? எந்த தேதியிலிருந்து?",
    },
    keywords: [
      "interest", "12%", "twelve percent", "delay interest", "வட்டி", "from what date",
      "since when", "additional amount", "delayed payment interest",
    ],
    answer: {
      en:
        "Yes. 12% per annum on the market value, running from the date of the initial notification for the Social Impact Assessment until either the award is made or possession is taken, whichever comes first.\n\nThis is separate from — and additional to — the interest payable if the award itself is paid late. The portal computes the 12% from the actual dates recorded in the project's stage history, so you can see which two dates were used and check them.",
      ta:
        "ஆம். சந்தை மதிப்பின் மீது ஆண்டுக்கு 12%. சமூக தாக்க மதிப்பீட்டுக்கான ஆரம்ப அறிவிப்பு தேதியிலிருந்து, தீர்ப்பு வழங்கப்படும் நாள் அல்லது நிலம் கையகப்படுத்தப்படும் நாள் — எது முன்னதாக வருகிறதோ அதுவரை.\n\nதீர்ப்புத் தொகை தாமதமாக வழங்கப்பட்டால் அதற்குத் தனியாக வட்டி உண்டு. இந்த வலைதளம் திட்டத்தின் உண்மையான தேதிகளிலிருந்து 12%-ஐக் கணக்கிடுகிறது.",
    },
    basis: "s.30(3)",
    followUps: ["comp-when-paid", "comp-formula"],
  },
  {
    id: "comp-when-paid",
    category: "compensation",
    question: { en: "When will I actually be paid?", ta: "எப்போது பணம் கிடைக்கும்?" },
    keywords: [
      "when paid", "when will i get money", "payment date", "how long for payment",
      "எப்போது பணம்", "பணம் எப்போது", "delay in payment", "not received", "still waiting",
      "money not credited",
    ],
    answer: {
      en:
        "The law requires the full award to be paid *before* possession of your land is taken. In sequence: the declaration is published, the award is passed within twelve months of it, and the money must reach you before the land is entered.\n\nThe only exception is the urgency provision, where 80% must be paid before possession. If possession has been taken and you have not been paid, that is not a delay — it is a breach, and it is the single most serious grievance you can file. This portal will not let an officer mark a parcel possessed while payment is unrecorded, and the attempt is logged.\n\nYour parcel page shows the payment status, the date, and the method.",
      ta:
        "சட்டப்படி, உங்கள் நிலத்தைக் கையகப்படுத்துவதற்கு *முன்பே* முழுத் தொகையும் வழங்கப்பட வேண்டும். வரிசை: அறிவிப்பு வெளியீடு, அதன் பன்னிரண்டு மாதங்களுக்குள் தீர்ப்பு, பின்னர் நிலத்தில் நுழைவதற்கு முன் பணம்.\n\nஅவசர விதியில் மட்டும் 80% முன்பணமாக வழங்கப்படும். பணம் வராமல் நிலம் எடுக்கப்பட்டால் அது தாமதம் அல்ல — சட்ட மீறல். இந்த அமைப்பு பணம் பதிவாகாமல் நிலத்தை கையகப்படுத்தியதாக அதிகாரி குறிக்க அனுமதிக்காது.",
    },
    basis: "s.38(1) — possession only after full payment; s.23/s.25 award timeline; s.40 urgency",
    links: [{ label: { en: "Track my parcel", ta: "எனது நிலத்தைக் கண்காணி" }, href: "/my-land" }],
    followUps: ["comp-how-paid", "grv-how-to-file", "poss-when-taken"],
  },
  {
    id: "comp-how-paid",
    category: "compensation",
    question: { en: "How is the money paid to me?", ta: "பணம் எவ்வாறு வழங்கப்படும்?" },
    keywords: [
      "how paid", "bank transfer", "cheque", "cash", "account", "வங்கி", "பணம் எப்படி",
      "payment mode", "which account", "rtgs", "neft", "direct benefit",
    ],
    answer: {
      en:
        "By transfer into the bank account recorded against your name in the award, in a single payment of the full amount. Cash is not used, and the portal records the transfer reference against your parcel so there is a trail on both sides.\n\nIf the account details held for you are wrong or out of date, correct them at the Collector's office *before* the award is passed — a failed transfer is a common reason for a payment showing as made but not received. If the land is jointly held, the award is apportioned between the holders and each share is paid separately.",
      ta:
        "தீர்ப்பில் உங்கள் பெயரில் பதிவு செய்யப்பட்ட வங்கிக் கணக்கிற்கு, முழுத் தொகையும் ஒரே தவணையில் மாற்றப்படும். ரொக்கமாக வழங்கப்படுவதில்லை. பணப் பரிமாற்ற எண் உங்கள் நிலப் பதிவில் சேமிக்கப்படும்.\n\nகணக்கு விவரங்கள் தவறாக இருந்தால், தீர்ப்புக்கு *முன்பே* ஆட்சியர் அலுவலகத்தில் சரிசெய்யுங்கள். கூட்டு உரிமை இருந்தால் தொகை பங்கிடப்பட்டு தனித்தனியாக வழங்கப்படும்.",
    },
    basis: "s.77 — apportionment of compensation among interested persons",
    followUps: ["comp-joint-owners", "comp-mortgage", "comp-when-paid"],
  },
  {
    id: "comp-disagree",
    category: "compensation",
    question: {
      en: "I think the amount is too low. What can I do?",
      ta: "தொகை மிகக் குறைவாக உள்ளது. நான் என்ன செய்யலாம்?",
    },
    keywords: [
      "too low", "disagree", "unfair", "not enough", "dispute amount", "wrong amount",
      "less money", "குறைவு", "நியாயமில்லை", "மறுப்பு", "challenge award", "appeal amount",
      "increase compensation", "underpaid",
    ],
    answer: {
      en:
        "You have a specific right to challenge it, and it is not a favour you are asking for.\n\n1. **File a grievance here** with the reason — the rate used, the extent recorded, the assets left out, or the multiplier applied. You get a tracking number immediately.\n2. **Ask for a reference to the LARR Authority** under s.64. This must be done within six weeks of the award (or of learning of it), so the date matters — do not let it pass while waiting for a reply to a letter.\n3. The Authority hears the matter afresh and can raise the award. Interest continues to run while it does.\n\nThe strongest cases are specific: a registered sale deed at a higher rate, a well or trees not counted, or an extent that disagrees with your patta. Vague dissatisfaction is much harder to act on than one document.",
      ta:
        "எதிர்த்து வாதிடுவது உங்கள் சட்ட உரிமை.\n\n1. **இங்கே குறை மனு தாக்கல் செய்யுங்கள்** — காரணத்தைக் குறிப்பிடுங்கள்: பயன்படுத்திய விலை, பதிவான பரப்பளவு, விடுபட்ட சொத்துகள், அல்லது காரணி. உடனே கண்காணிப்பு எண் கிடைக்கும்.\n2. **பிரிவு 64-இன் கீழ் LARR ஆணையத்திற்கு பரிந்துரை கோருங்கள்.** தீர்ப்பு அறிந்த ஆறு வாரங்களுக்குள் செய்ய வேண்டும் — தேதி முக்கியம்.\n3. ஆணையம் புதிதாக விசாரித்து தொகையை உயர்த்த முடியும்.\n\nஅதிக விலையில் பதிவான விற்பனைப் பத்திரம், கணக்கிடப்படாத கிணறு அல்லது மரங்கள், பட்டாவுடன் ஒத்துப்போகாத பரப்பளவு — இவை வலுவான ஆதாரங்கள்.",
    },
    basis: "s.64 — reference to the LARR Authority within six weeks; s.69 — determination of compensation by the Authority",
    links: [{ label: { en: "File a grievance", ta: "குறை தாக்கல்" }, href: "/grievances" }],
    followUps: ["grv-how-to-file", "comp-market-value", "grv-court"],
  },
  {
    id: "comp-trees-wells",
    category: "compensation",
    question: {
      en: "Do I get paid for trees, wells and my house?",
      ta: "மரங்கள், கிணறு, வீட்டுக்கு தொகை கிடைக்குமா?",
    },
    keywords: [
      "trees", "coconut", "mango", "well", "borewell", "house", "building", "structure",
      "crops", "standing crop", "மரம்", "கிணறு", "வீடு", "பயிர்", "compound wall",
      "pump set", "motor", "cattle shed",
    ],
    answer: {
      en:
        "Yes — separately from the land, and added before solatium is calculated, which means every rupee of asset value is effectively doubled in the final award.\n\nWhat is valued: standing trees (species and age matter — a bearing coconut is not valued like a sapling), wells and borewells, pump sets, houses and other structures, compound walls, cattle sheds, and standing crops. The valuation is done by the Horticulture, Agriculture and Public Works departments, not by the acquiring officer.\n\nBe present at the enumeration and keep a copy of the list. Assets missed at that visit are the most common single cause of an award being lower than it should be, and the easiest to fix if you have your own record of what was there.",
      ta:
        "ஆம் — நிலத்திற்குத் தனியாக. ஆறுதல் தொகை கணக்கிடுவதற்கு முன் சேர்க்கப்படுவதால், சொத்து மதிப்பு உண்மையில் இரட்டிப்பாகிறது.\n\nமதிப்பிடப்படுவது: நின்ற மரங்கள் (வகை மற்றும் வயது முக்கியம்), கிணறுகள், ஆழ்துளைக் கிணறுகள், மோட்டார்கள், வீடுகள், கட்டிடங்கள், சுற்றுச்சுவர், மாட்டுத் தொழுவம், நின்ற பயிர்கள். மதிப்பீடு தோட்டக்கலை, வேளாண்மை மற்றும் பொதுப்பணித் துறைகளால் செய்யப்படுகிறது.\n\nகணக்கெடுப்பின் போது நேரில் இருங்கள், பட்டியலின் நகலை வைத்துக்கொள்ளுங்கள்.",
    },
    basis: "s.29 — value of assets attached to the land",
    followUps: ["comp-formula", "grv-how-to-file", "doc-what-do-i-need"],
  },
  {
    id: "comp-joint-owners",
    category: "compensation",
    question: {
      en: "The land is in several names. How is the money split?",
      ta: "நிலம் பல பெயர்களில் உள்ளது. தொகை எவ்வாறு பிரிக்கப்படும்?",
    },
    keywords: [
      "joint", "joint owners", "brothers", "family land", "undivided", "share",
      "partition", "கூட்டு உரிமை", "பங்கு", "several names", "co-owner", "split money",
      "ancestral land",
    ],
    answer: {
      en:
        "The award is made for the land as a whole and then apportioned between everyone with an interest in it, in proportion to their shares. Each share is paid to that person separately.\n\nIf the shares are agreed, bring the agreement and it is recorded. If they are not agreed, the Collector refers the apportionment dispute to the LARR Authority and holds the money until it is decided — the acquisition itself does not stop, but your share is not paid out to someone else in the meantime. Do not let a family disagreement delay the objection window on the amount itself; those are two separate matters and both have their own clocks.",
      ta:
        "தீர்ப்பு நிலத்திற்கு ஒட்டுமொத்தமாக வழங்கப்பட்டு, பின்னர் உரிமையுள்ள அனைவருக்கும் அவர்களின் பங்கின் விகிதத்தில் பிரிக்கப்படும். ஒவ்வொரு பங்கும் தனித்தனியாக வழங்கப்படும்.\n\nபங்குகள் ஒப்புக்கொள்ளப்பட்டால் ஒப்பந்தத்தைக் கொண்டு வாருங்கள். இல்லையெனில் ஆட்சியர் அந்தத் தகராறை LARR ஆணையத்திற்கு அனுப்பி, முடிவு வரும் வரை தொகையை வைத்திருப்பார். குடும்பத் தகராறு காரணமாக தொகைக்கான ஆட்சேபணை காலம் கடந்துவிடக் கூடாது.",
    },
    basis: "ss.77–78 — apportionment and reference of disputes as to apportionment",
    followUps: ["doc-heir", "comp-heir-deceased", "comp-how-paid"],
  },
  {
    id: "comp-heir-deceased",
    category: "compensation",
    question: {
      en: "The patta is in my late father's name. What do I do?",
      ta: "பட்டா இறந்த தந்தையின் பெயரில் உள்ளது. என்ன செய்ய வேண்டும்?",
    },
    keywords: [
      "deceased", "died", "late father", "expired", "inherited", "heir", "succession",
      "இறந்த", "வாரிசு", "father's name", "mother's name", "name change patta",
      "legal heir certificate", "mutation",
    ],
    answer: {
      en:
        "Get a legal heir certificate from the Tahsildar and give a copy to the acquisition office. The award is then apportioned among the heirs named in it rather than being paid to the deceased holder — which is a payment that cannot complete, and is a frequent cause of an award sitting unpaid for months.\n\nDo this as early as you can, ideally before the award is passed. It does not require the patta to be mutated first, though mutation is worth starting in parallel. If the certificate is delayed, file a grievance recording that you are the heir and that the certificate is pending — that puts the fact on the file with a date, which protects you if a deadline runs.",
      ta:
        "வட்டாட்சியரிடம் வாரிசு சான்றிதழ் பெற்று, கையகப்படுத்தல் அலுவலகத்தில் நகலைக் கொடுங்கள். பின்னர் தொகை சான்றிதழில் உள்ள வாரிசுகளுக்குப் பிரிக்கப்படும். இல்லையெனில் இறந்தவரின் பெயரில் பணம் செல்ல முடியாமல் மாதங்கள் தாமதமாகும்.\n\nதீர்ப்புக்கு முன்பே இதைச் செய்வது நல்லது. பட்டா மாற்றம் முடியாமலும் இதைச் செய்ய முடியும். சான்றிதழ் தாமதமானால், நீங்கள் வாரிசு என்பதைக் குறிப்பிட்டு குறை மனு தாக்கல் செய்யுங்கள் — அது தேதியுடன் பதிவாகும்.",
    },
    basis: "s.77 apportionment; legal heir certificate issued by the Tahsildar",
    links: [{ label: { en: "File a grievance", ta: "குறை தாக்கல்" }, href: "/grievances" }],
    followUps: ["doc-heir", "comp-joint-owners"],
  },
  {
    id: "comp-mortgage",
    category: "compensation",
    question: {
      en: "There is a bank loan on the land. Who gets the money?",
      ta: "நிலத்தில் வங்கிக் கடன் உள்ளது. பணம் யாருக்கு?",
    },
    keywords: [
      "loan", "mortgage", "bank loan", "charge", "encumbrance", "pledged", "hypothecated",
      "கடன்", "அடமானம்", "jewel loan", "crop loan", "bank will take",
    ],
    answer: {
      en:
        "The charge does not disappear because the land was acquired — it attaches to the compensation instead. The award is apportioned: the bank's subsisting dues are settled out of it and the balance is paid to you.\n\nSo it is worth knowing the exact outstanding figure before the award, because the apportionment is done on the amount the bank certifies. Get a current statement and, if the loan is already closed, get the discharge recorded in the encumbrance certificate — an EC still showing a closed mortgage is a common cause of an award being held up for weeks. The portal flags a subsisting charge when the EC is read, so an officer sees it before marking compensation paid.",
      ta:
        "நிலம் கையகப்படுத்தப்பட்டதால் கடன் மறைந்துவிடாது — அது இழப்பீட்டுத் தொகையுடன் இணைகிறது. தொகையிலிருந்து வங்கியின் நிலுவை செலுத்தப்பட்டு, மீதி உங்களுக்கு வழங்கப்படும்.\n\nஎனவே தீர்ப்புக்கு முன் சரியான நிலுவைத் தொகையை அறிந்திருப்பது நல்லது. கடன் ஏற்கனவே அடைக்கப்பட்டிருந்தால், அதை வில்லங்கச் சான்றிதழில் பதிவு செய்யுங்கள் — இல்லையெனில் தொகை வாரங்கள் தாமதமாகும்.",
    },
    basis: "s.77 — apportionment where the land is subject to a charge",
    followUps: ["doc-ec", "comp-how-paid"],
  },
  {
    id: "comp-tax",
    category: "compensation",
    question: {
      en: "Do I pay income tax on the compensation?",
      ta: "இழப்பீட்டுத் தொகைக்கு வருமான வரி கட்ட வேண்டுமா?",
    },
    keywords: [
      "tax", "income tax", "tds", "capital gains", "taxable", "வரி", "tax free",
      "deduction", "will they cut tax", "80c", "exempt",
    ],
    answer: {
      en:
        "Compensation for compulsory acquisition of agricultural land is exempt from income tax, and s.96 of the 2013 Act also exempts the award from stamp duty and fees. That is the general position and it covers most people asking this.\n\nIt is not universal, though: non-agricultural land, and land held as stock-in-trade, are treated differently, and a large award can interact with your other income. This portal cannot give you tax advice for your own return — take the award order to a tax practitioner or the Income Tax facilitation centre and ask about your specific case before you file.",
      ta:
        "கட்டாயமாக கையகப்படுத்தப்பட்ட வேளாண் நிலத்திற்கான இழப்பீடு வருமான வரியிலிருந்து விலக்கு பெற்றது. 2013 சட்டத்தின் பிரிவு 96, தீர்ப்புக்கு முத்திரைத் தாள் கட்டணம் மற்றும் பிற கட்டணங்களிலிருந்தும் விலக்கு அளிக்கிறது.\n\nஆனால் இது அனைவருக்கும் பொருந்தாது — வேளாண் அல்லாத நிலம் வேறுவிதமாக கருதப்படும். உங்கள் குறிப்பிட்ட நிலைக்கு வரி ஆலோசகரை அணுகுங்கள். இந்த வலைதளம் வரி ஆலோசனை வழங்க முடியாது.",
    },
    basis: "s.96 — exemption from stamp duty and fees on the award; income-tax treatment under the Income Tax Act",
    followUps: ["comp-how-paid", "rr-stamp-duty"],
  },
  {
    id: "comp-unclaimed",
    category: "compensation",
    question: {
      en: "What happens if the compensation is not claimed?",
      ta: "இழப்பீட்டைப் பெறாமல் விட்டால் என்ன ஆகும்?",
    },
    keywords: [
      "unclaimed", "not claimed", "refused to accept", "deposit", "court deposit",
      "did not take money", "பெறவில்லை", "reject compensation", "returned",
    ],
    answer: {
      en:
        "If you cannot be found, or you decline the amount, or there is a dispute about who is entitled to it, the Collector deposits the award with the Authority rather than keeping it. Your right to it does not lapse by not collecting it.\n\nDeclining the money is worth thinking about carefully, though: it does not stop the acquisition, and possession can still follow once the amount is deposited. If your objection is to the amount, the effective route is a s.64 reference — which you can pursue while accepting the award under protest, so you are not choosing between the money and the challenge.",
      ta:
        "உங்களைக் கண்டுபிடிக்க முடியாவிட்டால், நீங்கள் தொகையை மறுத்தால், அல்லது யாருக்குச் சொந்தம் என்பதில் தகராறு இருந்தால், ஆட்சியர் தொகையை ஆணையத்தில் வைப்புத் தொகையாகச் செலுத்துவார். உங்கள் உரிமை காலாவதியாகாது.\n\nஆனால் பணத்தை மறுப்பது கையகப்படுத்தலை நிறுத்தாது. தொகையின் மீது ஆட்சேபணை இருந்தால், எதிர்ப்புடன் தொகையைப் பெற்றுக்கொண்டே பிரிவு 64 பரிந்துரையைத் தொடரலாம்.",
    },
    basis: "s.77 read with s.80 — payment or deposit of compensation",
    followUps: ["comp-disagree", "poss-when-taken"],
  },
  {
    id: "comp-lease-tenant",
    category: "compensation",
    question: {
      en: "I lease the land, I do not own it. Do I get anything?",
      ta: "நான் குத்தகைக்கு சாகுபடி செய்கிறேன், உரிமையாளர் அல்ல. எனக்கு ஏதாவது கிடைக்குமா?",
    },
    keywords: [
      "tenant", "lease", "kuthagai", "sharecropper", "cultivator", "not owner",
      "labourer", "குத்தகை", "பங்குச்சாகுபடி", "no patta", "landless", "working on land",
    ],
    answer: {
      en:
        "You do not receive the land's market value — that goes to the titleholder. But you are very likely an *affected family* in your own right, which carries the Second Schedule R&R entitlements: the subsistence grant, the transport allowance, the resettlement allowance, and employment or annuity support.\n\nThe Act defines an affected family to include tenants, share-croppers, agricultural labourers who depend on the land, and families whose primary livelihood is affected for three years before the notification — not only owners. A patta names the owner and nobody else, so the only way you appear on the record is through the Social Impact Assessment census. If the SIA survey team did not record your household, say so now: file a grievance with your name, the survey number you work on, and how long you have worked it.",
      ta:
        "நிலத்தின் சந்தை மதிப்பு உங்களுக்கு வராது — அது பட்டாதாரருக்கு. ஆனால் நீங்கள் தனியாக *பாதிக்கப்பட்ட குடும்பமாக* இருக்கக்கூடும், அதற்கு இரண்டாம் அட்டவணை மறுவாழ்வு உரிமைகள் உண்டு: வாழ்வாதார உதவித்தொகை, போக்குவரத்துச் செலவு, மீள்குடியேற்ற உதவி, வேலை அல்லது ஆண்டுத்தொகை.\n\nசட்டம் குத்தகைக்காரர்கள், பங்குச்சாகுபடியாளர்கள், விவசாயத் தொழிலாளர்கள் அனைவரையும் சேர்க்கிறது. பட்டா உரிமையாளரை மட்டுமே குறிக்கிறது — நீங்கள் பதிவாகும் ஒரே வழி SIA கணக்கெடுப்பு. கணக்கெடுப்பில் உங்கள் குடும்பம் பதிவாகவில்லை என்றால், இப்போதே குறை மனு தாக்கல் செய்யுங்கள்.",
    },
    basis: "s.3(c) — definition of an affected family, clauses (ii) to (vi); Second Schedule",
    links: [{ label: { en: "R&R entitlements", ta: "மறுவாழ்வு உரிமைகள்" }, href: "/rr" }],
    followUps: ["rr-tenant", "rr-who-qualifies", "grv-how-to-file"],
  },
  {
    id: "comp-partial-land",
    category: "compensation",
    question: {
      en: "Only part of my field is being taken. What about the rest?",
      ta: "எனது நிலத்தின் ஒரு பகுதி மட்டும் எடுக்கப்படுகிறது. மீதிக்கு என்ன?",
    },
    keywords: [
      "part of land", "partly", "half my land", "remaining land", "leftover",
      "severance", "unusable", "cut in two", "பகுதி", "மீதி நிலம்", "road through middle",
      "access lost", "landlocked",
    ],
    answer: {
      en:
        "You are compensated for the extent taken, and separately for the damage done to what is left. That second head is real and often overlooked: if a corridor cuts your field in two, or leaves a strip too small to work, or takes away your access to the road or to your well, the loss in value of the remaining land is itself compensable.\n\nRaise it explicitly at the enumeration and in writing — it is assessed only if it is claimed and recorded. Say what specifically is lost: access, irrigation, the ability to turn a tractor. If the remainder is genuinely unworkable, ask for the whole holding to be acquired instead; that request has to be considered on its merits and recorded either way.",
      ta:
        "எடுக்கப்படும் பரப்பளவுக்கு இழப்பீடு உண்டு, மீதி நிலத்திற்கு ஏற்படும் சேதத்திற்குத் தனியாகவும் உண்டு. இரண்டாவது அடிக்கடி கவனிக்கப்படாமல் விடப்படுகிறது: சாலை நிலத்தை இரண்டாகப் பிரித்தால், மீதி மிகச் சிறியதாகி பயனற்றுப் போனால், அல்லது சாலை/கிணறு அணுகல் இழந்தால் — அந்த மதிப்பு இழப்பும் இழப்பீட்டுக்கு உரியது.\n\nகணக்கெடுப்பின் போது எழுத்துப்பூர்வமாகக் கோருங்கள். மீதி நிலம் முழுவதும் பயனற்றது என்றால், முழு நிலத்தையும் கையகப்படுத்தக் கோரலாம்.",
    },
    basis: "s.28 — parameters to be considered, including damage sustained by severing the land",
    followUps: ["comp-disagree", "land-partly-affected", "grv-how-to-file"],
  },
];
