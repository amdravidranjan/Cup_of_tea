/**
 * Document and certificate answers.
 *
 * Two different questions get asked here and they need different answers. A
 * citizen asks "what paper do I need and where do I get it" — an errand, with
 * an office and a fee attached. An officer asks "what will this system read out
 * of an upload" — a capability question, where the honest answer includes what
 * it will *not* read. Both are below, and the second set is deliberately blunt
 * about the scanned-document limitation rather than leaving someone to discover
 * it at a demo table.
 */

import type { KnowledgeEntry } from "../types";

export const DOCUMENT_ENTRIES: KnowledgeEntry[] = [
  {
    id: "doc-what-do-i-need",
    category: "documents",
    question: {
      en: "What documents do I need for my compensation claim?",
      ta: "இழப்பீடு கோரிக்கைக்கு என்ன ஆவணங்கள் தேவை?",
    },
    keywords: [
      "what documents", "documents needed", "papers", "required documents", "checklist",
      "ஆவணங்கள்", "என்ன ஆவணம்", "தேவையான ஆவணங்கள்", "which papers", "bring documents",
      "list of documents",
    ],
    answer: {
      en:
        "For a straightforward claim as the titleholder:\n\n• Patta or chitta extract in your name\n• A photo identity — Aadhaar, voter ID or driving licence\n• Bank passbook or a cancelled cheque, for the account the award is paid into\n• An encumbrance certificate, if the land has ever carried a loan\n• A legal heir certificate, if the patta is in the name of someone who has died\n\nIf you are claiming R&R entitlements without a patta — as a tenant, labourer or resident — bring anything that shows presence over time: a ration card at that address, an electricity bill, a school record, a bank passbook, a job card.\n\nThe office cannot refuse to register your claim because one document is pending. Give what you have, get an acknowledgement, and add the rest.",
      ta:
        "பட்டாதாரராகக் கோருவதற்கு:\n\n• உங்கள் பெயரில் பட்டா அல்லது சிட்டா\n• புகைப்பட அடையாள அட்டை — ஆதார், வாக்காளர் அல்லது ஓட்டுநர் உரிமம்\n• வங்கிப் புத்தகம் அல்லது ரத்து செய்த காசோலை\n• வில்லங்கச் சான்றிதழ் — நிலத்தில் கடன் இருந்திருந்தால்\n• வாரிசு சான்றிதழ் — பட்டா இறந்தவரின் பெயரில் இருந்தால்\n\nபட்டா இல்லாமல் மறுவாழ்வு உரிமை கோரினால், அந்த இடத்தில் நீண்ட காலம் இருந்ததற்கான ஆதாரம் கொண்டு வாருங்கள் — ரேஷன் அட்டை, மின் கட்டண ரசீது, பள்ளிப் பதிவு, வேலை அட்டை.\n\nஒரு ஆவணம் நிலுவையில் இருப்பதால் உங்கள் கோரிக்கையைப் பதிவு செய்ய மறுக்க முடியாது.",
    },
    followUps: ["doc-patta", "doc-heir", "doc-lost-patta"],
  },
  {
    id: "doc-patta",
    category: "documents",
    question: {
      en: "What is a patta and a chitta, and where do I get them?",
      ta: "பட்டா, சிட்டா என்றால் என்ன? எங்கு பெறுவது?",
    },
    keywords: [
      "patta", "chitta", "adangal", "record of rights", "பட்டா", "சிட்டா", "அடங்கல்",
      "e-sevai", "taluk office", "vao", "how to get patta", "land document",
      "ownership document",
    ],
    answer: {
      en:
        "The patta is the record of who holds the land and how much of it. The chitta and adangal are the revenue accounts alongside it, showing the classification and what is cultivated. Together they are your proof of title and extent.\n\nGet them from the taluk office, from an e-Sevai centre, or online from the Tamil Nadu land records portal. A digital extract is better than a photocopy for our purposes — a file with a text layer is read directly, while a photograph of a page has to be checked by hand.\n\nWhat the patta does *not* do is show the shape of your plot. That is the FMB sketch, held separately by the Survey department, and you need it if the dispute is about boundaries rather than extent.",
      ta:
        "பட்டா என்பது நிலத்தை யார் வைத்திருக்கிறார், எவ்வளவு என்ற பதிவு. சிட்டா மற்றும் அடங்கல் அதனுடன் வரும் வருவாய்க் கணக்குகள் — வகைப்பாடு, சாகுபடி விவரம். இரண்டும் சேர்ந்து உங்கள் உரிமை மற்றும் பரப்பளவுக்கு ஆதாரம்.\n\nவட்டாட்சியர் அலுவலகம், இ-சேவை மையம், அல்லது தமிழ்நாடு நிலப் பதிவு வலைதளத்தில் பெறலாம். நகலைவிட மின்னணு பிரதி சிறந்தது — உரை அடுக்குள்ள கோப்பு நேரடியாகப் படிக்கப்படும்.\n\nபட்டா உங்கள் நிலத்தின் *வடிவத்தைக்* காட்டாது. அது FMB வரைபடம், நில அளவைத் துறையில் தனியாக உள்ளது.",
    },
    followUps: ["doc-fmb", "land-patta-vs-survey", "doc-lost-patta"],
  },
  {
    id: "doc-fmb",
    category: "documents",
    question: {
      en: "What is an FMB sketch and why does it matter?",
      ta: "FMB வரைபடம் என்றால் என்ன? அது ஏன் முக்கியம்?",
    },
    keywords: [
      "fmb", "field measurement book", "sketch", "naksha", "boundary map",
      "வரைபடம்", "நில அளவை வரைபடம்", "plot shape", "survey sketch", "subdivision",
      "boundary drawing",
    ],
    answer: {
      en:
        "The Field Measurement Book sketch is the cadastral drawing of your plot — its shape, its dimensions, and the survey numbers of the plots it touches. It is held by the Survey and Settlement department, not the taluk office.\n\nIt matters whenever the argument is about *where* the boundary runs rather than *how much* land there is. An FMB identifies a plot by its neighbours, which is why the adjoining survey numbers are as important as the measurements: if your neighbour's number on the sketch does not match reality on the ground, something has been mis-subdivided.\n\nWhen an FMB is uploaded here, the plot boundary is read from it and drawn on the map, so the officer does not re-trace it by hand. A DGPS survey report is read the same way and with more certainty, because it is a direct coordinate capture rather than a historic drawing that has to be georeferenced.",
      ta:
        "FMB வரைபடம் என்பது உங்கள் நிலத்தின் அளவைப் படம் — வடிவம், அளவுகள், சுற்றியுள்ள நிலங்களின் அளவை எண்கள். இது நில அளவை மற்றும் குடியேற்றத் துறையில் உள்ளது.\n\nபரப்பளவு பற்றி அல்ல, *எல்லை எங்கே* என்ற தகராறு இருக்கும்போது இது முக்கியம். FMB ஒரு நிலத்தை அதன் அருகாமை நிலங்களால் அடையாளப்படுத்துகிறது — வரைபடத்தில் உள்ள எண்கள் தரையில் உள்ளதுடன் பொருந்தவில்லை என்றால், உட்பிரிவில் தவறு உள்ளது.\n\nFMB இங்கே பதிவேற்றப்பட்டால், எல்லை அதிலிருந்து படிக்கப்பட்டு வரைபடத்தில் வரையப்படும்.",
    },
    basis: "FMB maintained by the Survey & Settlement Department; s.12 — survey and measurement of land proposed for acquisition",
    followUps: ["land-boundary-wrong", "doc-patta", "doc-upload-formats"],
  },
  {
    id: "doc-ec",
    category: "documents",
    question: {
      en: "What is an encumbrance certificate and do I need one?",
      ta: "வில்லங்கச் சான்றிதழ் என்றால் என்ன? அது தேவையா?",
    },
    keywords: [
      "encumbrance", "ec", "nil ec", "sub registrar", "வில்லங்கம்", "சான்றிதழ்",
      "loan on land", "charge", "mortgage certificate", "registration department",
      "transactions on land",
    ],
    answer: {
      en:
        "It is the Sub-Registrar's statement of every registered transaction on your land over a period you choose — sales, mortgages, gifts, partitions. A \"nil EC\" means nothing is registered against it.\n\nYou need one if the land has ever carried a loan, because a subsisting charge changes how the award is paid: the bank's dues are settled out of the compensation and the balance comes to you. Get a current one rather than an old copy, and if a loan is closed, make sure the discharge is recorded — an EC still showing a settled mortgage is a common reason an award sits unpaid for weeks while it is sorted out.\n\nWhen an EC is uploaded here, a subsisting charge is flagged to the officer before compensation can be marked paid, precisely so it is not discovered afterwards.",
      ta:
        "இது உங்கள் நிலத்தில் நீங்கள் தேர்ந்தெடுத்த காலத்தில் பதிவான அனைத்து பரிவர்த்தனைகளின் பட்டியல் — விற்பனை, அடமானம், தானம், பிரிவினை. \"நில் EC\" என்றால் எதுவும் பதிவாகவில்லை.\n\nநிலத்தில் கடன் இருந்திருந்தால் இது தேவை — நிலுவைக் கடன் தொகை வழங்கப்படும் விதத்தை மாற்றுகிறது. புதிய சான்றிதழைப் பெறுங்கள். கடன் அடைக்கப்பட்டிருந்தால், அது சான்றிதழில் பதிவாகியுள்ளதா என்று உறுதி செய்யுங்கள்.\n\nEC பதிவேற்றப்பட்டால், நிலுவைக் கடன் இருந்தால் அது அதிகாரிக்கு முன்பே எச்சரிக்கையாகக் காட்டப்படும்.",
    },
    basis: "s.77 — apportionment where the land is subject to a charge",
    followUps: ["comp-mortgage", "doc-what-do-i-need"],
  },
  {
    id: "doc-heir",
    category: "documents",
    question: {
      en: "How do I get a legal heir certificate?",
      ta: "வாரிசு சான்றிதழ் எவ்வாறு பெறுவது?",
    },
    keywords: [
      "legal heir", "heir certificate", "succession certificate", "varisu",
      "வாரிசு சான்றிதழ்", "tahsildar", "death certificate", "father died",
      "how to get heir certificate", "name transfer",
    ],
    answer: {
      en:
        "Apply to the Tahsildar of the taluk where the deceased last resided, with the death certificate, proof of your relationship, and the addresses of all the heirs. The VAO verifies it locally and the certificate names everyone entitled to succeed.\n\nA legal heir certificate is not the same as a succession certificate: the first is a revenue document naming the heirs and is what an acquisition office needs; the second comes from a civil court and is for debts and securities. For compensation apportionment, the heir certificate is the one.\n\nStart it as soon as you know the land is being acquired, well before the award. It is the single commonest reason an award is passed but cannot be paid, and the money sits with the Authority until it is produced.",
      ta:
        "இறந்தவர் கடைசியாக வாழ்ந்த வட்டத்தின் வட்டாட்சியரிடம் விண்ணப்பியுங்கள் — இறப்புச் சான்றிதழ், உறவுக்கான ஆதாரம், அனைத்து வாரிசுகளின் முகவரிகளுடன். கிராம நிர்வாக அதிகாரி உள்ளூரில் சரிபார்ப்பார்.\n\nவாரிசு சான்றிதழ் (legal heir certificate) மற்றும் வாரிசுரிமைச் சான்றிதழ் (succession certificate) வேறுவேறு. கையகப்படுத்தல் அலுவலகத்திற்கு முதலாவதே தேவை.\n\nதீர்ப்புக்கு நீண்ட காலம் முன்பே தொடங்குங்கள். தீர்ப்பு வழங்கப்பட்டும் பணம் வழங்க முடியாததற்கு இதுவே மிகப் பொதுவான காரணம்.",
    },
    basis: "s.77 apportionment; legal heir certificate issued by the Tahsildar",
    followUps: ["comp-heir-deceased", "comp-joint-owners"],
  },
  {
    id: "doc-download-notice",
    category: "documents",
    question: {
      en: "Where can I download the notification or my award notice?",
      ta: "அறிவிப்பு அல்லது தீர்ப்பு ஆணையை எங்கே பதிவிறக்கம் செய்யலாம்?",
    },
    keywords: [
      "download", "notice", "notification copy", "award copy", "gazette", "certified copy",
      "பதிவிறக்கம்", "அறிவிப்பு நகல்", "ஆணை", "get a copy", "print notice",
      "where to find notification", "s11 copy",
    ],
    answer: {
      en:
        "The Documents page lists the published documents for every project — s.11 notifications, s.19 declarations, award orders, possession certificates, SIA reports — and each project page lists its own. No login is needed and there is no fee.\n\nIf your own notice was sent by post, the notification log on the Track page shows the date it was despatched and its delivery status, which is the record that matters if you are arguing you were never served.\n\nA downloaded copy from here is a true copy of what is on the file, but it is not a certified copy for court use. For that, apply to the Collector's office citing the document and its date — and download this one first so you can quote the exact reference.",
      ta:
        "ஆவணங்கள் பக்கத்தில் ஒவ்வொரு திட்டத்தின் வெளியிடப்பட்ட ஆவணங்கள் உள்ளன — பிரிவு 11 அறிவிப்புகள், பிரிவு 19 அறிவிப்புகள், தீர்ப்பு ஆணைகள், கையகப்படுத்தல் சான்றிதழ்கள், SIA அறிக்கைகள். உள்நுழைவு தேவையில்லை, கட்டணம் இல்லை.\n\nஉங்கள் அறிவிப்பு தபாலில் அனுப்பப்பட்டிருந்தால், Track பக்கத்தில் அனுப்பிய தேதி மற்றும் வழங்கல் நிலை தெரியும் — அறிவிப்பு கிடைக்கவில்லை என்று வாதிடுவதற்கு இதுவே ஆதாரம்.\n\nஇங்கிருந்து பதிவிறக்கியது கோப்பில் உள்ளதின் உண்மை நகல், ஆனால் நீதிமன்றத்திற்கான சான்றளிக்கப்பட்ட நகல் அல்ல.",
    },
    links: [{ label: { en: "Documents", ta: "ஆவணங்கள்" }, href: "/documents" }],
    followUps: ["doc-notice-not-received", "grv-track"],
  },
  {
    id: "doc-notice-not-received",
    category: "documents",
    question: {
      en: "I never received any notice. Is the acquisition still valid?",
      ta: "எனக்கு எந்த அறிவிப்பும் வரவில்லை. கையகப்படுத்தல் செல்லுமா?",
    },
    keywords: [
      "no notice", "never received", "not informed", "not served", "did not know",
      "அறிவிப்பு வரவில்லை", "தெரியாது", "no intimation", "found out late",
      "nobody told me", "missed deadline",
    ],
    answer: {
      en:
        "Failure to serve you is a serious defect and it is worth raising immediately, in writing, with the date you actually came to know.\n\nThe law requires the notification to be published in the gazette, in two local newspapers with one in the regional language, on the Collector's website, and at the Gram Panchayat, and requires individual notice to interested persons. Publication alone is not personal service.\n\nWhy the date you came to know matters: a s.64 reference runs from the award *or from the date you became aware of it*, so recording that date protects a window you might otherwise be told has closed. File a grievance stating that you were not served, the address at which you should have been, and when you learnt of the acquisition. The notification log on this portal shows what was actually despatched to whom and when, which either supports you or contradicts you — and either way it is a fact rather than a dispute.",
      ta:
        "உங்களுக்கு அறிவிப்பு வழங்கப்படாதது கடுமையான குறை. நீங்கள் உண்மையில் அறிந்த தேதியுடன் உடனே எழுத்துப்பூர்வமாகத் தெரிவியுங்கள்.\n\nசட்டப்படி அறிவிப்பு அரசிதழில், இரண்டு உள்ளூர் நாளிதழ்களில் (ஒன்று தமிழில்), ஆட்சியர் வலைதளத்தில், கிராம ஊராட்சியில் வெளியிடப்பட வேண்டும், மேலும் சம்பந்தப்பட்டவர்களுக்குத் தனிப்பட்ட அறிவிப்பு வழங்கப்பட வேண்டும். வெளியீடு மட்டும் தனிப்பட்ட வழங்கல் அல்ல.\n\nநீங்கள் அறிந்த தேதி முக்கியம்: பிரிவு 64 பரிந்துரை தீர்ப்பிலிருந்து *அல்லது நீங்கள் அறிந்த தேதியிலிருந்து* கணக்கிடப்படுகிறது. அறிவிப்புப் பட்டியல் யாருக்கு எப்போது அனுப்பப்பட்டது என்பதைக் காட்டும்.",
    },
    basis: "s.19(3)–(4) (publication requirements); s.21 (notice to interested persons); s.64 (limitation from knowledge of the award)",
    links: [{ label: { en: "File a grievance", ta: "குறை தாக்கல்" }, href: "/grievances" }],
    followUps: ["grv-how-to-file", "comp-disagree", "grv-court"],
  },
  {
    id: "doc-lost-patta",
    category: "documents",
    question: {
      en: "I have lost my patta. What now?",
      ta: "எனது பட்டா தொலைந்துவிட்டது. இப்போது என்ன செய்வது?",
    },
    keywords: [
      "lost patta", "lost my patta", "patta lost", "lost documents", "missing document",
      "destroyed", "burnt", "misplaced",
      "தொலைந்தது", "பட்டா இல்லை", "duplicate", "copy of patta", "no papers",
      "flood damaged",
    ],
    answer: {
      en:
        "The patta in your hand is a copy of a register the government keeps; losing yours does not affect your title. Get a fresh extract from the taluk office, an e-Sevai centre, or the online land records portal — it takes a day or two and costs very little.\n\nDo not let it stop you registering a claim or a grievance in the meantime. File with the survey number and village, note that the extract is being obtained, and add it when it comes. The filing date is what protects your objection window, and that window does not pause while you collect paperwork.",
      ta:
        "உங்கள் கையில் உள்ள பட்டா, அரசு வைத்திருக்கும் பதிவேட்டின் நகல் மட்டுமே; அது தொலைந்ததால் உங்கள் உரிமை பாதிக்கப்படாது. வட்டாட்சியர் அலுவலகம், இ-சேவை மையம் அல்லது நிலப் பதிவு வலைதளத்தில் புதிய பிரதி பெறுங்கள்.\n\nஅதுவரை கோரிக்கை அல்லது குறை மனு தாக்கல் செய்வதை நிறுத்த வேண்டாம். நில அளவை எண் மற்றும் கிராமத்துடன் தாக்கல் செய்து, பிரதி பெறப்படுகிறது என்று குறிப்பிடுங்கள். தாக்கல் தேதியே உங்கள் ஆட்சேபணை காலத்தைப் பாதுகாக்கிறது.",
    },
    followUps: ["doc-patta", "grv-how-to-file"],
  },
  {
    id: "doc-upload-formats",
    category: "documents",
    question: {
      en: "What file formats can I upload, and will a scan work?",
      ta: "எந்த வகை கோப்புகளைப் பதிவேற்றலாம்? ஸ்கேன் செய்தது வேலை செய்யுமா?",
    },
    keywords: [
      "upload", "file format", "pdf", "jpg", "scan", "photo", "excel", "csv",
      "பதிவேற்றம்", "கோப்பு வகை", "size limit", "how big", "will it read my scan",
      "ocr", "image",
    ],
    answer: {
      en:
        "PDF, DOCX, XLSX, CSV and image scans, up to 25 MB. A phone photograph is accepted.\n\nThe honest part: a PDF with a text layer is read directly and its fields come out with high confidence. A photograph, or a PDF that is only a picture of a page, has no text to read — no character recognition runs here, so nothing is pulled off the image and every field has to be confirmed against the paper. The confidence figure you see is capped for exactly that reason, and the reason is printed next to it.\n\nSo if a digital extract exists — from e-Sevai, or exported from the issuing office — upload that instead of a photograph of the printout. It is the difference between a form that fills itself and a form you check line by line.\n\nA spreadsheet is treated differently again: it goes through bulk intake, where every row is validated and you see exactly what each one would create or change before anything is written.",
      ta:
        "PDF, DOCX, XLSX, CSV மற்றும் ஸ்கேன் செய்த படங்கள், 25 MB வரை. கைபேசி புகைப்படமும் ஏற்கப்படும்.\n\nநேர்மையான பகுதி: உரை அடுக்குள்ள PDF நேரடியாகப் படிக்கப்படும், தகவல்கள் அதிக நம்பகத்தன்மையுடன் வரும். புகைப்படம், அல்லது வெறும் படமாக உள்ள PDF-இல் படிக்க உரை இல்லை — எழுத்து அறிதல் இங்கே இயங்காது, எனவே படத்திலிருந்து எதுவும் எடுக்கப்படாது; ஒவ்வொரு தகவலையும் அசல் ஆவணத்துடன் சரிபார்க்க வேண்டும். நம்பகத்தன்மை எண் அதனாலேயே குறைவாகக் காட்டப்படுகிறது, காரணமும் அதனுடன் அச்சிடப்படும்.\n\nமின்னணு பிரதி கிடைத்தால் அதைப் பதிவேற்றுங்கள், அச்சிட்ட தாளின் புகைப்படத்தை அல்ல.\n\nவிரிதாள் வேறுவிதமாகக் கையாளப்படுகிறது — ஒவ்வொரு வரிசையும் சரிபார்க்கப்பட்டு, எதுவும் எழுதப்படும் முன் என்ன மாறும் என்று காட்டப்படும்.",
    },
    followUps: ["doc-fmb", "sys-ai-explain", "grv-attach-documents"],
  },
  {
    id: "doc-what-is-extracted",
    category: "documents",
    question: {
      en: "What does the system read out of an uploaded document?",
      ta: "பதிவேற்றிய ஆவணத்திலிருந்து அமைப்பு எதைப் படிக்கிறது?",
    },
    keywords: [
      "extraction", "what is read", "auto fill", "reads document", "ai document",
      "படிக்கிறது", "தானாக நிரப்பு", "document intelligence", "which fields",
      "does it read patta", "auto create parcel",
    ],
    answer: {
      en:
        "It depends on the document, because only some of them carry structured data:\n\n• **FMB sketch or DGPS survey report** → a parcel, boundary included. The plot is drawn on the map rather than re-traced by hand.\n• **Patta or chitta extract** → the titleholder household, with the patta number, extent and masked Aadhaar.\n• **Encumbrance certificate** → the registered transactions and any subsisting charge, which is flagged before compensation can be paid.\n• **Guideline value certificate** → the notified rate and its effective date.\n• **Asset valuation report** → trees, wells and structures, with the total to enter as the assets value.\n• **Legal heir certificate** → the deceased holder and the heirs, for apportionment.\n• **DPR or s.11 notification** → the project itself: name, purpose, district, villages, extent, requiring body, gazette particulars.\n\nEverything else is stored and read for display only. Nothing is written to the register from an upload without an officer reviewing the extraction first and confirming it — and the server re-runs the extraction at that point rather than trusting what the browser sent, so what is approved is provably what gets written.",
      ta:
        "ஆவணத்தைப் பொறுத்து மாறுபடும் — சிலவற்றில் மட்டுமே கட்டமைக்கப்பட்ட தகவல் உள்ளது:\n\n• **FMB வரைபடம் அல்லது DGPS அறிக்கை** → நிலப்பகுதி, எல்லையுடன். வரைபடத்தில் தானாக வரையப்படும்.\n• **பட்டா/சிட்டா** → பட்டாதாரர் குடும்பம், பட்டா எண், பரப்பளவு.\n• **வில்லங்கச் சான்றிதழ்** → பதிவான பரிவர்த்தனைகள், நிலுவைக் கடன் எச்சரிக்கை.\n• **வழிகாட்டி மதிப்பு சான்றிதழ்** → அறிவிக்கப்பட்ட விலை மற்றும் தேதி.\n• **சொத்து மதிப்பீட்டு அறிக்கை** → மரங்கள், கிணறுகள், கட்டிடங்கள்.\n• **வாரிசு சான்றிதழ்** → இறந்தவர் மற்றும் வாரிசுகள்.\n• **DPR அல்லது பிரிவு 11 அறிவிப்பு** → திட்டமே: பெயர், நோக்கம், மாவட்டம், கிராமங்கள், பரப்பளவு.\n\nமற்றவை காட்சிக்கு மட்டும். அதிகாரி பரிசீலித்து உறுதி செய்யாமல் எந்தத் தகவலும் பதிவேட்டில் எழுதப்படாது.",
    },
    followUps: ["doc-upload-formats", "sys-ai-explain"],
  },
];
