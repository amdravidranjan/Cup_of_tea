/**
 * Rights answers.
 *
 * The category most likely to be tested by a judge who knows the Act, and the
 * one where a wrong answer does real harm — someone told they can simply refuse
 * makes decisions on that basis. So these answers are careful to separate what
 * the Act guarantees from what it merely permits, and they say plainly where a
 * right is conditional or where the honest answer is "consult a lawyer about
 * your own facts".
 *
 * s.24 in particular is stated narrowly. It is the most-cited and
 * most-misunderstood provision in the Act and its conditions have been
 * litigated to the Supreme Court, so the answer gives the conditions and then
 * says to get advice rather than implying a conclusion.
 */

import type { KnowledgeEntry } from "../types";

export const RIGHTS_ENTRIES: KnowledgeEntry[] = [
  {
    id: "rights-can-i-refuse",
    category: "rights",
    question: {
      en: "Can I refuse to give my land?",
      ta: "எனது நிலத்தை கொடுக்க மறுக்க முடியுமா?",
    },
    keywords: [
      "refuse", "say no", "can i refuse", "do not want to give", "not willing",
      "மறுக்க", "கொடுக்க மாட்டேன்", "compulsory", "forced", "must i give",
      "can they force me", "unwilling",
    ],
    answer: {
      en:
        "Not outright, if the acquisition is lawful. Compulsory acquisition for a genuine public purpose is a power the State has, and refusing to accept the compensation does not stop it — the amount is deposited with the Authority and possession can still follow.\n\nWhat you can do is contest whether it is lawful, and those grounds are real:\n\n• Object within sixty days of the s.11 notification under s.15 — that the purpose is not a public purpose, that more land is being taken than is needed, that other land would do less damage, or that the SIA or the consultation was defective\n• Insist on the consent threshold, if this is a private or PPP project — 80% and 70% of affected families respectively\n• Rely on the protection for irrigated multi-cropped land under s.10\n• Go to the LARR Authority, and to the High Court from there\n\nSo the practical answer is that the sixty-day objection window is where the question of *whether* is decided. After that the argument is about how much. If you intend to contest the acquisition itself, get legal advice inside that window rather than after it.",
      ta:
        "கையகப்படுத்தல் சட்டப்படி நடந்தால், நேரடியாக மறுக்க முடியாது. உண்மையான பொது நோக்கத்திற்கான கட்டாய கையகப்படுத்தல் அரசுக்கு உள்ள அதிகாரம். இழப்பீட்டைப் பெற மறுப்பது அதை நிறுத்தாது — தொகை ஆணையத்தில் வைப்பாகி, நிலம் கையகப்படுத்தப்படலாம்.\n\nஅது சட்டப்படியானதா என்பதை எதிர்த்து வாதிடலாம்:\n\n• பிரிவு 11 அறிவிப்பிலிருந்து அறுபது நாட்களுக்குள் பிரிவு 15-இன் கீழ் ஆட்சேபணை — நோக்கம் பொது நோக்கம் அல்ல, தேவைக்கு அதிக நிலம், வேறு நிலம் போதும், SIA குறையுள்ளது\n• தனியார்/PPP திட்டமெனில் ஒப்புதல் வரம்பு — 80% மற்றும் 70%\n• பாசன பல்பயிர் நிலத்திற்கு பிரிவு 10 பாதுகாப்பு\n• LARR ஆணையம், பின் உயர் நீதிமன்றம்\n\nஎனவே அந்த அறுபது நாட்களே முக்கியம். கையகப்படுத்தலையே எதிர்க்க விரும்பினால், அந்தக் காலத்திற்குள் சட்ட ஆலோசனை பெறுங்கள்.",
    },
    basis: "ss.11, 15, 2(2) (consent), 10 (food security)",
    followUps: ["grv-object-acquisition", "rights-consent", "rights-multi-crop"],
  },
  {
    id: "rights-consent",
    category: "rights",
    question: {
      en: "Does the government need our consent?",
      ta: "அரசுக்கு எங்கள் ஒப்புதல் தேவையா?",
    },
    keywords: [
      "consent", "80%", "70%", "agreement", "permission", "vote", "ஒப்புதல்",
      "சம்மதம்", "do they need consent", "private company", "ppp", "majority",
      "public private partnership",
    ],
    answer: {
      en:
        "It depends who the land is for, and this is one of the most important distinctions in the Act:\n\n• **For a private company** — the prior consent of at least 80% of affected families is required.\n• **For a public-private partnership** — at least 70%.\n• **For a purely government project** — no consent threshold applies, though the SIA, the public hearing and the Gram Sabha consultation are all still mandatory.\n\nIn a Scheduled Area, the prior consent of the Gram Sabha is required in addition, whoever the land is for.\n\nSo the first thing to establish is which category your project is in — it is stated on the project page, along with the requiring body. If it is private or PPP and no consent process was run, that is a fundamental defect, not a procedural one, and it belongs in a s.15 objection.",
      ta:
        "நிலம் யாருக்கு என்பதைப் பொறுத்தது — இது சட்டத்தின் மிக முக்கியமான வேறுபாடு:\n\n• **தனியார் நிறுவனத்திற்கு** — பாதிக்கப்பட்ட குடும்பங்களில் குறைந்தது 80% முன் ஒப்புதல் அவசியம்.\n• **அரசு-தனியார் கூட்டுத் திட்டத்திற்கு** — குறைந்தது 70%.\n• **முழுக்க அரசுத் திட்டத்திற்கு** — ஒப்புதல் வரம்பு பொருந்தாது; ஆனால் SIA, பொதுக் கூட்டம், கிராம சபை கலந்தாய்வு அனைத்தும் கட்டாயம்.\n\nபட்டியல் பகுதியில், யாருக்காக இருந்தாலும் கிராம சபையின் முன் ஒப்புதல் கூடுதலாகத் தேவை.\n\nஎனவே உங்கள் திட்டம் எந்த வகை என்பதை முதலில் அறியுங்கள் — திட்டப் பக்கத்தில் திட்ட நிறுவனத்துடன் குறிக்கப்பட்டிருக்கும். தனியார்/PPP-ஆக இருந்து ஒப்புதல் பெறப்படாவிட்டால் அது அடிப்படைக் குறை.",
    },
    basis: "s.2(2)(a)–(b) — consent of 80% and 70% of affected families; s.41(3) — prior consent of the Gram Sabha in Scheduled Areas",
    followUps: ["status-gram-sabha", "rights-can-i-refuse", "rr-sc-st"],
  },
  {
    id: "rights-hearing",
    category: "rights",
    question: {
      en: "Do I have a right to be heard?",
      ta: "எனது தரப்பை கேட்கும் உரிமை உள்ளதா?",
    },
    keywords: [
      "hearing", "right to be heard", "personal hearing", "speak", "meeting",
      "விசாரணை", "கேட்க வேண்டும்", "present my case", "in person", "public hearing",
      "objection hearing",
    ],
    answer: {
      en:
        "Yes, at more than one point, and these are rights rather than courtesies:\n\n• At the **SIA public hearing** in your village, before anything is notified — where the affected-family census is settled and your household gets on or off the list.\n• On your **s.15 objection**, the Collector must give you an opportunity to be heard in person, and must then record your objection with a reasoned recommendation to the Government.\n• Before the **award**, on the extent, the assets and the amount.\n• At the **LARR Authority**, which hears the matter afresh.\n\nAsk for the hearing in writing and keep the acknowledgement. A hearing you attended without a record of it is hard to rely on later; a written request with a date, and a grievance number, is not.",
      ta:
        "ஆம், ஒன்றுக்கு மேற்பட்ட இடங்களில். இவை மரியாதைகள் அல்ல, உரிமைகள்:\n\n• எதுவும் அறிவிக்கப்படுவதற்கு முன், உங்கள் கிராமத்தில் **SIA பொதுக் கூட்டம்** — பாதிக்கப்பட்ட குடும்பப் பட்டியல் அங்கேயே தீர்மானிக்கப்படுகிறது.\n• உங்கள் **பிரிவு 15 ஆட்சேபணை** மீது, ஆட்சியர் உங்களை நேரில் கேட்க வாய்ப்பு அளிக்க வேண்டும், பின் காரணத்துடன் அரசுக்குப் பரிந்துரைக்க வேண்டும்.\n• **தீர்ப்புக்கு முன்**, பரப்பளவு, சொத்துகள், தொகை மீது.\n• **LARR ஆணையத்தில்**, புதிதாக விசாரணை.\n\nவிசாரணையை எழுத்துப்பூர்வமாகக் கோரி, ஒப்புகைச் சீட்டை வைத்துக்கொள்ளுங்கள்.",
    },
    basis: "s.5 (public hearing); s.15(2) (opportunity to be heard on objections); s.21 (notice and enquiry before award)",
    followUps: ["grv-object-acquisition", "status-sia", "grv-court"],
  },
  {
    id: "rights-lapse",
    category: "rights",
    question: {
      en: "My land was acquired years ago and nothing happened. Does it lapse?",
      ta: "பல ஆண்டுகளுக்கு முன் கையகப்படுத்தப்பட்டது, எதுவும் நடக்கவில்லை. காலாவதியாகுமா?",
    },
    keywords: [
      "lapse", "section 24", "s24", "old acquisition", "years ago", "1894 act",
      "காலாவதி", "பிரிவு 24", "பழைய", "no possession", "not paid", "long time ago",
      "return my land", "retrospective",
    ],
    answer: {
      en:
        "There is a provision for this, and it is worth taking seriously — but its conditions are strict and heavily litigated, so what follows is the rule and not a conclusion about your case.\n\nUnder s.24, where an award was made under the old 1894 Act five years or more before the 2013 Act commenced, and physical possession of the land has not been taken *and* the compensation has not been paid, the proceedings are deemed to have lapsed. The Government must then begin afresh under the 2013 Act, which means the current compensation regime applies — usually a substantially larger award.\n\nSeparately, where an award was made but the compensation was not deposited in the accounts of the majority of beneficiaries, those beneficiaries are entitled to compensation under the 2013 Act.\n\nBoth conditions turn on facts that get argued about — whether possession was actually taken, and whether payment was made or merely tendered. The Supreme Court has interpreted these narrowly. If this is your situation, take the award order and any evidence of possession or non-payment to a lawyer; this is not a self-service provision.",
      ta:
        "இதற்கு ஒரு விதி உள்ளது, ஆனால் அதன் நிபந்தனைகள் கடுமையானவை மற்றும் அதிகம் வழக்காடப்பட்டவை. கீழே உள்ளது விதி மட்டுமே, உங்கள் வழக்கின் முடிவு அல்ல.\n\nபிரிவு 24-இன் கீழ், பழைய 1894 சட்டத்தின் கீழ் 2013 சட்டம் தொடங்குவதற்கு ஐந்து ஆண்டுகள் அல்லது அதற்கு முன் தீர்ப்பு வழங்கப்பட்டு, நிலம் உண்மையில் கையகப்படுத்தப்படாமலும் *மற்றும்* இழப்பீடு வழங்கப்படாமலும் இருந்தால், நடவடிக்கை காலாவதியானதாகக் கருதப்படும். அரசு 2013 சட்டத்தின் கீழ் புதிதாகத் தொடங்க வேண்டும் — அதாவது இன்றைய அதிக தொகை.\n\nதனியாக, தீர்ப்பு வழங்கப்பட்டும் பெரும்பான்மையான பயனாளிகளின் கணக்குகளில் தொகை செலுத்தப்படாவிட்டால், அவர்களுக்கு 2013 சட்டப்படி இழப்பீடு உரிமை.\n\nஇரண்டும் வாதிடப்படும் உண்மைகளைப் பொறுத்தது. உச்ச நீதிமன்றம் இவற்றை குறுகலாக விளக்கியுள்ளது. இது உங்கள் நிலை என்றால் வழக்கறிஞரை அணுகுங்கள்.",
    },
    basis: "s.24 — retrospective operation where an award under the 1894 Act is five years or more old",
    followUps: ["grv-court", "rights-unused-land", "comp-disagree"],
  },
  {
    id: "rights-unused-land",
    category: "rights",
    question: {
      en: "The land was taken but never used. Can I get it back?",
      ta: "நிலம் எடுக்கப்பட்டு பயன்படுத்தப்படவில்லை. திரும்பப் பெற முடியுமா?",
    },
    keywords: [
      "unused", "not used", "vacant", "idle", "return land", "get it back",
      "section 101", "பயன்படுத்தவில்லை", "திரும்ப", "காலி", "land bank", "5 years",
      "different purpose", "sold to private",
    ],
    answer: {
      en:
        "There is a route, though it does not run to you automatically. Under s.101, where acquired land remains unutilised for five years from the date it was taken over, it is to be returned to the original owner or their heirs, or to the State's land bank.\n\nWhich of those two happens is a State decision, so the provision is not a personal right of restoration in the way it is often described — but an application asserting non-use, with the date of possession and evidence that nothing has been done on the land, puts the question formally.\n\nTwo related protections are worth knowing. Land acquired for one purpose cannot simply be diverted to another. And if acquired land is transferred to a person for a consideration higher than the compensation paid, 40% of the enhanced amount must be shared with the original owners.\n\nThis portal keeps a land bank register of idle parcels with the date they fell idle and their review status, which is where you would look to see whether your parcel has been recorded as unutilised.",
      ta:
        "ஒரு வழி உள்ளது, ஆனால் அது தானாக உங்களுக்கு வராது. பிரிவு 101-இன் கீழ், கையகப்படுத்தப்பட்ட நிலம் எடுத்துக்கொள்ளப்பட்ட நாளிலிருந்து ஐந்து ஆண்டுகள் பயன்படுத்தப்படாமல் இருந்தால், அது அசல் உரிமையாளர் அல்லது வாரிசுகளுக்கு, அல்லது மாநில நில வங்கிக்குத் திரும்ப வேண்டும்.\n\nஇரண்டில் எது என்பது மாநில முடிவு — எனவே இது சொல்லப்படுவது போல தானியங்கி மீட்பு உரிமை அல்ல. ஆனால் கையகப்படுத்திய தேதி மற்றும் பயன்படுத்தப்படவில்லை என்ற ஆதாரத்துடன் விண்ணப்பம் அளிப்பது கேள்வியை முறையாக எழுப்பும்.\n\nதொடர்புடைய இரண்டு பாதுகாப்புகள்: ஒரு நோக்கத்திற்கு எடுத்த நிலத்தை வேறு நோக்கத்திற்கு மாற்ற முடியாது. வழங்கிய இழப்பீட்டைவிட அதிக தொகைக்கு நிலம் மாற்றப்பட்டால், உயர்ந்த தொகையின் 40% அசல் உரிமையாளர்களுக்குப் பங்கிடப்பட வேண்டும்.\n\nஇந்த வலைதளம் காலியாக உள்ள நிலங்களின் பதிவேட்டை வைத்திருக்கிறது.",
    },
    basis: "s.101 (return of unutilised land); s.99 (no change of purpose); s.100 (no change of ownership); s.98 read with the 40% share on transfer",
    followUps: ["poss-land-bank", "rights-lapse", "grv-how-to-file"],
  },
  {
    id: "rights-multi-crop",
    category: "rights",
    question: {
      en: "Can they acquire irrigated farmland?",
      ta: "பாசன வேளாண் நிலத்தை கையகப்படுத்த முடியுமா?",
    },
    keywords: [
      "multi crop", "irrigated", "farmland", "agricultural land", "food security",
      "section 10", "பாசன நிலம்", "பல்பயிர்", "வேளாண் நிலம்", "protected land",
      "nanjai acquisition", "cannot take farm land",
    ],
    answer: {
      en:
        "Only exceptionally. s.10 protects irrigated multi-cropped land: it is not to be acquired except in exceptional circumstances, as a demonstrable last resort, and subject to an aggregate limit for the district or State notified by the State Government.\n\nWhere such land is acquired, an equivalent area of culturable wasteland must be developed for agricultural purposes — or, where that is not possible, an amount equal to the value of the land acquired must be deposited for investment in agriculture.\n\nSo if your land is irrigated and multi-cropped, three questions belong in a s.15 objection: whether the exceptional-circumstances finding was actually made and recorded, whether the notified aggregate limit for the district has been exceeded, and whether the wasteland development or the deposit has been provided for. Your chitta classification is the starting evidence — which is also why a wet field recorded as dry land matters legally as well as financially.",
      ta:
        "விதிவிலக்காக மட்டுமே. பிரிவு 10 பாசன பல்பயிர் நிலத்தைப் பாதுகாக்கிறது: விதிவிலக்கான சூழ்நிலைகளில், வேறு வழியில்லை என்று நிரூபிக்கப்பட்டால் மட்டுமே, மேலும் மாநில அரசு அறிவிக்கும் மாவட்ட/மாநில மொத்த வரம்புக்கு உட்பட்டு.\n\nஅத்தகைய நிலம் எடுக்கப்பட்டால், அதற்கு இணையான பரப்பளவு தரிசு நிலம் வேளாண்மைக்கு உருவாக்கப்பட வேண்டும் — முடியாவிட்டால், எடுக்கப்பட்ட நிலத்தின் மதிப்புக்கு இணையான தொகை வேளாண் முதலீட்டுக்காக செலுத்தப்பட வேண்டும்.\n\nஎனவே உங்கள் நிலம் பாசன பல்பயிர் நிலமெனில், மூன்று கேள்விகள் பிரிவு 15 ஆட்சேபணையில் இடம்பெற வேண்டும்: விதிவிலக்கு முடிவு பதிவாகியுள்ளதா, மாவட்ட வரம்பு மீறப்பட்டதா, தரிசு நில உருவாக்கம் அல்லது வைப்புத் தொகை ஏற்பாடு செய்யப்பட்டதா.",
    },
    basis: "s.10 — special provision to safeguard food security",
    followUps: ["land-classification", "grv-object-acquisition", "rights-can-i-refuse"],
  },
  {
    id: "rights-urgency",
    category: "rights",
    question: {
      en: "What is the urgency clause and does it take away my rights?",
      ta: "அவசர விதி என்றால் என்ன? அது எனது உரிமைகளைப் பறிக்குமா?",
    },
    keywords: [
      "urgency", "section 40", "s40", "emergency", "defence", "immediate possession",
      "அவசரம்", "பிரிவு 40", "அவசர விதி", "took land immediately", "no notice given",
      "80 percent", "natural calamity",
    ],
    answer: {
      en:
        "s.40 lets the Government take possession of land after only thirty days from the s.11 notification, without waiting for the ordinary sequence. It is narrow: it applies to the defence of India, national security, and emergencies arising from a natural calamity — and it must be exercised in the rarest of rare cases, with reasons recorded.\n\nIt does not remove your compensation. Eighty per cent of the estimated compensation must be paid before possession is taken, and the balance follows on the award. It also does not remove your R&R entitlements, and an additional 75% of the compensation is payable as a solatium in urgency cases.\n\nWhat it does compress is time. If urgency has been invoked on your land, the reasons must be on the file — and whether the stated ground genuinely falls within s.40 is exactly the kind of question the LARR Authority and the High Court are there to test. Get advice quickly, because the thirty days is short.",
      ta:
        "பிரிவு 40, பிரிவு 11 அறிவிப்பிலிருந்து முப்பது நாட்களுக்குப் பிறகே நிலத்தைக் கையகப்படுத்த அரசுக்கு அனுமதிக்கிறது. இது குறுகியது: இந்தியப் பாதுகாப்பு, தேசிய பாதுகாப்பு, இயற்கைப் பேரிடரால் ஏற்படும் அவசரநிலை — மேலும் மிக அரிதான வழக்குகளில், காரணங்கள் பதிவு செய்யப்பட்டு மட்டுமே.\n\nஇது உங்கள் இழப்பீட்டை நீக்காது. கையகப்படுத்துவதற்கு முன் மதிப்பிடப்பட்ட இழப்பீட்டின் எண்பது சதவீதம் வழங்கப்பட வேண்டும், மீதி தீர்ப்புடன். மறுவாழ்வு உரிமைகளும் நீங்காது; அவசர வழக்குகளில் கூடுதலாக 75% ஆறுதல் தொகையும் உண்டு.\n\nஇது சுருக்குவது காலத்தை மட்டுமே. உங்கள் நிலத்தில் அவசர விதி பயன்படுத்தப்பட்டால், காரணங்கள் கோப்பில் இருக்க வேண்டும். முப்பது நாட்கள் குறைவு — விரைவாக ஆலோசனை பெறுங்கள்.",
    },
    basis: "s.40 — special powers in case of urgency; s.40(3) — 80% payment before possession and additional 75% solatium",
    followUps: ["poss-when-taken", "grv-court", "comp-when-paid"],
  },
  {
    id: "rights-which-act",
    category: "rights",
    question: {
      en: "Which law governs land acquisition now?",
      ta: "நில கையகப்படுத்தலை இப்போது எந்தச் சட்டம் நிர்வகிக்கிறது?",
    },
    keywords: [
      "which act", "which law", "rfctlarr", "2013 act", "1894", "larr",
      "எந்த சட்டம்", "சட்டம்", "act name", "full form", "legislation",
      "land acquisition act",
    ],
    answer: {
      en:
        "The Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 — usually shortened to RFCTLARR or just \"the 2013 Act\". It came into force on 1 January 2014 and replaced the Land Acquisition Act, 1894.\n\nThe difference is not cosmetic. The 1894 Act had no solatium worth the name, no rehabilitation entitlements, no social impact assessment, no consent requirement and no consultation duty. The 2013 Act added all of those, doubled the award through 100% solatium, and put statutory deadlines on the process.\n\nOne complication: certain acquisitions under thirteen other central enactments — for railways, highways, atomic energy, metros and so on — were historically outside the Act, though the compensation and R&R provisions were extended to them. If your acquisition is under one of those, the acquiring authority differs but the compensation and R&R entitlements should not. Ask which enactment is being used; it is stated in the notification, and the project page records it.",
      ta:
        "நியாயமான இழப்பீடு மற்றும் வெளிப்படைத்தன்மை உரிமை, நில கையகப்படுத்தல், மறுவாழ்வு மற்றும் மீள்குடியேற்றச் சட்டம், 2013 — சுருக்கமாக RFCTLARR அல்லது \"2013 சட்டம்\". 2014 ஜனவரி 1-இல் நடைமுறைக்கு வந்து, 1894 நில கையகப்படுத்தல் சட்டத்தை மாற்றியது.\n\nவேறுபாடு மேலோட்டமானது அல்ல. 1894 சட்டத்தில் ஆறுதல் தொகை பெயரளவே, மறுவாழ்வு உரிமைகள் இல்லை, சமூக தாக்க மதிப்பீடு இல்லை, ஒப்புதல் தேவையில்லை, கலந்தாய்வுக் கடமை இல்லை. 2013 சட்டம் இவை அனைத்தையும் சேர்த்து, 100% ஆறுதல் தொகை மூலம் தொகையை இரட்டிப்பாக்கி, நடைமுறைக்கு சட்டக் காலக்கெடுக்களை விதித்தது.\n\nஒரு சிக்கல்: இரயில்வே, நெடுஞ்சாலை, அணுசக்தி, மெட்ரோ போன்ற பதின்மூன்று மத்தியச் சட்டங்களின் கீழ் கையகப்படுத்தல்கள் வரலாற்று ரீதியாக இதற்கு வெளியே இருந்தன — ஆனால் இழப்பீடு மற்றும் மறுவாழ்வு விதிகள் அவற்றுக்கும் நீட்டிக்கப்பட்டன. எந்தச் சட்டம் பயன்படுத்தப்படுகிறது என்று கேளுங்கள்; அறிவிப்பில் குறிக்கப்பட்டிருக்கும்.",
    },
    basis: "RFCTLARR Act 2013; s.105 and the Fourth Schedule (other enactments)",
    followUps: ["status-all-stages", "comp-formula", "rights-lapse"],
  },
];
