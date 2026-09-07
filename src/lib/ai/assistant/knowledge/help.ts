/**
 * Help, contact and meta answers.
 *
 * The category that catches everything, including the two answers that decide
 * whether the assistant is trusted: what it can actually do, and what to do
 * when it cannot help. An assistant that apologises and stops is worse than a
 * static FAQ, so `help-not-my-question` always routes to a person.
 *
 * `help-illiterate` exists because the most likely user of a land-acquisition
 * help desk in a Tamil Nadu village is someone who will not be typing at all —
 * a relative or a VAO will be operating the phone for them. Writing for that
 * situation instead of pretending it away is the difference between a portal
 * that is accessible and one that says it is.
 */

import type { KnowledgeEntry } from "../types";

export const HELP_ENTRIES: KnowledgeEntry[] = [
  {
    id: "help-what-can-you-do",
    category: "help",
    question: { en: "What can you help me with?", ta: "நீங்கள் எதற்கு உதவ முடியும்?" },
    keywords: [
      "what can you do", "help", "how do you work", "what do you know",
      "capabilities", "உதவி", "என்ன செய்ய முடியும்", "who are you", "vani",
      "assistant", "options", "menu", "commands",
    ],
    answer: {
      en:
        "I can look up any project's stage and what happens next, and I can answer questions on ten subjects: compensation, rehabilitation and resettlement, project stages, complaints and objections, documents and certificates, finding your land, your rights under the Act, possession and land use, using this portal, and where to get human help.\n\nTwo ways to ask. Type a question in your own words, in Tamil or English — you do not need the official term, and \"how much money will I get\" works as well as \"quantum of compensation\". Or tap a subject and pick from the questions written out under it, which is faster if you are not sure what to ask.\n\nWhat I cannot do: give you legal advice on your own case, tell you the outcome of a pending decision, or change anything on your record. For those, file a grievance or speak to your taluk office.",
      ta:
        "எந்தத் திட்டத்தின் கட்டத்தையும், அடுத்து என்ன நடக்கும் என்பதையும் சொல்ல முடியும். மேலும் பத்து தலைப்புகளில் பதிலளிக்க முடியும்: இழப்பீடு, மறுவாழ்வு, திட்டக் கட்டங்கள், குறைகள் மற்றும் ஆட்சேபணைகள், ஆவணங்கள், உங்கள் நிலத்தைக் கண்டறிதல், சட்ட உரிமைகள், கையகப்படுத்தல், இந்த வலைதளம், மனித உதவி.\n\nகேட்க இரண்டு வழி. உங்கள் சொந்த வார்த்தைகளில் தமிழிலோ ஆங்கிலத்திலோ தட்டச்சு செய்யுங்கள் — அதிகாரப்பூர்வ சொல் தெரிய வேண்டியதில்லை. அல்லது ஒரு தலைப்பைத் தட்டி, அதற்குக் கீழே எழுதப்பட்ட கேள்விகளில் ஒன்றைத் தேர்ந்தெடுங்கள்.\n\nநான் செய்ய முடியாதவை: உங்கள் வழக்குக்கான சட்ட ஆலோசனை, நிலுவையில் உள்ள முடிவின் விளைவு, உங்கள் பதிவில் மாற்றம். அவற்றுக்கு குறை மனு தாக்கல் செய்யுங்கள் அல்லது வட்டாட்சியர் அலுவலகத்தை அணுகுங்கள்.",
    },
    followUps: ["help-not-my-question", "land-find-my-parcel", "comp-how-much"],
  },
  {
    id: "help-talk-to-person",
    category: "help",
    question: { en: "I want to talk to a real person.", ta: "நான் ஒரு நிஜ நபருடன் பேச வேண்டும்." },
    keywords: [
      "talk to person", "human", "officer", "call", "phone number", "helpline",
      "நபருடன் பேச", "தொலைபேசி", "அதிகாரி", "contact number", "speak to someone",
      "customer care", "call me",
    ],
    answer: {
      en:
        "For anything about your own land, the taluk office and the district Collectorate are the places where a decision can actually be made — I can tell you what the rules are, but only they can change a record.\n\nBefore you go, two things make the visit much shorter. Bring your survey number or patta number, and bring a grievance tracking number if you have filed one: a case with a number and a date on the file is treated differently from a verbal enquiry at a counter, and the officer can pull it up while you are standing there.\n\nIf you cannot get a hearing, file a grievance here first. It puts your request on the record with a date and a response deadline, and an unanswered one becomes visible to the state above the district.",
      ta:
        "உங்கள் சொந்த நிலம் தொடர்பான எதற்கும், வட்டாட்சியர் அலுவலகம் மற்றும் மாவட்ட ஆட்சியர் அலுவலகமே முடிவெடுக்கும் இடங்கள் — நான் விதிகளைச் சொல்ல முடியும், பதிவை மாற்ற அவர்களே முடியும்.\n\nபோகும் முன் இரண்டு விஷயங்கள் வருகையைக் குறைக்கும். உங்கள் நில அளவை எண் அல்லது பட்டா எண்ணைக் கொண்டு செல்லுங்கள்; ஏற்கனவே மனு தாக்கல் செய்திருந்தால் கண்காணிப்பு எண்ணையும். எண் மற்றும் தேதியுடன் கோப்பில் உள்ள வழக்கு, வாய்மொழி விசாரணையிலிருந்து வேறுபட்டு நடத்தப்படும்.\n\nவிசாரணை கிடைக்காவிட்டால், முதலில் இங்கே குறை மனு தாக்கல் செய்யுங்கள் — தேதி மற்றும் பதில் காலக்கெடுவுடன் பதிவாகும்.",
    },
    followUps: ["help-which-office", "grv-how-to-file", "grv-escalate"],
  },
  {
    id: "help-which-office",
    category: "help",
    question: {
      en: "Which office should I go to?",
      ta: "நான் எந்த அலுவலகத்திற்குச் செல்ல வேண்டும்?",
    },
    keywords: [
      "which office", "where to go", "taluk", "collectorate", "vao", "e-sevai",
      "எந்த அலுவலகம்", "எங்கே போக", "office address", "revenue office",
      "tahsildar office", "sub registrar",
    ],
    answer: {
      en:
        "It depends what you need, and going to the wrong one costs a day:\n\n• **Village Administrative Officer** — local verification, and confirming who is in occupation.\n• **Taluk office (Tahsildar)** — patta and chitta extracts, name corrections, mutation, legal heir certificates.\n• **Survey & Settlement office** — FMB sketches, re-measurement, boundary and subdivision disputes.\n• **Sub-Registrar** — encumbrance certificates, guideline values, sale deed copies.\n• **District Collectorate (Land Acquisition section)** — the acquisition itself: objections, the award, the compensation, and the R&R scheme.\n• **e-Sevai centre** — most extracts and certificates, without the queue.\n\nSo: anything about the amount or the acquisition goes to the Collectorate. Anything about the record of your land goes to the taluk office or Survey. If you are unsure, the Collectorate's land acquisition section can tell you which — and the officer handling your project is named on its project page here.",
      ta:
        "என்ன தேவை என்பதைப் பொறுத்தது; தவறான இடத்திற்குச் செல்வது ஒரு நாளை வீணாக்கும்:\n\n• **கிராம நிர்வாக அதிகாரி** — உள்ளூர் சரிபார்ப்பு, யார் அனுபவத்தில் உள்ளார் என்பதை உறுதிப்படுத்துதல்.\n• **வட்டாட்சியர் அலுவலகம்** — பட்டா, சிட்டா, பெயர் திருத்தம், பட்டா மாற்றம், வாரிசு சான்றிதழ்.\n• **நில அளவைத் துறை** — FMB வரைபடம், மறு அளவீடு, எல்லை மற்றும் உட்பிரிவு தகராறு.\n• **சார்பதிவாளர்** — வில்லங்கச் சான்றிதழ், வழிகாட்டி மதிப்பு, பத்திர நகல்.\n• **மாவட்ட ஆட்சியர் அலுவலகம் (நில கையகப்படுத்தல் பிரிவு)** — கையகப்படுத்தல், ஆட்சேபணை, தீர்ப்பு, இழப்பீடு, மறுவாழ்வுத் திட்டம்.\n• **இ-சேவை மையம்** — பெரும்பாலான சான்றிதழ்கள், வரிசை இல்லாமல்.\n\nதொகை அல்லது கையகப்படுத்தல் பற்றி — ஆட்சியர் அலுவலகம். உங்கள் நிலப் பதிவு பற்றி — வட்டாட்சியர் அல்லது நில அளவை.",
    },
    followUps: ["help-talk-to-person", "doc-patta", "status-who-is-officer"],
  },
  {
    id: "help-languages",
    category: "help",
    question: {
      en: "What languages can I ask in?",
      ta: "எந்த மொழிகளில் கேட்கலாம்?",
    },
    keywords: [
      "languages", "which language", "tamil english", "மொழிகள்", "தமிழில் கேட்கலாமா",
      "can i type tamil", "tanglish", "transliteration", "hindi",
    ],
    answer: {
      en:
        "Tamil and English, in either script and mixed freely. Tamil typed in English letters works too — \"ilappeedu evvalavu\", \"patta illa\", \"survey number enna\" all match, because the transliterations people actually type are in the keyword lists.\n\nI reply in the language you asked in. If you switch mid-conversation, I switch with you.\n\nIf you ask in a language I do not handle, you will get the category menu rather than a wrong answer, and the taluk office and e-Sevai centre can help in person.",
      ta:
        "தமிழ் மற்றும் ஆங்கிலம், எந்த எழுத்துவடிவத்திலும், கலந்தும் கேட்கலாம். ஆங்கில எழுத்துகளில் தட்டச்சு செய்த தமிழும் வேலை செய்யும் — \"ilappeedu evvalavu\", \"patta illa\", \"survey number enna\" எல்லாம் பொருந்தும்.\n\nநீங்கள் கேட்ட மொழியிலேயே பதிலளிக்கிறேன். இடையில் மொழி மாற்றினால் நானும் மாறுவேன்.\n\nநான் கையாளாத மொழியில் கேட்டால், தவறான பதிலுக்குப் பதிலாக தலைப்புப் பட்டியல் காட்டப்படும்.",
    },
    followUps: ["sys-tamil", "help-voice", "help-what-can-you-do"],
  },
  {
    id: "help-voice",
    category: "help",
    question: {
      en: "Can I speak instead of typing?",
      ta: "தட்டச்சு செய்யாமல் பேசலாமா?",
    },
    keywords: [
      "voice", "speak", "microphone", "audio", "talk", "பேச", "குரல்", "மைக்",
      "speech", "read aloud", "listen", "cannot type", "voice search",
    ],
    answer: {
      en:
        "Yes — press the microphone and ask your question aloud, in Tamil or English. The answer is read back to you as well as written out, so it works if reading is difficult.\n\nThe transcript stays on screen either way. That is deliberate: if the speech recognition mishears a survey number or a village name, you can see what it heard and correct it rather than acting on a wrong answer.\n\nSome older browsers and some phones do not support speech at all. If yours does not, the microphone button simply will not appear and everything else still works — nothing is only available by voice.",
      ta:
        "ஆம் — மைக்ரோஃபோனை அழுத்தி, தமிழிலோ ஆங்கிலத்திலோ உங்கள் கேள்வியைச் சொல்லுங்கள். பதில் எழுத்திலும் காட்டப்படும், சத்தமாகவும் வாசிக்கப்படும் — வாசிப்பது கடினமாக இருந்தால் இது உதவும்.\n\nஎப்படியிருந்தாலும் உரையாடல் திரையில் இருக்கும். இது வேண்டுமென்றே: குரல் அறிதல் நில அளவை எண்ணையோ கிராமப் பெயரையோ தவறாகக் கேட்டால், அது என்ன கேட்டது என்று பார்த்துத் திருத்தலாம்.\n\nசில பழைய உலாவிகளில் குரல் வசதி இல்லை. இல்லாவிட்டால் மைக் பொத்தான் தோன்றாது, மற்ற அனைத்தும் வேலை செய்யும் — எதுவும் குரல் மூலம் மட்டுமே கிடைப்பதில்லை.",
    },
    followUps: ["help-illiterate", "help-languages"],
  },
  {
    id: "help-illiterate",
    category: "help",
    question: {
      en: "I cannot read well. How can I use this?",
      ta: "எனக்கு நன்றாக வாசிக்கத் தெரியாது. இதை எப்படிப் பயன்படுத்துவது?",
    },
    keywords: [
      "cannot read", "illiterate", "no education", "difficult to read", "old",
      "வாசிக்க தெரியாது", "படிக்கவில்லை", "help me use", "someone else",
      "my son will do", "elderly", "blind",
    ],
    answer: {
      en:
        "Three ways, and none of them requires you to read a screen.\n\nPress the microphone, ask your question aloud in Tamil, and the answer is read back to you. That is the fastest route on your own.\n\nAnyone can operate this for you — a family member, a neighbour, the Village Administrative Officer, or the staff at an e-Sevai centre. Nothing here needs your password, because filing a grievance and looking up a parcel need no login at all. Give them your survey number or patta number and they can do the whole thing.\n\nAnd nothing on this portal is a substitute for going to the taluk office if that is easier for you. Filing here creates a record with a date, which helps you — but a person at a counter can do the same thing, and you lose no right by going in person.",
      ta:
        "மூன்று வழிகள் உள்ளன; எதற்கும் நீங்கள் திரையை வாசிக்க வேண்டியதில்லை.\n\nமைக்ரோஃபோனை அழுத்தி, தமிழில் சத்தமாகக் கேள்வி கேளுங்கள் — பதில் உங்களுக்கு வாசித்துக் காட்டப்படும். தனியாகச் செய்ய இதுவே எளிய வழி.\n\nஉங்களுக்காக யாரும் இதைப் பயன்படுத்தலாம் — குடும்பத்தார், அருகில் உள்ளவர், கிராம நிர்வாக அதிகாரி, அல்லது இ-சேவை மைய ஊழியர். இங்கே எதற்கும் உங்கள் கடவுச்சொல் தேவையில்லை — குறை மனு தாக்கல் செய்வதற்கும் நிலம் தேடுவதற்கும் உள்நுழைவே தேவையில்லை. உங்கள் அளவை எண் அல்லது பட்டா எண்ணைக் கொடுத்தால் அவர்கள் முழுவதையும் செய்யலாம்.\n\nவட்டாட்சியர் அலுவலகத்திற்குச் செல்வது உங்களுக்கு எளிதாக இருந்தால், இந்த வலைதளம் அதற்கு மாற்று அல்ல. நேரில் சென்றால் எந்த உரிமையையும் இழக்க மாட்டீர்கள்.",
    },
    followUps: ["help-voice", "help-which-office", "grv-how-to-file"],
  },
  {
    id: "help-not-my-question",
    category: "help",
    question: {
      en: "You did not answer my question.",
      ta: "நீங்கள் எனது கேள்விக்குப் பதிலளிக்கவில்லை.",
    },
    keywords: [
      "wrong answer", "not my question", "did not answer", "useless", "not helpful",
      "பதில் இல்லை", "தவறான பதில்", "you don't understand", "try again",
      "that's not what i asked", "nonsense",
    ],
    answer: {
      en:
        "Fair enough. Three things that usually fix it:\n\nTry naming the specific thing — a survey number, a patta number, a project name or a district gets a much better match than a general description. Or tap a subject below and pick a written-out question, which avoids the guessing entirely.\n\nIf the question is about your own case — what your award will be, why a particular decision was made, when your money will arrive — I cannot answer it, because I do not have your file and I am not the officer deciding it. File a grievance and it goes to someone who does, with a tracking number and a response deadline.\n\nAnd if I have simply got it wrong, that is worth reporting. A question a citizen asks that this help desk cannot answer is a gap in the help desk, not in the question.",
      ta:
        "நியாயமான குறை. வழக்கமாக இதைச் சரிசெய்யும் மூன்று வழிகள்:\n\nகுறிப்பிட்ட விஷயத்தைப் பெயரிட்டுச் சொல்லுங்கள் — நில அளவை எண், பட்டா எண், திட்டப் பெயர் அல்லது மாவட்டம் — பொதுவான விளக்கத்தைவிட இது சிறந்த பதிலைத் தரும். அல்லது கீழே ஒரு தலைப்பைத் தட்டி, எழுதப்பட்ட கேள்வியைத் தேர்ந்தெடுங்கள்.\n\nகேள்வி உங்கள் சொந்த வழக்கு பற்றியதாக இருந்தால் — உங்கள் தொகை என்ன, ஒரு முடிவு ஏன் எடுக்கப்பட்டது, பணம் எப்போது வரும் — என்னால் பதிலளிக்க முடியாது; உங்கள் கோப்பு என்னிடம் இல்லை, முடிவெடுக்கும் அதிகாரியும் நான் அல்ல. குறை மனு தாக்கல் செய்யுங்கள் — கண்காணிப்பு எண் மற்றும் பதில் காலக்கெடுவுடன் சம்பந்தப்பட்டவரிடம் செல்லும்.\n\nநான் தவறாகப் புரிந்திருந்தால் அதைத் தெரிவியுங்கள். ஒரு குடிமகனின் கேள்விக்கு இந்த உதவி மையம் பதிலளிக்க முடியாதது, கேள்வியின் குறை அல்ல — உதவி மையத்தின் குறை.",
    },
    followUps: ["help-what-can-you-do", "grv-how-to-file", "help-talk-to-person"],
  },
  {
    id: "help-report-portal-bug",
    category: "help",
    question: {
      en: "Something on this website is broken. Where do I report it?",
      ta: "இந்த வலைதளத்தில் ஏதோ சரியாக இயங்கவில்லை. எங்கே தெரிவிப்பது?",
    },
    keywords: [
      "bug", "broken", "error", "not working", "page not loading", "problem with site",
      "பிழை", "வேலை செய்யவில்லை", "technical issue", "report problem", "crash",
      "blank page", "wrong information on site",
    ],
    answer: {
      en:
        "File it as a grievance and say it is about the portal rather than about a parcel. Include the page you were on, what you were trying to do, and what happened instead — those three things are usually enough to reproduce it.\n\nIf the information on a page is wrong rather than the page being broken — a wrong extent, a wrong stage, a document filed against the wrong project — that is more urgent than a technical fault, because a record that is wrong can affect a decision. Say which record and what it should say, and it goes to the district office that owns the data rather than to a technical queue.\n\nIf a page will not load at all, the taluk office and the e-Sevai centre can do the same tasks for you in the meantime. Do not let a website problem run down a statutory deadline — a grievance filed on paper at the office on the same day protects the date just as well.",
      ta:
        "குறை மனுவாகத் தாக்கல் செய்து, அது நிலம் பற்றி அல்ல, வலைதளம் பற்றி என்று குறிப்பிடுங்கள். நீங்கள் இருந்த பக்கம், என்ன செய்ய முயன்றீர்கள், அதற்குப் பதிலாக என்ன நடந்தது — இந்த மூன்றும் போதும்.\n\nபக்கம் இயங்காதது அல்ல, பக்கத்தில் உள்ள தகவலே தவறு என்றால் — தவறான பரப்பளவு, தவறான கட்டம், தவறான திட்டத்தில் தாக்கல் செய்யப்பட்ட ஆவணம் — அது இன்னும் அவசரம், ஏனெனில் தவறான பதிவு ஒரு முடிவைப் பாதிக்கும். எந்தப் பதிவு, என்னவாக இருக்க வேண்டும் என்று சொல்லுங்கள்.\n\nபக்கமே ஏற்றப்படாவிட்டால், அதுவரை வட்டாட்சியர் அலுவலகம் அல்லது இ-சேவை மையம் அதே வேலைகளைச் செய்யும். வலைதளப் பிரச்சினை காரணமாக சட்டக் காலக்கெடு கடந்துவிடக் கூடாது — அதே நாளில் அலுவலகத்தில் காகிதத்தில் மனு அளித்தாலும் தேதி பாதுகாக்கப்படும்.",
    },
    followUps: ["grv-how-to-file", "help-which-office"],
  },
];
