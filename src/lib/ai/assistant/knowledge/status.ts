/**
 * Project status and stage answers.
 *
 * VANI already answers "what stage is project X at" from the live project list,
 * and that lookup stays the primary route — it is real data and it beats
 * anything written here. What it cannot do is explain what a stage *means*,
 * what has to happen before the next one, or why a project has sat in one
 * place for a year. Those are the follow-up questions to every successful
 * lookup, so they are the entries in this file.
 */

import type { KnowledgeEntry } from "../types";

export const STATUS_ENTRIES: KnowledgeEntry[] = [
  {
    id: "status-check-project",
    category: "status",
    question: {
      en: "How do I check the status of a project?",
      ta: "ஒரு திட்டத்தின் நிலையை எவ்வாறு அறியலாம்?",
    },
    keywords: [
      "check status", "project status", "which stage", "status of", "find project",
      "நிலை", "எந்த கட்டம்", "திட்ட நிலை", "look up project", "search project",
      "progress", "update",
    ],
    answer: {
      en:
        "Type the project's name, or just its district, and I will tell you the stage it has reached and what happens next. \"What is happening with the Sivaganga canal\" works — you do not need the exact official title.\n\nYou can also browse every project on the Projects page without logging in: each one shows its current stage, the extent of land involved, its documents, and a map of the alignment. No login is needed for any of that.",
      ta:
        "திட்டத்தின் பெயரை அல்லது மாவட்டத்தை மட்டும் தட்டச்சு செய்யுங்கள் — நான் அது எந்தக் கட்டத்தில் உள்ளது, அடுத்து என்ன நடக்கும் என்று சொல்கிறேன். \"சிவகங்கை கால்வாய் என்ன ஆனது\" என்று கேட்டாலும் போதும்.\n\nஉள்நுழையாமலேயே திட்டங்கள் பக்கத்தில் அனைத்துத் திட்டங்களையும் பார்க்கலாம் — தற்போதைய கட்டம், நிலப் பரப்பளவு, ஆவணங்கள், வரைபடம்.",
    },
    links: [{ label: { en: "All projects", ta: "அனைத்து திட்டங்கள்" }, href: "/projects" }],
    followUps: ["status-all-stages", "land-find-my-parcel", "status-how-long"],
  },
  {
    id: "status-all-stages",
    category: "status",
    question: {
      en: "What are all the stages a project goes through?",
      ta: "ஒரு திட்டம் கடந்து செல்லும் கட்டங்கள் யாவை?",
    },
    keywords: [
      "stages", "all stages", "steps", "process", "lifecycle", "sequence", "order",
      "கட்டங்கள்", "வரிசை", "நடைமுறை", "what comes next", "how many stages",
    ],
    answer: {
      en:
        "Eleven, in a fixed order, and none can be skipped:\n\n1. **Draft** — the requiring body's proposal exists but nothing is notified\n2. **Scrutiny** — the proposal is examined\n3. **SIA** — the Social Impact Assessment, with public hearings in the affected villages\n4. **Notified** — the s.11 preliminary notification is published; land transactions freeze\n5. **State approved** — the State Government clears the acquisition\n6. **Central approved** — where central clearance is required\n7. **Declared** — the s.19 declaration; the acquisition is now legally settled\n8. **Awarded** — compensation amounts are determined and announced\n9. **R&R in progress** — rehabilitation and resettlement are carried out\n10. **Possession** — the land vests in the Government after full payment\n11. **R&R complete** — resettlement infrastructure is finished\n\nThe sequence is enforced by the system, not merely displayed: an officer cannot award before declaring, or take possession before paying. Attempts are refused and logged.",
      ta:
        "பதினொன்று கட்டங்கள், நிலையான வரிசையில். எதையும் தவிர்க்க முடியாது:\n\n1. **வரைவு** — முன்மொழிவு உள்ளது, எதுவும் அறிவிக்கப்படவில்லை\n2. **ஆய்வு** — முன்மொழிவு பரிசீலிக்கப்படுகிறது\n3. **SIA** — சமூக தாக்க மதிப்பீடு, பாதிக்கப்பட்ட கிராமங்களில் பொதுக் கூட்டங்கள்\n4. **அறிவிக்கப்பட்டது** — பிரிவு 11 அறிவிப்பு; நில பரிவர்த்தனைகள் முடக்கம்\n5. **மாநில ஒப்புதல்**\n6. **மத்திய ஒப்புதல்**\n7. **அறிவிப்பு (பிரிவு 19)** — கையகப்படுத்தல் சட்டப்படி உறுதி\n8. **தீர்ப்பு** — இழப்பீட்டுத் தொகை நிர்ணயம்\n9. **மறுவாழ்வு நடைபெறுகிறது**\n10. **கையகப்படுத்தல்** — முழுப் பணம் வழங்கிய பின் நிலம் அரசுக்கு\n11. **மறுவாழ்வு முடிந்தது**\n\nஇந்த வரிசையை அமைப்பு கட்டாயமாக்குகிறது — தீர்ப்புக்கு முன் பணம், அறிவிப்புக்கு முன் தீர்ப்பு என்று செய்ய முடியாது.",
    },
    basis: "RFCTLARR Act 2013, ss.4–23 and s.38",
    followUps: ["status-what-is-notified", "status-what-is-declared", "status-how-long"],
  },
  {
    id: "status-what-is-notified",
    category: "status",
    question: {
      en: "What does 'Notified' mean for my land?",
      ta: "'அறிவிக்கப்பட்டது' என்பது எனது நிலத்திற்கு என்ன பொருள்?",
    },
    keywords: [
      "notified", "notification", "section 11", "s11", "preliminary notification",
      "gazette", "அறிவிப்பு", "பிரிவு 11", "what does notified mean", "freeze",
      "cannot sell",
    ],
    answer: {
      en:
        "It means the s.11 preliminary notification has been published in the gazette, naming your land as intended for acquisition. Three things follow immediately:\n\n• You cannot sell, mortgage or otherwise transfer the land. Any transaction after this date is void against the acquisition.\n• The clock starts. The s.19 declaration must follow within twelve months, or the notification lapses and the process must begin again.\n• Your objection window opens. You have sixty days from the notification to object under s.15, and this is the stage at which objections carry the most weight — the acquisition itself is still open to argument here, in a way it is not after declaration.\n\nIf your land has just been notified, the sixty days is the single most important date to know.",
      ta:
        "பிரிவு 11 அறிவிப்பு அரசிதழில் வெளியிடப்பட்டு, உங்கள் நிலம் கையகப்படுத்தலுக்கு உத்தேசிக்கப்பட்டதாகக் குறிக்கப்பட்டுள்ளது. உடனே மூன்று விளைவுகள்:\n\n• நிலத்தை விற்க, அடமானம் வைக்க, மாற்ற முடியாது. இந்த தேதிக்குப் பின் நடக்கும் பரிவர்த்தனை செல்லாது.\n• கால அவகாசம் தொடங்குகிறது. பன்னிரண்டு மாதங்களுக்குள் பிரிவு 19 அறிவிப்பு வர வேண்டும், இல்லையெனில் இது காலாவதியாகும்.\n• ஆட்சேபணை காலம் திறக்கிறது — பிரிவு 15-இன் கீழ் அறுபது நாட்கள். இந்தக் கட்டத்தில் ஆட்சேபணைக்கு அதிக வலிமை உண்டு.\n\nஉங்கள் நிலம் இப்போதுதான் அறிவிக்கப்பட்டால், அந்த அறுபது நாட்களே மிக முக்கியம்.",
    },
    basis: "s.11 (notification), s.11(4) (bar on transactions), s.15 (objections within 60 days), s.19(7) (12-month limit)",
    followUps: ["grv-object-acquisition", "rights-hearing", "status-what-is-declared"],
  },
  {
    id: "status-what-is-declared",
    category: "status",
    question: {
      en: "What does 'Declared' mean? Can it still be stopped?",
      ta: "'அறிவிப்பு (பிரிவு 19)' என்றால் என்ன? இன்னும் நிறுத்த முடியுமா?",
    },
    keywords: [
      "declared", "declaration", "section 19", "s19", "final", "can it be stopped",
      "அறிவிப்பு", "பிரிவு 19", "இறுதி", "point of no return", "stop acquisition",
    ],
    answer: {
      en:
        "The s.19 declaration is the point at which the acquisition becomes legally settled. The State has decided, the R&R scheme has been published with it, and the question moves from *whether* the land is taken to *how much* you are paid and *what else* you receive.\n\nIt is not literally unstoppable — a court can stay or quash it, and this portal treats a stay order as hard data that blocks payment and possession outright rather than as a note on a file. But objecting to the acquisition on its merits is a s.15 remedy, and s.15 belongs to the notification stage. After declaration the effective arguments are about the award, the extent, the assets and your entitlements.\n\nOne further deadline matters here: the award must be passed within twelve months of the declaration, or the proceedings lapse.",
      ta:
        "பிரிவு 19 அறிவிப்புடன் கையகப்படுத்தல் சட்டப்படி உறுதியாகிறது. மாநிலம் முடிவு செய்துவிட்டது, மறுவாழ்வுத் திட்டமும் வெளியிடப்பட்டுவிட்டது. கேள்வி இப்போது 'நிலம் எடுக்கப்படுமா' என்பதிலிருந்து 'எவ்வளவு தொகை, வேறு என்ன உரிமைகள்' என்பதற்கு மாறுகிறது.\n\nமுற்றிலும் நிறுத்த முடியாதது அல்ல — நீதிமன்றம் தடை விதிக்கலாம். இந்த அமைப்பில் தடை உத்தரவு பணம் மற்றும் கையகப்படுத்தலை முழுமையாகத் தடுக்கும்.\n\nஇன்னொரு காலக்கெடு: அறிவிப்பிலிருந்து பன்னிரண்டு மாதங்களுக்குள் தீர்ப்பு வழங்கப்பட வேண்டும், இல்லையெனில் நடவடிக்கை காலாவதியாகும்.",
    },
    basis: "s.19 (declaration), s.25 (award within twelve months), s.15 (objections at notification stage)",
    followUps: ["comp-disagree", "rights-lapse", "grv-court"],
  },
  {
    id: "status-sia",
    category: "status",
    question: {
      en: "What is the Social Impact Assessment?",
      ta: "சமூக தாக்க மதிப்பீடு என்றால் என்ன?",
    },
    keywords: [
      "sia", "social impact", "assessment", "survey", "census", "study",
      "சமூக தாக்க", "மதிப்பீடு", "கணக்கெடுப்பு", "public hearing", "consultation",
      "who counts families",
    ],
    answer: {
      en:
        "A mandatory study, done in consultation with the local panchayat, before any land can be notified. It has to establish whether the public purpose is genuine, count the families that will be affected, assess the social costs, and consider whether less land or other land would do.\n\nFor you the important part is the census. It is the SIA that decides who is an affected family — including the tenants, labourers and residents that no patta records — so if the survey team did not reach your household, your entitlements are at risk before the process has properly begun. Being present at the public hearing and getting your household on the list is the highest-value hour you can spend on the whole acquisition.\n\nThe SIA report is a public document. It is on the project's Documents tab, and the hearing dates and attendance are on the Community tab.",
      ta:
        "எந்த நிலமும் அறிவிக்கப்படுவதற்கு முன், உள்ளாட்சி ஊராட்சியுடன் கலந்தாலோசித்து செய்யப்பட வேண்டிய கட்டாய ஆய்வு. பொது நோக்கம் உண்மையானதா, எத்தனை குடும்பங்கள் பாதிக்கப்படும், சமூகச் செலவுகள் என்ன, குறைவான நிலம் அல்லது வேறு நிலம் போதுமா — இவற்றை நிறுவ வேண்டும்.\n\nஉங்களுக்கு முக்கியமானது கணக்கெடுப்பு. யார் பாதிக்கப்பட்ட குடும்பம் என்பதை SIA-வே தீர்மானிக்கிறது — பட்டாவில் இல்லாத குத்தகைக்காரர்கள், தொழிலாளர்கள் உட்பட. கணக்கெடுப்புக் குழு உங்கள் வீட்டை அடையவில்லை என்றால் உங்கள் உரிமைகள் ஆபத்தில். பொதுக் கூட்டத்தில் கலந்துகொண்டு பட்டியலில் இடம்பெறுவது மிக முக்கியம்.\n\nSIA அறிக்கை பொது ஆவணம் — திட்டப் பக்கத்தில் உள்ளது.",
    },
    basis: "ss.4–9 — Social Impact Assessment, public hearing and appraisal by an expert group",
    followUps: ["rr-who-qualifies", "status-gram-sabha", "rr-tenant"],
  },
  {
    id: "status-gram-sabha",
    category: "status",
    question: {
      en: "Does the village council have to be consulted?",
      ta: "கிராம சபை கலந்தாலோசிக்கப்பட வேண்டுமா?",
    },
    keywords: [
      "gram sabha", "village council", "panchayat", "consultation", "meeting",
      "கிராம சபை", "ஊராட்சி", "கூட்டம்", "public meeting", "consent of village",
      "resolution", "was there a meeting",
    ],
    answer: {
      en:
        "Yes. The Social Impact Assessment must be carried out in consultation with the Gram Sabha (or the municipal body in urban areas), and a public hearing must be held in the affected area so that concerns are recorded. In Scheduled Areas the Gram Sabha's prior consent is required, not merely its opinion.\n\nThis is the most frequently skipped requirement in the whole Act, and skipped consultation is one of the commonest grounds on which acquisitions are set aside in court. So this portal records each consultation as data — the date, who attended, what was discussed, and the resolution passed — on the project's Community tab, where a citizen or a court can check whether the meeting actually happened rather than taking a file note on trust.",
      ta:
        "ஆம். சமூக தாக்க மதிப்பீடு கிராம சபையுடன் (நகரப் பகுதிகளில் நகர்மன்றத்துடன்) கலந்தாலோசித்து செய்யப்பட வேண்டும், பாதிக்கப்பட்ட பகுதியில் பொதுக் கூட்டம் நடத்தப்பட வேண்டும். பட்டியல் பகுதிகளில் கிராம சபையின் முன் ஒப்புதல் அவசியம் — கருத்து மட்டும் போதாது.\n\nஇது சட்டத்தில் அதிகம் தவிர்க்கப்படும் கடமை, மேலும் நீதிமன்றங்களில் கையகப்படுத்தல் ரத்தாகும் பொதுவான காரணம். எனவே இந்த வலைதளம் ஒவ்வொரு கலந்தாய்வையும் தேதி, வந்தவர்கள், விவாதம், நிறைவேற்றப்பட்ட தீர்மானம் என்று பதிவு செய்கிறது.",
    },
    basis: "s.4(1) — consultation with the Gram Sabha; s.5 — public hearing; s.41(3) — prior consent in Scheduled Areas",
    followUps: ["status-sia", "rights-consent", "rr-sc-st"],
  },
  {
    id: "status-how-long",
    category: "status",
    question: {
      en: "How long does the whole process take?",
      ta: "முழு நடைமுறை எவ்வளவு காலம் ஆகும்?",
    },
    keywords: [
      "how long", "duration", "timeline", "how many years", "time taken",
      "எவ்வளவு காலம்", "எத்தனை ஆண்டுகள்", "when will it finish", "total time",
      "deadlines", "statutory timeline",
    ],
    answer: {
      en:
        "The Act fixes the outer limits rather than the pace, and there are four that matter:\n\n• The SIA appraisal must be completed within six months of the assessment starting\n• The s.19 declaration must follow the s.11 notification within twelve months\n• The award must be passed within twelve months of the declaration\n• Resettlement infrastructure must be complete within eighteen months of the award\n\nSo from notification to award is a maximum of two years, with the SIA before it and R&R after. In practice a large corridor takes longer than a small one, and litigation stops the clock in the sense that a stay suspends action but not the deadline.\n\nMissing one of these is not a delay but a lapse — the proceedings can fall away entirely. That is why this portal tracks each of the four as an SLA with a countdown, marks them at-risk before they breach, and shows the state officer which district is running late and on what.",
      ta:
        "சட்டம் வேகத்தை அல்ல, வெளிப்புற எல்லைகளை நிர்ணயிக்கிறது. நான்கு முக்கியமானவை:\n\n• SIA மதிப்பீடு தொடங்கியதிலிருந்து ஆறு மாதங்களுக்குள் முடிக்கப்பட வேண்டும்\n• பிரிவு 11 அறிவிப்பிலிருந்து பன்னிரண்டு மாதங்களுக்குள் பிரிவு 19 அறிவிப்பு\n• அறிவிப்பிலிருந்து பன்னிரண்டு மாதங்களுக்குள் தீர்ப்பு\n• தீர்ப்பிலிருந்து பதினெட்டு மாதங்களுக்குள் மீள்குடியேற்ற வசதிகள்\n\nஅறிவிப்பிலிருந்து தீர்ப்பு வரை அதிகபட்சம் இரண்டு ஆண்டுகள். இவற்றில் ஒன்றைத் தவறவிடுவது தாமதம் அல்ல — நடவடிக்கையே காலாவதியாகலாம். எனவே இந்த வலைதளம் நான்கையும் கால அளவீடாகக் கண்காணிக்கிறது.",
    },
    basis: "ss.6, 19(2), 25 and 38(2)",
    followUps: ["status-why-delayed", "rights-lapse", "status-all-stages"],
  },
  {
    id: "status-why-delayed",
    category: "status",
    question: {
      en: "Why has my project not moved for months?",
      ta: "எனது திட்டம் பல மாதங்களாக முன்னேறவில்லை. ஏன்?",
    },
    keywords: [
      "delayed", "stuck", "no progress", "not moving", "why slow", "months",
      "தாமதம்", "நிற்கிறது", "முன்னேற்றம் இல்லை", "pending long time", "why waiting",
      "stay order", "court case delay",
    ],
    answer: {
      en:
        "There are only a handful of real reasons, and the project page names which one applies rather than leaving you to guess:\n\n• **A court stay.** The commonest. Nothing can move on a stayed project — payment and possession are blocked outright — and the Legal tab names the case and the court.\n• **A pending approval.** The file is with the State or the Centre and the district cannot act. The stage tracker shows whose turn it is.\n• **An unset compensation rate.** Nothing downstream can happen until the rate for the district is notified.\n• **An incomplete SIA or missing consultation.** Notification cannot proceed without it.\n• **Objections under consideration.** s.15 objections must be heard and disposed of before declaration.\n\nOpen the project and look at the stage tracker: it shows the current stage, which role has to act next, and the SLA countdown. If the answer is not on that page, that omission is itself worth a grievance.",
      ta:
        "உண்மையான காரணங்கள் சிலவே. திட்டப் பக்கம் எது பொருந்துகிறது என்று பெயரிட்டுக் காட்டுகிறது:\n\n• **நீதிமன்றத் தடை** — மிகப் பொதுவானது. தடை உள்ள திட்டத்தில் எதுவும் நடக்காது; வழக்கு எண்ணும் நீதிமன்றமும் காட்டப்படும்.\n• **நிலுவையில் உள்ள ஒப்புதல்** — கோப்பு மாநிலம் அல்லது மத்தியில் உள்ளது.\n• **இழப்பீட்டு விலை நிர்ணயிக்கப்படவில்லை** — அது இல்லாமல் அடுத்த எதுவும் நடக்காது.\n• **முடிவுறாத SIA அல்லது கலந்தாய்வு**\n• **பரிசீலனையில் உள்ள ஆட்சேபணைகள்**\n\nதிட்டப் பக்கத்தில் கட்டக் கண்காணிப்பைப் பாருங்கள் — தற்போதைய கட்டம், அடுத்து யார் நடவடிக்கை எடுக்க வேண்டும், காலக்கெடு.",
    },
    followUps: ["grv-escalate", "status-how-long", "grv-court"],
  },
  {
    id: "status-who-is-officer",
    category: "status",
    question: {
      en: "Which officer is handling my case?",
      ta: "எனது வழக்கை எந்த அதிகாரி கையாளுகிறார்?",
    },
    keywords: [
      "which officer", "who is handling", "collector", "tahsildar", "lao",
      "responsible officer", "அதிகாரி", "யார் பொறுப்பு", "contact officer",
      "land acquisition officer", "whose desk",
    ],
    answer: {
      en:
        "For an acquisition, the District Collector is the Land Acquisition Officer and the decisions in your case are theirs. The R&R side has its own officer — an Administrator for Rehabilitation and Resettlement appointed for the project — and above both sits the Commissioner for R&R at the State level.\n\nWhat this portal adds is which of them has to act *next*. Every stage records the role that must move it forward, and every grievance shows who it is assigned to and what it is waiting on. So instead of asking which officer is handling it, you can see whose action the file is currently waiting for, and escalate to the level above them if the SLA has run out.",
      ta:
        "கையகப்படுத்தலுக்கு மாவட்ட ஆட்சியரே நில கையகப்படுத்தல் அதிகாரி; உங்கள் வழக்கின் முடிவுகள் அவருடையவை. மறுவாழ்வுக்குத் தனி அதிகாரி — திட்டத்திற்கு நியமிக்கப்பட்ட மறுவாழ்வு நிர்வாகி. இருவருக்கும் மேலே மாநில அளவில் மறுவாழ்வு ஆணையர்.\n\nஇந்த வலைதளம் கூடுதலாக *அடுத்து யார்* நடவடிக்கை எடுக்க வேண்டும் என்பதைக் காட்டுகிறது. ஒவ்வொரு குறை மனுவும் யாருக்கு ஒதுக்கப்பட்டுள்ளது, எதற்காகக் காத்திருக்கிறது என்பதைக் காட்டும்.",
    },
    basis: "s.3(g) (Collector as LAO); s.43 (Administrator for R&R); s.44 (Commissioner for R&R)",
    followUps: ["grv-escalate", "help-which-office", "grv-track"],
  },
];
