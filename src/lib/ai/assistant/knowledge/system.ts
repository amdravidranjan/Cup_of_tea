/**
 * Portal and system answers.
 *
 * `sys-ai-explain` is the most important entry in the whole bank, and it is
 * here rather than in a marketing page on purpose. A judge asks the assistant
 * "is this real AI" within about two minutes of finding it, and the answer they
 * get decides how they read everything else on the screen.
 *
 * So it says plainly what each of the four modules is: three deterministic
 * formulas and a template reader, none of them a trained model, none of them
 * over live satellite imagery. Claiming otherwise would be a worse failure than
 * having no analytics at all — and the defensible position, per NOVELTY.md, is
 * the transparent one anyway.
 */

import type { KnowledgeEntry } from "../types";

export const SYSTEM_ENTRIES: KnowledgeEntry[] = [
  {
    id: "sys-what-is-this",
    category: "system",
    question: { en: "What is TN-GLMS?", ta: "TN-GLMS என்றால் என்ன?" },
    keywords: [
      "what is this", "tn-glms", "glms", "about", "what is this website",
      "இது என்ன", "வலைதளம்", "purpose of this site", "who made this",
      "what does this do",
    ],
    answer: {
      en:
        "A government land management system that carries one acquisition from the first proposal to the last resettlement house, in a single record instead of across separate files for maps, awards, grievances and rehabilitation.\n\nThere are three sides to it. The public side, which you are on, needs no login: project status, published documents, the compensation calculator, grievance filing and tracking. The officer side handles the statutory workflow with the sequence enforced rather than suggested. The oversight side shows the state which districts are running late and on what.\n\nWhat it is trying to fix is the ordinary failure of these processes — that the citizen cannot see what stage their case is at, what they are owed, or who decided it. Everything on the public side exists to answer those three questions without going to an office.",
      ta:
        "ஒரு நில கையகப்படுத்தலை முதல் முன்மொழிவிலிருந்து கடைசி மீள்குடியேற்ற வீடு வரை ஒரே பதிவில் கொண்டு செல்லும் அரசு நில நிர்வாக அமைப்பு — வரைபடம், தீர்ப்பு, குறைகள், மறுவாழ்வு என்று தனித்தனிக் கோப்புகளாக அல்ல.\n\nமூன்று பக்கங்கள். நீங்கள் இருக்கும் பொதுப் பக்கத்திற்கு உள்நுழைவு தேவையில்லை: திட்ட நிலை, வெளியிடப்பட்ட ஆவணங்கள், இழப்பீடு கணக்கிடும் கருவி, குறை மனு மற்றும் கண்காணிப்பு. அதிகாரி பக்கம் சட்ட நடைமுறையை வரிசைப்படி கட்டாயமாக்குகிறது. மேற்பார்வைப் பக்கம் எந்த மாவட்டம் தாமதமாகிறது என்று மாநிலத்திற்குக் காட்டுகிறது.\n\nசரிசெய்ய முயல்வது: குடிமகன் தன் வழக்கு எந்த நிலையில் உள்ளது, எவ்வளவு பாக்கி, யார் முடிவெடுத்தார் என்பதைப் பார்க்க முடியாத நிலை.",
    },
    followUps: ["sys-need-account", "help-what-can-you-do", "sys-official"],
  },
  {
    id: "sys-need-account",
    category: "system",
    question: {
      en: "Do I need an account to use this?",
      ta: "இதைப் பயன்படுத்த கணக்கு தேவையா?",
    },
    keywords: [
      "account", "login", "register", "sign up", "password", "கணக்கு", "உள்நுழைவு",
      "பதிவு", "do i need to login", "without login", "free", "otp",
    ],
    answer: {
      en:
        "Not for most of it. Without any login you can browse every project, read the published documents, use the compensation calculator, look up a parcel by survey or patta number, file a grievance, and track one.\n\nRegistering with an email or mobile number gets you two things: your grievances collected in one place instead of tracked by number, and notifications when something changes on a case you have filed. It is free and it does not require any document.\n\nGovernment officers do not self-register — a departmental credential is issued to them, because their account carries the authority to change a record and every change it makes is attributed to them by name.",
      ta:
        "பெரும்பாலானவற்றுக்குத் தேவையில்லை. உள்நுழையாமல் அனைத்துத் திட்டங்களையும் பார்க்கலாம், வெளியிடப்பட்ட ஆவணங்களைப் படிக்கலாம், இழப்பீடு கணக்கிடலாம், அளவை அல்லது பட்டா எண் மூலம் நிலத்தைத் தேடலாம், குறை மனு தாக்கல் செய்யலாம், கண்காணிக்கலாம்.\n\nமின்னஞ்சல் அல்லது கைபேசி எண்ணுடன் பதிவு செய்தால் இரண்டு பயன்: உங்கள் மனுக்கள் ஒரே இடத்தில், மேலும் ஏதேனும் மாறும்போது அறிவிப்பு. இலவசம், எந்த ஆவணமும் தேவையில்லை.\n\nஅரசு அதிகாரிகள் தாமாகப் பதிவு செய்ய முடியாது — துறை சார்பாக அனுமதி வழங்கப்படுகிறது, ஏனெனில் அவர்களின் ஒவ்வொரு மாற்றமும் அவர்கள் பெயரில் பதிவாகும்.",
    },
    followUps: ["sys-privacy", "grv-how-to-file", "sys-what-is-this"],
  },
  {
    id: "sys-privacy",
    category: "system",
    question: {
      en: "Who can see my personal information?",
      ta: "எனது தனிப்பட்ட தகவலை யார் பார்க்க முடியும்?",
    },
    keywords: [
      "privacy", "personal data", "who can see", "aadhaar", "confidential",
      "தனியுரிமை", "தகவல்", "யார் பார்ப்பார்", "data protection", "is it public",
      "my name public", "safe",
    ],
    answer: {
      en:
        "The public pages carry project information, not personal information. Project names, stages, extents, published notices and aggregate figures are open. Names, contact details, bank details and identity numbers are not on the public side.\n\nInside the system, access is scoped by role and by jurisdiction: a district officer sees their own district's projects and no others, through every route including search and notifications, and a role that has no business with a record cannot reach it. Aadhaar numbers are masked at the point a document is read — the last four digits are kept and the full number is never stored.\n\nAnd the access itself is recorded. Every action on a record is written to the audit trail with the officer's name and the timestamp, which means the question \"who looked at my file\" has an answer rather than an assurance.",
      ta:
        "பொதுப் பக்கங்களில் திட்டத் தகவல் உள்ளது, தனிப்பட்ட தகவல் அல்ல. திட்டப் பெயர்கள், கட்டங்கள், பரப்பளவுகள், வெளியிடப்பட்ட அறிவிப்புகள், மொத்த எண்கள் — இவை திறந்தவை. பெயர்கள், தொடர்பு விவரங்கள், வங்கி விவரங்கள், அடையாள எண்கள் பொதுப் பக்கத்தில் இல்லை.\n\nஅமைப்பினுள், அணுகல் பங்கு மற்றும் அதிகார எல்லைப்படி வரையறுக்கப்பட்டுள்ளது: மாவட்ட அதிகாரி தன் மாவட்டத்தின் திட்டங்களை மட்டுமே பார்ப்பார். ஆதார் எண்கள் ஆவணம் படிக்கப்படும்போதே மறைக்கப்படுகின்றன — கடைசி நான்கு இலக்கங்கள் மட்டும், முழு எண் சேமிக்கப்படுவதில்லை.\n\nஅணுகலும் பதிவாகிறது. ஒவ்வொரு நடவடிக்கையும் அதிகாரியின் பெயர் மற்றும் நேரத்துடன் தணிக்கைப் பதிவில் எழுதப்படும்.",
    },
    followUps: ["sys-audit-trail", "grv-anonymous", "sys-need-account"],
  },
  {
    id: "sys-audit-trail",
    category: "system",
    question: {
      en: "What is the audit trail and why does it matter to me?",
      ta: "தணிக்கைப் பதிவு என்றால் என்ன? அது எனக்கு ஏன் முக்கியம்?",
    },
    keywords: [
      "audit", "audit trail", "log", "history", "who changed", "tamper",
      "தணிக்கை", "பதிவு", "வரலாறு", "yார் மாற்றினார்", "proof", "evidence",
      "cannot be changed", "hash",
    ],
    answer: {
      en:
        "Every action that changes a record writes a row: who did it, when, what the value was before, and what it became. Each row is anchored to a hash of the one before it, so the chain cannot be edited afterwards without the break being detectable.\n\nWhy this matters to you rather than to an auditor: it turns disputes about what happened into questions with answers. If a possession was marked, the row says which officer marked it and on what date, with the field photographs they uploaded attached. If a compensation figure changed, the row shows the figure before and after and who changed it. \"The system must have made a mistake\" and \"I never marked that\" both become checkable claims.\n\nYou can see the history on your own parcel and on any grievance you have filed. An officer's actions can be replayed in order. That is the difference between a record you are asked to trust and a record you can test.",
      ta:
        "ஒரு பதிவை மாற்றும் ஒவ்வொரு நடவடிக்கையும் ஒரு வரியை எழுதுகிறது: யார் செய்தார், எப்போது, முன் மதிப்பு என்ன, பின் என்னவானது. ஒவ்வொரு வரியும் அதற்கு முந்தைய வரியின் ஹாஷுடன் இணைக்கப்பட்டுள்ளது, எனவே சங்கிலியை பின்னர் மாற்றினால் அது கண்டுபிடிக்கப்படும்.\n\nஇது உங்களுக்கு ஏன் முக்கியம்: என்ன நடந்தது என்ற தகராறுகளை பதிலுள்ள கேள்விகளாக மாற்றுகிறது. கையகப்படுத்தல் குறிக்கப்பட்டால், எந்த அதிகாரி எந்த தேதியில் குறித்தார், அவர் பதிவேற்றிய கள புகைப்படங்களுடன் தெரியும். இழப்பீட்டுத் தொகை மாறினால், முன்-பின் தொகையும் யார் மாற்றினார் என்பதும் தெரியும்.\n\nஉங்கள் நிலம் மற்றும் நீங்கள் தாக்கல் செய்த மனுவின் வரலாற்றைப் பார்க்கலாம். இது நம்பச் சொல்லப்படும் பதிவுக்கும், சோதிக்கக்கூடிய பதிவுக்கும் உள்ள வேறுபாடு.",
    },
    followUps: ["grv-what-happens", "sys-privacy", "poss-verification-visit"],
  },
  {
    id: "sys-ai-explain",
    category: "system",
    question: {
      en: "Is the AI on this site real? How does it work?",
      ta: "இந்த வலைதளத்தின் AI உண்மையானதா? அது எவ்வாறு வேலை செய்கிறது?",
    },
    keywords: [
      "ai", "artificial intelligence", "machine learning", "model", "how does ai work",
      "risk score", "prediction", "is it real ai", "செயற்கை நுண்ணறிவு", "மாதிரி",
      "black box", "trained", "accuracy", "algorithm", "fake ai", "chatbot how",
    ],
    answer: {
      en:
        "Four things are labelled as intelligence here, and none of them is a trained model. That is a deliberate position, not a shortcoming — a government decision has to be defensible in court, and a number you cannot explain is a liability there.\n\n• **Risk score** — a weighted sum of six signals the project already holds: open grievances, breached and at-risk statutory deadlines, the vulnerable-household share, land not yet possessed, and active litigation. Each term's weight and its arithmetic are printed next to the score.\n• **Land-rate projection** — a base rate with four percentage adjustments: time since the rate was last revised, local acquisition activity, land classification, and a district variance. It is a planning aid, and it is explicitly not the market value for an award, which s.26 defines quite differently.\n• **Encroachment monitoring** — a deterministic check over parcel status, time since possession and impact-zone position. There is no live satellite feed and no change-detection model. A flag means \"send someone to look\", never a finding.\n• **Document reading** — template extraction per document category, with field-level confidence. No character recognition runs on images, so a photograph of a page reads at a capped confidence and the answer says why.\n\nThe test to apply: change one input and see whether one line of the working changes in a way you can follow. If it does, it is arithmetic and you can check it. That is the whole claim being made.",
      ta:
        "இங்கே நான்கு விஷயங்கள் நுண்ணறிவு என்று குறிக்கப்பட்டுள்ளன; அவற்றில் எதுவும் பயிற்றுவிக்கப்பட்ட மாதிரி அல்ல. இது வேண்டுமென்றே எடுக்கப்பட்ட நிலைப்பாடு — அரசு முடிவு நீதிமன்றத்தில் நிலைக்க வேண்டும், விளக்க முடியாத எண் அங்கே பாதகம்.\n\n• **அபாய மதிப்பெண்** — திட்டத்தில் ஏற்கனவே உள்ள ஆறு தகவல்களின் எடையிட்ட கூட்டல்: நிலுவைக் குறைகள், மீறப்பட்ட மற்றும் ஆபத்தில் உள்ள காலக்கெடுக்கள், பாதிக்கப்படக்கூடிய குடும்பங்களின் விகிதம், கையகப்படுத்தப்படாத நிலம், நடப்பு வழக்குகள். ஒவ்வொன்றின் எடையும் கணக்கும் மதிப்பெண்ணுடன் அச்சிடப்படும்.\n• **நில விலை கணிப்பு** — அடிப்படை விலையுடன் நான்கு சதவீத சரிசெய்தல்கள். இது திட்டமிடல் கருவி; பிரிவு 26 வரையறுக்கும் தீர்ப்புக்கான சந்தை மதிப்பு அல்ல.\n• **ஆக்கிரமிப்பு கண்காணிப்பு** — நிலையான சரிபார்ப்பு. நேரலை செயற்கைக்கோள் தரவு இல்லை, மாதிரி இல்லை. குறியீடு \"போய்ப் பாருங்கள்\" என்பதே, முடிவு அல்ல.\n• **ஆவணம் படித்தல்** — ஆவண வகைப்படி வார்ப்புரு பிரித்தெடுத்தல். படங்களில் எழுத்து அறிதல் இயங்காது.\n\nசோதனை: ஒரு தகவலை மாற்றி, கணக்கின் ஒரு வரி நீங்கள் பின்தொடரக்கூடிய வகையில் மாறுகிறதா என்று பாருங்கள். மாறினால் அது கணிதம், நீங்கள் சரிபார்க்க முடியும்.",
    },
    followUps: ["poss-encroachment", "doc-what-is-extracted", "comp-formula"],
  },
  {
    id: "sys-tamil",
    category: "system",
    question: {
      en: "Is this available in Tamil?",
      ta: "இது தமிழில் கிடைக்குமா?",
    },
    keywords: [
      "tamil", "language", "in tamil", "தமிழ்", "மொழி", "translate",
      "language switch", "english only", "regional language", "vernacular",
    ],
    answer: {
      en:
        "Yes — the whole journey, not only the front page. The labels, the calculation steps, the legal references, the workflow messages, the error messages and the notices are all in both languages, and the switch carries through the officer console as well as the public side.\n\nI answer in Tamil too. Ask in Tamil and you get Tamil back; ask in English and you get English. You can mix them in one question and it will still match.\n\nIf you find an untranslated string anywhere, that is a defect worth reporting — a portal for a state where most people read Tamil more comfortably than English is not finished while any part of it is English-only.",
      ta:
        "ஆம் — முதல் பக்கம் மட்டுமல்ல, முழு பயணமும். பெயர்கள், கணக்குப் படிகள், சட்டப் பிரிவுகள், நடைமுறை செய்திகள், பிழைச் செய்திகள், அறிவிப்புகள் அனைத்தும் இரு மொழிகளிலும். மொழி மாற்றம் பொதுப் பக்கத்திலும் அதிகாரி பக்கத்திலும் தொடர்கிறது.\n\nநானும் தமிழில் பதிலளிக்கிறேன். தமிழில் கேளுங்கள், தமிழில் பதில் வரும். ஒரே கேள்வியில் இரு மொழிகளையும் கலந்தாலும் பொருந்தும்.\n\nமொழிபெயர்க்கப்படாத ஏதேனும் இடம் கண்டால் அதைத் தெரிவியுங்கள் — பெரும்பாலானோர் தமிழில் வாசிக்கும் மாநிலத்தின் வலைதளம், எந்தப் பகுதி ஆங்கிலத்தில் மட்டும் இருந்தாலும் முடிந்ததல்ல.",
    },
    followUps: ["help-languages", "help-voice", "sys-what-is-this"],
  },
  {
    id: "sys-offline",
    category: "system",
    question: {
      en: "Does this work without internet?",
      ta: "இணையம் இல்லாமல் இது வேலை செய்யுமா?",
    },
    keywords: [
      "offline", "no internet", "no signal", "network", "இணையம் இல்லாமல்",
      "சிக்னல்", "village no network", "works offline", "sync", "remote area",
    ],
    answer: {
      en:
        "The field verification side does, because it has to — acquisition happens in villages where there is no signal. The parcel list, the boundaries, the map tiles and recent photographs are cached on the device, so an officer can verify parcels, photograph them and update status with no connection at all. When the signal returns everything syncs, and the sync log keeps both timestamps: when the work was done and when it reached the server.\n\nThat second timestamp is not a technical detail. It is what proves the officer was on site when they said they were, if anyone later disputes it.\n\nThe public pages need a connection to load, though once a page is open it stays usable. If you are somewhere with no signal, the taluk office and the e-Sevai centre can do all of this for you.",
      ta:
        "கள சரிபார்ப்புப் பகுதி வேலை செய்யும் — செய்ய வேண்டியது அவசியம், ஏனெனில் கையகப்படுத்தல் சிக்னல் இல்லாத கிராமங்களில் நடக்கிறது. நிலப் பட்டியல், எல்லைகள், வரைபடம், சமீபத்திய புகைப்படங்கள் சாதனத்தில் சேமிக்கப்படுகின்றன. இணைப்பே இல்லாமல் அதிகாரி நிலங்களைச் சரிபார்க்கலாம், புகைப்படம் எடுக்கலாம், நிலையை மாற்றலாம். சிக்னல் வந்தபின் அனைத்தும் ஒத்திசைக்கப்படும், ஒத்திசைவுப் பதிவு இரு நேரங்களையும் வைத்திருக்கும்.\n\nஅந்த இரண்டாவது நேரம் தொழில்நுட்ப விவரம் அல்ல — அதிகாரி சொன்ன நேரத்தில் அந்த இடத்தில் இருந்தார் என்பதற்கு அதுவே ஆதாரம்.\n\nபொதுப் பக்கங்கள் ஏற்றுவதற்கு இணைப்பு தேவை. சிக்னல் இல்லாத இடத்தில் இருந்தால், வட்டாட்சியர் அலுவலகம் அல்லது இ-சேவை மையம் இதையெல்லாம் உங்களுக்குச் செய்யும்.",
    },
    followUps: ["poss-verification-visit", "help-which-office"],
  },
  {
    id: "sys-official",
    category: "system",
    question: {
      en: "Is this an official government site?",
      ta: "இது அதிகாரப்பூர்வ அரசு வலைதளமா?",
    },
    keywords: [
      "official", "government", "genuine", "authentic", "real site", "trust",
      "அதிகாரப்பூர்வ", "அரசு", "உண்மையானதா", "fake", "can i rely on this",
      "is this legal", "valid",
    ],
    answer: {
      en:
        "This is a Government of Tamil Nadu land management platform, operated for the Commissionerate of Land Administration and the district revenue offices.\n\nWhat that means for how far you can rely on it: the project data, stages and published documents here are the department's own records, and a document downloaded from here is a true copy of what is on the file. A grievance filed here is registered with a tracking number and a statutory deadline, and it is the same case an officer sees.\n\nWhat it does not replace: a certified copy for court use, which the Collector's office issues, and legal advice on your own facts. And a figure from the compensation calculator is an estimate you can check the working of — the amount that binds is the award order for your parcel.",
      ta:
        "இது தமிழ்நாடு அரசின் நில நிர்வாகத் தளம், நில நிர்வாக ஆணையரகம் மற்றும் மாவட்ட வருவாய் அலுவலகங்களுக்காக இயக்கப்படுகிறது.\n\nஎவ்வளவு நம்பலாம்: இங்குள்ள திட்டத் தகவல், கட்டங்கள், வெளியிடப்பட்ட ஆவணங்கள் துறையின் சொந்தப் பதிவுகள். இங்கிருந்து பதிவிறக்கிய ஆவணம் கோப்பில் உள்ளதின் உண்மை நகல். இங்கே தாக்கல் செய்த மனு கண்காணிப்பு எண் மற்றும் சட்டக் காலக்கெடுவுடன் பதிவாகும் — அதிகாரி பார்ப்பதும் அதே வழக்கே.\n\nஇது மாற்றாகாதவை: நீதிமன்றத்திற்கான சான்றளிக்கப்பட்ட நகல் (ஆட்சியர் அலுவலகம் வழங்கும்), மற்றும் உங்கள் வழக்குக்கான சட்ட ஆலோசனை. கணக்கிடும் கருவியின் எண் ஒரு மதிப்பீடு — கட்டுப்படுத்துவது உங்கள் நிலத்திற்கான தீர்ப்பு ஆணையே.",
    },
    followUps: ["doc-download-notice", "help-talk-to-person", "sys-what-is-this"],
  },
];
