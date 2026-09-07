/**
 * Rehabilitation and resettlement answers.
 *
 * The half of the Act people do not know exists. Almost everyone asking about
 * acquisition asks about the money; very few know that a displaced family is
 * separately entitled to a house, a year of subsistence, transport, and
 * employment support, or that a tenant with no patta at all can be entitled to
 * most of it. So these answers lead with what the person gets rather than with
 * the name of the schedule it comes from.
 *
 * Every figure here is the Central Act minimum. States notify higher amounts,
 * and the answer says so rather than quoting a number as though it were the
 * final word — the project page shows the amount actually notified.
 */

import type { KnowledgeEntry } from "../types";

export const RR_ENTRIES: KnowledgeEntry[] = [
  {
    id: "rr-what-do-i-get",
    category: "rr",
    question: {
      en: "What do I get besides the compensation money?",
      ta: "இழப்பீட்டுத் தொகையைத் தவிர எனக்கு வேறு என்ன கிடைக்கும்?",
    },
    keywords: [
      "rehabilitation", "resettlement", "r&r", "rr", "entitlement", "benefits", "package",
      "besides money", "other help", "மறுவாழ்வு", "மீள்குடியேற்றம்", "உரிமைகள்", "சலுகைகள்",
      "what else", "second schedule", "extra benefits",
    ],
    answer: {
      en:
        "A displaced family is entitled to all of these, on top of the land compensation:\n\n• A housing unit, or ₹1.5 lakh in lieu of one\n• Land for land in irrigation projects — one acre in the command area, two and a half for SC/ST families\n• Employment for one member, or ₹5 lakh once, or an annuity of ₹2,000 a month for twenty years, indexed\n• A subsistence grant of ₹3,000 a month for twelve months\n• A transport allowance of ₹50,000\n• A resettlement allowance of ₹50,000\n• ₹25,000 for a lost cattle shed or petty shop, and ₹25,000 for an artisan or small trader losing their livelihood\n• Stamp duty and registration fees on replacement land, paid by the requiring body\n\nThese are the Central Act minimums; your State may have notified more. The R&R page shows the amounts actually set for your project and which ones have been granted to your household.",
      ta:
        "இடம்பெயர்ந்த குடும்பத்திற்கு நில இழப்பீட்டைத் தவிர இவை அனைத்தும் உரிமை:\n\n• ஒரு வீடு, அல்லது அதற்குப் பதிலாக ₹1.5 லட்சம்\n• நீர்ப்பாசனத் திட்டங்களில் நிலத்திற்கு நிலம் — ஆயக்கட்டுப் பகுதியில் ஒரு ஏக்கர், SC/ST குடும்பங்களுக்கு இரண்டரை ஏக்கர்\n• ஒரு நபருக்கு வேலை, அல்லது ஒரே தவணையாக ₹5 லட்சம், அல்லது இருபது ஆண்டுகளுக்கு மாதம் ₹2,000 ஆண்டுத்தொகை\n• பன்னிரண்டு மாதங்களுக்கு மாதம் ₹3,000 வாழ்வாதார உதவித்தொகை\n• ₹50,000 போக்குவரத்துச் செலவு\n• ₹50,000 மீள்குடியேற்ற உதவித்தொகை\n• மாட்டுத் தொழுவம்/சிறு கடை இழப்புக்கு ₹25,000; கைவினைஞர் அல்லது சிறு வியாபாரிக்கு ₹25,000\n• மாற்று நிலத்திற்கான முத்திரைத் தாள் கட்டணம்\n\nஇவை மத்திய சட்டத்தின் குறைந்தபட்ச அளவுகள்; மாநிலம் அதிகமாக அறிவிக்கலாம்.",
    },
    basis: "Second Schedule, RFCTLARR Act 2013; s.31 — Rehabilitation and Resettlement Award",
    links: [{ label: { en: "R&R entitlements", ta: "மறுவாழ்வு உரிமைகள்" }, href: "/rr" }],
    followUps: ["rr-who-qualifies", "rr-housing", "rr-when"],
  },
  {
    id: "rr-who-qualifies",
    category: "rr",
    question: {
      en: "Who counts as an affected family?",
      ta: "பாதிக்கப்பட்ட குடும்பம் என்று யார் கருதப்படுவார்கள்?",
    },
    keywords: [
      "affected family", "who qualifies", "eligible", "am i eligible", "definition",
      "displaced", "பாதிக்கப்பட்ட குடும்பம்", "தகுதி", "who is included", "family definition",
      "3(c)", "landless",
    ],
    answer: {
      en:
        "Far more people than just patta-holders. The Act includes:\n\n• The landowner\n• A family whose primary source of livelihood is affected — including agricultural labourers, tenants, share-croppers and artisans who have worked on the land for the three years before the notification\n• Scheduled Tribe and other forest-dwelling families with rights over forest produce\n• A family residing on the land, even without title, for the three preceding years\n• Families dependent on a water body or on common land being acquired\n• Urban families losing a residence or a place of business\n\nBeing an affected family is decided by the Social Impact Assessment census, not by the patta. If the census team did not reach your household, that is the thing to fix — file a grievance now with your name, the survey number and how long you have depended on it, so the omission is on the record with a date.",
      ta:
        "பட்டாதாரர்கள் மட்டுமல்ல. சட்டம் இவர்களை உள்ளடக்குகிறது:\n\n• நில உரிமையாளர்\n• வாழ்வாதாரம் பாதிக்கப்படும் குடும்பம் — அறிவிப்புக்கு முந்தைய மூன்று ஆண்டுகளாக அந்த நிலத்தில் உழைத்த விவசாயத் தொழிலாளர்கள், குத்தகைக்காரர்கள், பங்குச்சாகுபடியாளர்கள், கைவினைஞர்கள்\n• வன உற்பத்திப் பொருட்களில் உரிமையுள்ள பழங்குடி மற்றும் வனவாசி குடும்பங்கள்\n• உரிமைப் பத்திரம் இல்லாமலும் மூன்று ஆண்டுகளாக அந்த நிலத்தில் வாழும் குடும்பம்\n• கையகப்படுத்தப்படும் நீர்நிலை அல்லது பொது நிலத்தை நம்பியுள்ள குடும்பங்கள்\n\nஇது SIA கணக்கெடுப்பால் தீர்மானிக்கப்படுகிறது, பட்டாவால் அல்ல. கணக்கெடுப்பில் நீங்கள் விடுபட்டிருந்தால் உடனே குறை மனு தாக்கல் செய்யுங்கள்.",
    },
    basis: "s.3(c) — definition of 'affected family'; s.4 — Social Impact Assessment census",
    followUps: ["rr-tenant", "status-sia", "grv-how-to-file"],
  },
  {
    id: "rr-housing",
    category: "rr",
    question: {
      en: "Will I be given a house? Where?",
      ta: "எனக்கு வீடு கிடைக்குமா? எங்கே?",
    },
    keywords: [
      "house", "housing", "home", "plot", "resettlement colony", "where will i live",
      "வீடு", "இடம்", "குடியிருப்பு", "new house", "constructed house", "allotment",
      "site", "1.5 lakh",
    ],
    answer: {
      en:
        "If your house is being taken, yes — a constructed house at the resettlement site, or ₹1.5 lakh if you would rather build your own. In urban areas the house must be at least 50 square metres of plinth area. You cannot be made to take the cash instead of the house; the choice is yours.\n\nThe resettlement site itself has to be provided with twenty-five listed amenities — road, drainage, drinking water, electricity, a school, a health centre, a panchayat building, a burial or cremation ground, and so on. That list is a legal requirement, not a plan, and this portal tracks each item to completion on the Infrastructure tab of the project, so you can see which ones are actually finished before you move.",
      ta:
        "உங்கள் வீடு எடுக்கப்படுகிறது என்றால் — ஆம். மீள்குடியேற்ற இடத்தில் கட்டப்பட்ட வீடு, அல்லது நீங்களே கட்டிக்கொள்ள விரும்பினால் ₹1.5 லட்சம். நகரப் பகுதிகளில் வீடு குறைந்தது 50 சதுர மீட்டர் இருக்க வேண்டும். பணத்தை ஏற்கும்படி கட்டாயப்படுத்த முடியாது — தேர்வு உங்களுடையது.\n\nமீள்குடியேற்ற இடத்தில் இருபத்தைந்து அடிப்படை வசதிகள் வழங்கப்பட வேண்டும் — சாலை, வடிகால், குடிநீர், மின்சாரம், பள்ளி, சுகாதார நிலையம், ஊராட்சி கட்டிடம், சுடுகாடு. இது சட்டக் கடமை. ஒவ்வொரு வசதியின் நிலையையும் இந்த வலைதளத்தில் பார்க்கலாம்.",
    },
    basis: "Second Schedule item 1; Third Schedule — twenty-five infrastructural amenities",
    followUps: ["rr-when", "rr-what-do-i-get", "sys-what-is-this"],
  },
  {
    id: "rr-subsistence",
    category: "rr",
    question: {
      en: "What is the monthly subsistence grant?",
      ta: "மாதாந்திர வாழ்வாதார உதவித்தொகை என்றால் என்ன?",
    },
    keywords: [
      "subsistence", "monthly", "3000", "monthly allowance", "grant", "maintenance",
      "வாழ்வாதாரம்", "மாதம்", "உதவித்தொகை", "one year", "12 months", "living expenses",
    ],
    answer: {
      en:
        "₹3,000 a month for twelve months, from the date on which you are displaced — ₹36,000 in total, and it is separate from everything else. It exists because a family that has lost its land has lost its income before the new arrangement is working.\n\nIt is paid to the affected family, not per person, and it does not depend on owning the land. Tenants and labourers who qualify as affected families receive it too. If displacement has happened and the grant has not started, that is a straightforward grievance with a clear date attached to it.",
      ta:
        "இடம்பெயர்ந்த நாளிலிருந்து பன்னிரண்டு மாதங்களுக்கு மாதம் ₹3,000 — மொத்தம் ₹36,000. இது மற்ற அனைத்திற்கும் தனியாக வழங்கப்படுகிறது. நிலத்தை இழந்த குடும்பம் புதிய ஏற்பாடு செயல்படும் முன்பே வருமானத்தை இழந்துவிடுகிறது என்பதே காரணம்.\n\nஇது குடும்பத்திற்கு வழங்கப்படுகிறது, ஒரு நபருக்கு அல்ல. நில உரிமை தேவையில்லை — தகுதியுள்ள குத்தகைக்காரர்கள், தொழிலாளர்களுக்கும் கிடைக்கும். இடம்பெயர்ந்த பிறகும் தொகை தொடங்கவில்லை என்றால் குறை மனு தாக்கல் செய்யுங்கள்.",
    },
    basis: "Second Schedule item 5",
    followUps: ["rr-what-do-i-get", "grv-how-to-file"],
  },
  {
    id: "rr-job",
    category: "rr",
    question: {
      en: "Will someone in my family get a job?",
      ta: "எனது குடும்பத்தில் ஒருவருக்கு வேலை கிடைக்குமா?",
    },
    keywords: [
      "job", "employment", "work", "annuity", "5 lakh", "2000 per month", "training",
      "skill", "வேலை", "பணி", "ஆண்டுத்தொகை", "பயிற்சி", "government job", "one member",
    ],
    answer: {
      en:
        "You get a choice of three, and the choice is the family's, not the department's:\n\n1. Employment for one member of the family, at not less than the minimum wage, in the project or in a related job\n2. A one-time payment of ₹5 lakh\n3. An annuity of ₹2,000 a month for twenty years, index-linked so it does not lose value\n\nSeparately, affected families are entitled to skill-development training so the employment option is real rather than nominal. The R&R tab records which option each household chose and whether it has been delivered — an unfulfilled option stays visibly open rather than being closed by a payment.",
      ta:
        "மூன்றில் ஒன்றைத் தேர்ந்தெடுக்கலாம், தேர்வு குடும்பத்தினுடையது:\n\n1. குடும்பத்தில் ஒருவருக்கு வேலை — குறைந்தபட்ச கூலிக்குக் குறையாமல்\n2. ஒரே தவணையாக ₹5 லட்சம்\n3. இருபது ஆண்டுகளுக்கு மாதம் ₹2,000 ஆண்டுத்தொகை, பணவீக்கத்திற்கு ஏற்ப உயரும்\n\nதனியாக, திறன் மேம்பாட்டுப் பயிற்சியும் உரிமை. எந்தத் தேர்வு செய்யப்பட்டது, அது நிறைவேற்றப்பட்டதா என்பது வலைதளத்தில் பதிவாகும்.",
    },
    basis: "Second Schedule items 4 and 3; s.32 — provision of employment and training",
    followUps: ["rr-what-do-i-get", "rr-when"],
  },
  {
    id: "rr-tenant",
    category: "rr",
    question: {
      en: "I have no patta. Am I entitled to anything?",
      ta: "எனக்கு பட்டா இல்லை. எனக்கு ஏதாவது உரிமை உண்டா?",
    },
    keywords: [
      "no patta", "no title", "landless", "tenant", "labourer", "encroacher",
      "living on land", "பட்டா இல்லை", "நிலமில்லை", "not owner", "squatter",
      "unregistered", "no document", "poramboke",
    ],
    answer: {
      en:
        "Very likely yes, and this is the most commonly missed entitlement in the whole Act.\n\nR&R entitlements attach to being an *affected family*, which does not require title. A family residing on the land for three years before the notification, or depending on it for its primary livelihood, qualifies — so agricultural labourers, tenants, share-croppers, artisans and forest-dwellers are all in scope for the subsistence grant, the transport and resettlement allowances, employment or annuity support, and housing if they are displaced from a dwelling.\n\nWhat you do need is to be *on the record*. A patta cannot record you, so the SIA census is the only route in. If it missed you, file a grievance with your name, the survey number, what you do on that land, and roughly since when. Anything you have that shows presence over time helps — a ration card at that address, an electricity bill, a school record for a child, a bank passbook, a job card.",
      ta:
        "மிக அதிக வாய்ப்பு உள்ளது — இது சட்டத்தில் அதிகம் தவறவிடப்படும் உரிமை.\n\nமறுவாழ்வு உரிமைகள் *பாதிக்கப்பட்ட குடும்பம்* என்ற நிலையுடன் இணைந்தவை; உரிமைப் பத்திரம் தேவையில்லை. அறிவிப்புக்கு முந்தைய மூன்று ஆண்டுகளாக அந்த நிலத்தில் வாழ்ந்தால் அல்லது அதை நம்பி வாழ்ந்தால் தகுதி உண்டு.\n\nஆனால் நீங்கள் *பதிவில்* இருக்க வேண்டும். பட்டா உங்களைப் பதிவு செய்யாது — SIA கணக்கெடுப்பே ஒரே வழி. விடுபட்டிருந்தால் குறை மனு தாக்கல் செய்யுங்கள். அந்த முகவரியில் ரேஷன் அட்டை, மின் கட்டண ரசீது, பிள்ளையின் பள்ளிப் பதிவு, வங்கிப் புத்தகம் — இவை உதவும்.",
    },
    basis: "s.3(c)(ii)–(vi); Second Schedule",
    links: [{ label: { en: "File a grievance", ta: "குறை தாக்கல்" }, href: "/grievances" }],
    followUps: ["rr-who-qualifies", "comp-lease-tenant", "grv-how-to-file"],
  },
  {
    id: "rr-sc-st",
    category: "rr",
    question: {
      en: "Are there extra entitlements for SC/ST families?",
      ta: "SC/ST குடும்பங்களுக்கு கூடுதல் உரிமைகள் உள்ளதா?",
    },
    keywords: [
      "sc", "st", "scheduled caste", "scheduled tribe", "tribal", "adivasi",
      "பழங்குடி", "தாழ்த்தப்பட்ட", "extra benefit", "special provision", "forest rights",
      "scheduled area", "vulnerable",
    ],
    answer: {
      en:
        "Yes, and they are substantial. In addition to everything else:\n\n• Two and a half acres of land in the command area for irrigation projects, instead of one\n• Land equivalent to what was lost, up to two and a half acres, where possible\n• A one-time additional payment of ₹50,000\n• Free land for community and religious gatherings at the resettlement site\n• Resettlement preferably in the same Scheduled Area, as a community, so the community is not dispersed\n• Continued rights over forest produce, and the reservation and other benefits of the original area carried over\n\nIn a Scheduled Area, acquisition additionally requires the prior consent of the Gram Sabha, and a Development Plan must be prepared. These are not concessions — they are conditions on the acquisition itself, and the project's Community tab records whether the Gram Sabha consultation actually happened.",
      ta:
        "ஆம், கணிசமான கூடுதல் உரிமைகள்:\n\n• நீர்ப்பாசனத் திட்டங்களில் ஆயக்கட்டுப் பகுதியில் ஒரு ஏக்கருக்குப் பதிலாக இரண்டரை ஏக்கர்\n• இழந்த நிலத்திற்கு இணையான நிலம், இரண்டரை ஏக்கர் வரை\n• கூடுதலாக ஒரே தவணையாக ₹50,000\n• மீள்குடியேற்ற இடத்தில் சமூக மற்றும் மத நிகழ்வுகளுக்கு இலவச நிலம்\n• முடிந்தவரை அதே பட்டியல் பகுதியில், சமூகமாகவே மீள்குடியேற்றம்\n• வன உற்பத்திப் பொருட்கள் மீதான உரிமைகள் தொடரும்\n\nபட்டியல் பகுதியில் கையகப்படுத்துவதற்கு கிராம சபையின் முன் ஒப்புதல் அவசியம்.",
    },
    basis: "ss.41–42 — special provisions for Scheduled Castes and Scheduled Tribes; Second Schedule items 8–12",
    followUps: ["status-gram-sabha", "rights-consent", "rr-what-do-i-get"],
  },
  {
    id: "rr-when",
    category: "rr",
    question: {
      en: "When do the R&R benefits actually arrive?",
      ta: "மறுவாழ்வு உதவிகள் எப்போது கிடைக்கும்?",
    },
    keywords: [
      "when", "how long", "timeline", "delay", "not received", "still waiting",
      "எப்போது", "தாமதம்", "when will i get house", "rr delay", "pending entitlement",
    ],
    answer: {
      en:
        "The R&R award is passed alongside the compensation award, and the physical entitlements follow a statutory sequence: no family may be displaced until its compensation is paid and its R&R entitlements are provided. Infrastructure at the resettlement site must be complete within eighteen months of the award.\n\nSo the order matters, and this portal enforces it rather than merely displaying it: R&R cannot be started until the compensation stage is marked complete, and a parcel cannot be marked possessed while a payment or an entitlement is outstanding. If you have been moved and an entitlement has not arrived, the sequence has been broken — say exactly which entitlement and when you moved, and the project's own record will either confirm or contradict it.",
      ta:
        "மறுவாழ்வு தீர்ப்பு இழப்பீட்டுத் தீர்ப்புடன் சேர்ந்து வழங்கப்படுகிறது. சட்ட வரிசை: இழப்பீடு வழங்கப்பட்டு மறுவாழ்வு உரிமைகள் நிறைவேற்றப்படும் வரை எந்தக் குடும்பமும் இடம்பெயர்க்கப்படக் கூடாது. மீள்குடியேற்ற இடத்தின் அடிப்படை வசதிகள் தீர்ப்பிலிருந்து பதினெட்டு மாதங்களுக்குள் முடிக்கப்பட வேண்டும்.\n\nஇந்த அமைப்பு அந்த வரிசையைக் கட்டாயமாக்குகிறது — இழப்பீடு முடியாமல் மறுவாழ்வு தொடங்க முடியாது. நீங்கள் இடம்பெயர்ந்த பிறகும் உரிமை கிடைக்கவில்லை என்றால், எந்த உரிமை, எப்போது இடம்பெயர்ந்தீர்கள் என்பதைக் குறிப்பிடுங்கள்.",
    },
    basis: "s.31; s.38(2) — infrastructural amenities within eighteen months; s.38(1) — no displacement before payment",
    followUps: ["poss-when-taken", "grv-how-to-file", "rr-housing"],
  },
  {
    id: "rr-stamp-duty",
    category: "rr",
    question: {
      en: "Do I pay stamp duty when I buy replacement land?",
      ta: "மாற்று நிலம் வாங்கும்போது முத்திரைத் தாள் கட்டணம் கட்ட வேண்டுமா?",
    },
    keywords: [
      "stamp duty", "registration fee", "buy new land", "replacement land", "waiver",
      "முத்திரைத் தாள்", "பதிவுக் கட்டணம்", "exemption", "registration charges",
    ],
    answer: {
      en:
        "No — the requiring body pays it. The stamp duty and registration fees on land you buy to replace what was acquired are borne by the project, not by you, and the same applies to the registration of a house or plot allotted at a resettlement site.\n\nSeparately, s.96 exempts the award itself from stamp duty and from any fee. Keep the award order with you when you register the replacement purchase; the exemption is claimed against it, and a sub-registrar who has not seen it will ask.",
      ta:
        "இல்லை — திட்ட நிறுவனமே செலுத்தும். கையகப்படுத்தப்பட்ட நிலத்திற்குப் பதிலாக நீங்கள் வாங்கும் நிலத்தின் முத்திரைத் தாள் மற்றும் பதிவுக் கட்டணத்தை திட்டம் ஏற்கும். மீள்குடியேற்ற இடத்தில் ஒதுக்கப்பட்ட வீடு/மனை பதிவுக்கும் இதே பொருந்தும்.\n\nதனியாக, பிரிவு 96 தீர்ப்புக்கே கட்டண விலக்கு அளிக்கிறது. பதிவு செய்யும்போது தீர்ப்பு ஆணையை உடன் எடுத்துச் செல்லுங்கள்.",
    },
    basis: "Second Schedule item 7; s.96 — exemption from income tax, stamp duty and fees",
    followUps: ["comp-tax", "rr-what-do-i-get"],
  },
];
