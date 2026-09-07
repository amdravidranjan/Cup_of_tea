/**
 * Grievance and objection answers.
 *
 * The distinction these answers keep making, because nobody outside a revenue
 * office knows it and it decides outcomes: objecting to the *acquisition* is a
 * s.15 remedy with a sixty-day window at the notification stage, while
 * challenging the *award* is a s.64 reference with a six-week window after the
 * award. People routinely spend the first window complaining about money and
 * then find the second one closed. Every answer here leads with the deadline.
 */

import type { KnowledgeEntry } from "../types";

export const GRIEVANCE_ENTRIES: KnowledgeEntry[] = [
  {
    id: "grv-how-to-file",
    category: "grievance",
    question: { en: "How do I file a complaint?", ta: "குறை மனுவை எவ்வாறு தாக்கல் செய்வது?" },
    keywords: [
      "file complaint", "how to complain", "grievance", "raise issue", "register complaint",
      "petition", "குறை", "மனு", "புகார்", "complain", "submit complaint", "file grievance",
      "where to complain",
    ],
    answer: {
      en:
        "From the Grievances page, or from any project page, without logging in. You need four things: your name and a mobile number, the project or survey number it concerns, what the problem is, and any document that supports it — a photograph of your patta, a sale deed, the enumeration list.\n\nYou get a tracking number the moment you submit. Keep it: it is how you follow the case, and it is proof of the date you raised it, which matters if a statutory window is running.\n\nBe specific about what you want changed. \"The extent recorded is 0.62 ha but my patta says 0.84 ha\" gets acted on; \"I am unhappy with the compensation\" has to be investigated before anyone knows what to do about it.",
      ta:
        "குறைகள் பக்கத்திலிருந்து, அல்லது எந்தத் திட்டப் பக்கத்திலிருந்தும் — உள்நுழையாமலேயே. நான்கு விஷயங்கள் தேவை: உங்கள் பெயர் மற்றும் கைபேசி எண், சம்பந்தப்பட்ட திட்டம் அல்லது நில அளவை எண், பிரச்சினை என்ன, ஆதரவு ஆவணம்.\n\nசமர்ப்பித்த உடனே கண்காணிப்பு எண் கிடைக்கும். அதைப் பாதுகாக்கவும் — வழக்கைப் பின்தொடர்வதற்கும், நீங்கள் மனு அளித்த தேதிக்கு ஆதாரமாகவும் அது தேவை.\n\nதுல்லியமாகக் குறிப்பிடுங்கள். \"பதிவான பரப்பளவு 0.62 ஹெ, ஆனால் பட்டாவில் 0.84 ஹெ\" என்பது உடனே நடவடிக்கைக்கு வரும்.",
    },
    links: [{ label: { en: "File a grievance", ta: "குறை தாக்கல்" }, href: "/grievances" }],
    followUps: ["grv-what-happens", "grv-track", "grv-how-long"],
  },
  {
    id: "grv-track",
    category: "grievance",
    question: {
      en: "How do I track a complaint I already filed?",
      ta: "ஏற்கனவே தாக்கல் செய்த மனுவை எவ்வாறு கண்காணிப்பது?",
    },
    keywords: [
      "track", "tracking number", "status of complaint", "check complaint",
      "reference number", "கண்காணிப்பு", "எண்", "நிலை", "where is my complaint",
      "lost tracking number", "acknowledgement",
    ],
    answer: {
      en:
        "Enter the tracking number on the Track page. You will see the current status, the officer it is assigned to, every status change with its date, what it is waiting on, and the date by which it must be answered.\n\nIf you have lost the tracking number, the office can find the case from your mobile number and the project — but keep the number if you can, because the search is slower and needs a person.",
      ta:
        "கண்காணிப்பு எண்ணை Track பக்கத்தில் உள்ளிடுங்கள். தற்போதைய நிலை, ஒதுக்கப்பட்ட அதிகாரி, ஒவ்வொரு நிலை மாற்றமும் அதன் தேதியுடன், எதற்காகக் காத்திருக்கிறது, எந்த தேதிக்குள் பதில் வர வேண்டும் — அனைத்தும் தெரியும்.\n\nஎண் தொலைந்துவிட்டால், உங்கள் கைபேசி எண் மற்றும் திட்டத்தின் மூலம் அலுவலகம் கண்டுபிடிக்கும் — ஆனால் அது மெதுவாக இருக்கும்.",
    },
    links: [{ label: { en: "Track a grievance", ta: "மனுவைக் கண்காணி" }, href: "/track" }],
    followUps: ["grv-how-long", "grv-escalate"],
  },
  {
    id: "grv-what-happens",
    category: "grievance",
    question: {
      en: "What happens after I file a complaint?",
      ta: "மனு தாக்கல் செய்த பிறகு என்ன நடக்கும்?",
    },
    keywords: [
      "what happens", "after filing", "process", "next step", "who reviews",
      "என்ன நடக்கும்", "அடுத்து", "will anyone read it", "who sees it", "investigation",
    ],
    answer: {
      en:
        "It is registered with a tracking number and a date, assigned to the officer whose remit it falls in, and given a deadline. Then it moves through recorded states — filed, assigned, under review, resolved or dismissed — and every one of those transitions is stamped with who made it and when.\n\nThat record is the part worth knowing about. Nothing on a grievance can be changed silently: the before-and-after of every change is written to a tamper-evident audit trail, so an assertion that a complaint was never received, or was closed without being read, can be checked against the file rather than argued about. If it is dismissed, the reason has to be recorded, and you can see it.",
      ta:
        "கண்காணிப்பு எண் மற்றும் தேதியுடன் பதிவாகி, சம்பந்தப்பட்ட அதிகாரிக்கு ஒதுக்கப்பட்டு, காலக்கெடு நிர்ணயிக்கப்படும். பின்னர் பதிவான நிலைகளில் நகரும் — தாக்கல், ஒதுக்கப்பட்டது, பரிசீலனையில், தீர்க்கப்பட்டது அல்லது நிராகரிக்கப்பட்டது. ஒவ்வொரு மாற்றத்திலும் யார், எப்போது என்று பதிவாகும்.\n\nஅந்தப் பதிவே முக்கியம். எந்த மாற்றமும் அமைதியாக நடக்க முடியாது — முன்-பின் நிலை திருத்த முடியாத தணிக்கைப் பதிவில் எழுதப்படுகிறது. நிராகரிக்கப்பட்டால் காரணம் பதிவாக வேண்டும், அதை நீங்கள் பார்க்கலாம்.",
    },
    followUps: ["sys-audit-trail", "grv-how-long", "grv-escalate"],
  },
  {
    id: "grv-how-long",
    category: "grievance",
    question: {
      en: "How long before I get a reply?",
      ta: "எவ்வளவு காலத்தில் பதில் கிடைக்கும்?",
    },
    keywords: [
      "how long", "reply", "response time", "deadline", "sla", "when will i hear",
      "எவ்வளவு நாள்", "பதில்", "காலக்கெடு", "no response", "no reply yet",
      "overdue",
    ],
    answer: {
      en:
        "Every grievance is given a response deadline when it is registered, and the Track page shows it — green while there is time, red once it has passed.\n\nIf the deadline passes without a reply, that is a breach and it is visible above the case, not buried in it. Breached cases surface on the district workload view and on the state officer's dashboard sorted by how overdue they are, which is the mechanism that makes an ignored complaint expensive to ignore. At that point escalate: the case shows the next level and you can raise it there citing the same tracking number.",
      ta:
        "ஒவ்வொரு குறை மனுவுக்கும் பதிவின் போது பதில் காலக்கெடு நிர்ணயிக்கப்படும். Track பக்கத்தில் அது தெரியும் — நேரம் இருக்கும்போது பச்சை, கடந்தபின் சிவப்பு.\n\nகாலக்கெடு கடந்தும் பதில் வராவிட்டால் அது மீறல், அது வழக்குக்கு மேலே தெரியும். மீறப்பட்ட வழக்குகள் மாவட்ட பணிச்சுமை பக்கத்திலும், மாநில அதிகாரியின் பக்கத்திலும் தாமதத்தின் அளவுப்படி வரிசைப்படுத்தப்படும். அப்போது மேல்முறையீடு செய்யுங்கள் — அடுத்த நிலை வழக்கிலேயே காட்டப்படும்.",
    },
    followUps: ["grv-escalate", "grv-track"],
  },
  {
    id: "grv-object-acquisition",
    category: "grievance",
    question: {
      en: "Can I object to the acquisition itself?",
      ta: "கையகப்படுத்தலையே எதிர்த்து ஆட்சேபிக்க முடியுமா?",
    },
    keywords: [
      "object", "objection", "section 15", "s15", "oppose", "against acquisition",
      "do not want to give land", "ஆட்சேபணை", "எதிர்ப்பு", "60 days", "sixty days",
      "refuse acquisition", "stop them taking",
    ],
    answer: {
      en:
        "Yes, and there is a specific window for it: sixty days from the publication of the s.11 notification, under s.15. Miss it and you are left arguing about the amount rather than about the taking.\n\nAn objection can be made on any of these grounds, and the Collector must hear you in person and record the objection with a reasoned recommendation to the Government:\n\n• The land is not needed for the stated purpose, or the purpose is not a public purpose\n• The extent proposed is more than is needed\n• Other land is available that would cause less damage\n• The land is irrigated multi-cropped land, which is protected\n• The SIA or the required consultation was not properly done\n\nFile it here so it is registered with a date, and attend the hearing. An objection that is on the record with a date is a different thing from a conversation at a counter.",
      ta:
        "ஆம், அதற்கு குறிப்பிட்ட காலம் உண்டு: பிரிவு 11 அறிவிப்பு வெளியிடப்பட்ட நாளிலிருந்து அறுபது நாட்கள், பிரிவு 15-இன் கீழ். அதைத் தவறவிட்டால் நிலம் எடுப்பதைப் பற்றி அல்ல, தொகையைப் பற்றி மட்டுமே வாதிட முடியும்.\n\nஇந்தக் காரணங்களில் ஆட்சேபிக்கலாம். ஆட்சியர் உங்களை நேரில் விசாரித்து, காரணத்துடன் அரசுக்குப் பரிந்துரைக்க வேண்டும்:\n\n• குறிப்பிட்ட நோக்கத்திற்கு நிலம் தேவையில்லை, அல்லது அது பொது நோக்கம் அல்ல\n• தேவைக்கு அதிகமான பரப்பளவு கோரப்படுகிறது\n• குறைவான சேதம் ஏற்படுத்தும் வேறு நிலம் உள்ளது\n• இது பாசன பல்பயிர் நிலம் — சட்டப் பாதுகாப்பு உண்டு\n• SIA அல்லது கலந்தாய்வு முறையாக நடத்தப்படவில்லை\n\nதேதியுடன் பதிவாக இங்கே தாக்கல் செய்யுங்கள், விசாரணைக்கு வாருங்கள்.",
    },
    basis: "s.15 — objections within sixty days; s.15(2) — right to be heard in person",
    links: [{ label: { en: "File an objection", ta: "ஆட்சேபணை தாக்கல்" }, href: "/grievances" }],
    followUps: ["rights-hearing", "rights-multi-crop", "status-what-is-notified"],
  },
  {
    id: "grv-escalate",
    category: "grievance",
    question: {
      en: "Nobody is responding. Who do I escalate to?",
      ta: "யாரும் பதிலளிக்கவில்லை. யாருக்கு மேல்முறையீடு செய்வது?",
    },
    keywords: [
      "escalate", "no response", "ignored", "higher authority", "next level",
      "மேல்முறையீடு", "பதில் இல்லை", "who is above", "complain about officer",
      "collector not responding", "state level",
    ],
    answer: {
      en:
        "In order: the Land Acquisition Officer, then the District Collector, then the Commissioner for Rehabilitation and Resettlement at the State level, then the LARR Authority — which is a judicial body, not an administrative one, and can determine compensation itself.\n\nThe practical step is to escalate on the existing tracking number rather than filing a fresh grievance, because a new number resets the clock and loses the history of the delay, which is your strongest fact. Say what you filed, when, and that the response deadline has passed.\n\nWhat makes escalation work here is that the delay is visible from above without you reporting it: breached deadlines appear on the state dashboard by district and by officer. An unanswered complaint is a number on someone's screen.",
      ta:
        "வரிசையாக: நில கையகப்படுத்தல் அதிகாரி, பின் மாவட்ட ஆட்சியர், பின் மாநில அளவில் மறுவாழ்வு ஆணையர், பின் LARR ஆணையம் — அது நீதித்துறை அமைப்பு, இழப்பீட்டை அதுவே தீர்மானிக்க முடியும்.\n\nநடைமுறையில், புதிய மனு தாக்கல் செய்யாமல் ஏற்கனவே உள்ள கண்காணிப்பு எண்ணிலேயே மேல்முறையீடு செய்யுங்கள் — புதிய எண் காலக்கெடுவை மீட்டமைத்து, தாமதத்தின் வரலாற்றை இழக்கச் செய்யும்.\n\nமீறப்பட்ட காலக்கெடுக்கள் மாநில அளவில் மாவட்டம் மற்றும் அதிகாரி வாரியாகத் தெரியும் — பதிலளிக்காத மனு ஒருவரின் திரையில் ஒரு எண்ணாகத் தெரிகிறது.",
    },
    basis: "s.44 (Commissioner for R&R); ss.51–64 (LARR Authority and references to it)",
    followUps: ["grv-court", "status-who-is-officer", "grv-how-long"],
  },
  {
    id: "grv-court",
    category: "grievance",
    question: {
      en: "Can I go to court? What is the LARR Authority?",
      ta: "நீதிமன்றம் செல்ல முடியுமா? LARR ஆணையம் என்றால் என்ன?",
    },
    keywords: [
      "court", "larr authority", "tribunal", "high court", "legal", "lawyer",
      "case", "நீதிமன்றம்", "ஆணையம்", "வழக்கு", "sue", "appeal", "section 64",
      "stay order",
    ],
    answer: {
      en:
        "The LARR Authority is the specialised judicial body for these disputes and it is usually the right first stop rather than the High Court. It hears references on compensation, on apportionment, and on R&R entitlements, and it can raise an award.\n\nThe route is s.64: a reference within six weeks of the award, or of the date you came to know of it. From the Authority's decision an appeal lies to the High Court within sixty days. You do not need a lawyer to make the reference, though for a contested valuation one helps.\n\nIf a court does grant a stay, this portal treats it as data with teeth: payment and possession on that project are blocked while the stay subsists, the block states the case number and the court, and an officer who tries anyway is refused and logged. That is deliberate — an order that only exists as a note on a file gets ignored.",
      ta:
        "LARR ஆணையம் இந்தத் தகராறுகளுக்கான சிறப்பு நீதித்துறை அமைப்பு; உயர் நீதிமன்றத்திற்கு முன் இதுவே சரியான இடம். இழப்பீடு, பங்கிடல், மறுவாழ்வு உரிமைகள் தொடர்பான பரிந்துரைகளை விசாரிக்கும், தொகையை உயர்த்த முடியும்.\n\nவழி பிரிவு 64: தீர்ப்பு அறிந்த ஆறு வாரங்களுக்குள் பரிந்துரை. ஆணையத்தின் முடிவுக்கு எதிராக அறுபது நாட்களுக்குள் உயர் நீதிமன்ற மேல்முறையீடு. பரிந்துரைக்கு வழக்கறிஞர் அவசியமில்லை.\n\nநீதிமன்றம் தடை விதித்தால், இந்த அமைப்பில் அந்தத் திட்டத்தில் பணம் மற்றும் கையகப்படுத்தல் முழுமையாகத் தடுக்கப்படும், வழக்கு எண்ணும் நீதிமன்றமும் காட்டப்படும்.",
    },
    basis: "ss.51–64 (LARR Authority, reference within six weeks); s.74 (appeal to the High Court within sixty days)",
    followUps: ["comp-disagree", "status-why-delayed"],
  },
  {
    id: "grv-anonymous",
    category: "grievance",
    question: {
      en: "Can I complain without giving my name?",
      ta: "பெயர் தெரிவிக்காமல் புகார் அளிக்க முடியுமா?",
    },
    keywords: [
      "anonymous", "anonymously", "complain anonymously", "complain without name",
      "without giving my name", "without name", "confidential", "afraid", "scared", "retaliation",
      "பெயர் இல்லாமல்", "ரகசியம்", "பயம்", "will they know", "identity", "privacy",
      "corruption complaint", "bribe",
    ],
    answer: {
      en:
        "A grievance about your own land needs your name, because the answer is about your record and nobody can be paid or corrected anonymously.\n\nA report about *conduct* — a demand for money, pressure to sign, a survey that was never done — is different, and can be made without identifying yourself. It will not produce a decision on your parcel, but it does go on the record and is visible to state-level oversight.\n\nOne thing worth knowing either way: this system's audit trail is not on the officer's side. Every action is recorded with the actor, the timestamp and the before-and-after state, in a chain that cannot be edited afterwards. If someone tells you a record has always said something, that is a checkable claim. If you are being pressured, say so in the grievance text — the pressure and the date it happened become part of the file.",
      ta:
        "உங்கள் சொந்த நிலம் தொடர்பான மனுவுக்கு உங்கள் பெயர் தேவை — பதில் உங்கள் பதிவு பற்றியது, பெயரில்லாமல் யாருக்கும் பணம் வழங்கவோ திருத்தவோ முடியாது.\n\nநடத்தை பற்றிய புகார் — பணம் கேட்பது, கையெழுத்திட நிர்பந்தம், நடக்காத கணக்கெடுப்பு — வேறு; பெயர் தெரிவிக்காமல் அளிக்கலாம். அது உங்கள் நிலத்தில் முடிவெடுக்காது, ஆனால் பதிவாகி மாநில அளவில் தெரியும்.\n\nஎப்படியிருந்தாலும் ஒன்று: இந்த அமைப்பின் தணிக்கைப் பதிவு அதிகாரியின் பக்கம் இல்லை. ஒவ்வொரு நடவடிக்கையும் யார், எப்போது, முன்-பின் நிலை என்று திருத்த முடியாத சங்கிலியில் பதிவாகும்.",
    },
    followUps: ["sys-privacy", "sys-audit-trail", "grv-how-to-file"],
  },
  {
    id: "grv-attach-documents",
    category: "grievance",
    question: {
      en: "What documents should I attach to my complaint?",
      ta: "மனுவுடன் என்ன ஆவணங்களை இணைக்க வேண்டும்?",
    },
    keywords: [
      "attach", "documents", "proof", "evidence", "upload", "photo", "ஆவணங்கள்",
      "ஆதாரம்", "இணைப்பு", "what to attach", "supporting documents",
    ],
    answer: {
      en:
        "Whatever turns your complaint from an assertion into a check somebody can run. In order of usefulness:\n\n• Your patta or chitta extract, if the dispute is about extent or ownership\n• A registered sale deed from your village at a higher rate, if the dispute is about the rate\n• The enumeration or valuation list, if trees, a well or a structure were left out\n• A photograph of the land showing what is on it, dated if possible\n• The award order or notice you received, if the dispute is about what it says\n• A legal heir certificate, if the holder has died\n\nA phone photograph is fine as long as the text is readable. Attach what you have rather than waiting for a complete set — you can add documents to an existing grievance later, and the filing date is what protects your window.",
      ta:
        "உங்கள் புகாரை ஒரு கூற்றிலிருந்து சரிபார்க்கக்கூடிய ஒன்றாக மாற்றும் எதுவும். பயன் வரிசையில்:\n\n• பட்டா அல்லது சிட்டா — பரப்பளவு அல்லது உரிமை தகராறு எனில்\n• உங்கள் கிராமத்தில் அதிக விலையில் பதிவான விற்பனைப் பத்திரம் — விலை தகராறு எனில்\n• கணக்கெடுப்பு/மதிப்பீட்டுப் பட்டியல் — மரம், கிணறு, கட்டிடம் விடுபட்டால்\n• நிலத்தின் புகைப்படம்\n• நீங்கள் பெற்ற தீர்ப்பு ஆணை அல்லது அறிவிப்பு\n• வாரிசு சான்றிதழ் — உரிமையாளர் இறந்திருந்தால்\n\nகைபேசி புகைப்படம் போதும், எழுத்து படிக்கும்படி இருந்தால். முழுத் தொகுப்புக்குக் காத்திராமல் உள்ளதை இணைத்து விடுங்கள் — பின்னர் சேர்க்கலாம்.",
    },
    followUps: ["doc-what-do-i-need", "doc-upload-formats", "grv-how-to-file"],
  },
];
