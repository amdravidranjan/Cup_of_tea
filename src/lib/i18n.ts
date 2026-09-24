/**
 * Bilingual (English / Tamil) label vocabulary.
 *
 * The portal presents every user-facing label in both languages, the way a
 * Tamil Nadu government portal is expected to. Before this file the Tamil half
 * was typed inline, page by page, which meant it existed on the public site and
 * the dashboard and nowhere else — the entire project workspace, every panel
 * and every other console page was English-only, and the same term could be
 * translated two different ways on two different screens.
 *
 * This is a shared vocabulary rather than a full i18n runtime on purpose: the
 * portal always shows both languages together (there is no language *switch*
 * to honour), so what is actually needed is one authoritative Tamil string per
 * domain term, not a locale-selection framework.
 *
 * Terms follow Tamil Nadu Revenue Department usage — e.g. நிலம் கையகப்படுத்தல்
 * for land acquisition, இழப்பீடு for compensation, நில அளவை எண் for survey
 * number — rather than literal translations.
 */
export const TA: Record<string, string> = {
  // ─── Navigation / shell ───────────────────────────────────────────────
  Dashboard: "கட்டுப்பாட்டு மையம்",
  Projects: "திட்டங்கள்",
  Grievances: "குறைகள்",
  "Field Verification": "கள சரிபார்ப்பு",
  "Public Portal": "பொது வலைதளம்",
  More: "மேலும்",
  Reports: "அறிக்கைகள்",
  "MIS Reports": "தகவல் அறிக்கைகள்",
  Contractors: "ஒப்பந்ததாரர்கள்",
  "Project Requests": "திட்ட கோரிக்கைகள்",
  "District Workload": "மாவட்ட பணிச்சுமை",
  "Title-Chain Conflicts": "உரிமை முரண்பாடுகள்",
  "Encroachment Monitoring": "ஆக்கிரமிப்பு கண்காணிப்பு",
  "Land Bank": "நில வங்கி",
  Interoperability: "இணை இயக்கம்",
  "Sign out": "வெளியேறு",

  // ─── Workspace tabs ───────────────────────────────────────────────────
  Overview: "மேலோட்டம்",
  Compensation: "இழப்பீடு",
  "R&R & Families": "மறுவாழ்வு மற்றும் குடும்பங்கள்",
  Infrastructure: "உள்கட்டமைப்பு",
  Legal: "சட்டம்",
  Tenders: "ஒப்பந்தப்புள்ளிகள்",
  Community: "சமூகம்",
  Documents: "ஆவணங்கள்",

  // ─── Land record ──────────────────────────────────────────────────────
  "Survey No.": "நில அளவை எண்",
  "Survey number": "நில அளவை எண்",
  "Patta No.": "பட்டா எண்",
  "Patta number": "பட்டா எண்",
  Village: "கிராமம்",
  District: "மாவட்டம்",
  State: "மாநிலம்",
  "Area (ha)": "பரப்பளவு (ஹெ)",
  Extent: "பரப்பளவு",
  Parcel: "நிலப்பகுதி",
  Parcels: "நிலப்பகுதிகள்",
  Location: "இடம்",
  Map: "வரைபடம்",

  // ─── Compensation ─────────────────────────────────────────────────────
  "Total award": "மொத்த இழப்பீடு",
  "Market value of land": "நிலத்தின் சந்தை மதிப்பு",
  Solatium: "ஆறுதல் தொகை",
  Interest: "வட்டி",
  Status: "நிலை",
  Action: "நடவடிக்கை",
  Actions: "நடவடிக்கைகள்",
  Paid: "வழங்கப்பட்டது",
  Assessed: "மதிப்பிடப்பட்டது",
  Unassessed: "மதிப்பிடப்படவில்லை",

  // ─── R&R ──────────────────────────────────────────────────────────────
  Families: "குடும்பங்கள்",
  "Affected families": "பாதிக்கப்பட்ட குடும்பங்கள்",
  Entitlements: "உரிமைகள்",
  Rehabilitation: "மறுவாழ்வு",
  Succession: "வாரிசு உரிமை",

  // ─── Workflow / status ────────────────────────────────────────────────
  "Current Stage": "தற்போதைய நிலை",
  Stage: "நிலை",
  History: "வரலாறு",
  "SLA Timelines": "காலக்கெடு",
  Pending: "நிலுவையில்",
  Approved: "அங்கீகரிக்கப்பட்டது",
  Rejected: "நிராகரிக்கப்பட்டது",
  Completed: "நிறைவு",

  // ─── Workspace section titles ─────────────────────────────────────────
  "Edit alignment & parcels": "சீரமைப்பு மற்றும் நிலப்பகுதி திருத்தம்",
  "Before / after compare": "முன் / பின் ஒப்பீடு",
  "3D terrain view": "முப்பரிமாண நிலத்தோற்றம்",
  "Elevation profile": "உயர விவரக்குறிப்பு",
  "Affected Families": "பாதிக்கப்பட்ட குடும்பங்கள்",
  "Rehabilitation Facilitation": "மறுவாழ்வு உதவி",
  "Legal Disputes": "சட்ட வழக்குகள்",
  "Tenders & Contractors": "ஒப்பந்தப்புள்ளிகள் மற்றும் ஒப்பந்ததாரர்கள்",
  "Gram Sabha Consultations": "கிராம சபை ஆலோசனைகள்",
  "Notifications to Affected Families": "பாதிக்கப்பட்ட குடும்பங்களுக்கு அறிவிப்புகள்",
  "AI Risk Assessment": "ஆபத்து மதிப்பீடு",
  "AI Land Rate Prediction": "நில விலை முன்கணிப்பு",
  "Land Bank Register": "நில வங்கி பதிவேடு",
  "Infrastructure Checklist": "உள்கட்டமைப்பு சரிபார்ப்பு பட்டியல்",

  // ─── Common actions ───────────────────────────────────────────────────
  Search: "தேடு",
  Filter: "வடிகட்டு",
  Download: "பதிவிறக்கம்",
  Upload: "பதிவேற்று",
  Save: "சேமி",
  Cancel: "ரத்து",
  Submit: "சமர்ப்பி",
  Close: "மூடு",
  View: "பார்",
  Details: "விவரங்கள்",
};

/**
 * Hindi vocabulary, keyed exactly like `TA`. Terms follow the Department of
 * Land Resources' Hindi usage — भूमि अर्जन for land acquisition, प्रतिकर for
 * compensation, सर्वेक्षण संख्या for survey number.
 */
export const HI: Record<string, string> = {
  // ─── Navigation / shell ───────────────────────────────────────────────
  Dashboard: "डैशबोर्ड",
  Projects: "परियोजनाएँ",
  Grievances: "शिकायतें",
  "Field Verification": "क्षेत्र सत्यापन",
  "Public Portal": "सार्वजनिक पोर्टल",
  More: "और",
  Reports: "रिपोर्ट",
  "MIS Reports": "एमआईएस रिपोर्ट",
  Contractors: "ठेकेदार",
  "Project Requests": "परियोजना अनुरोध",
  "District Workload": "ज़िला कार्यभार",
  "Title-Chain Conflicts": "स्वामित्व विवाद",
  "Encroachment Monitoring": "अतिक्रमण निगरानी",
  "Land Bank": "भूमि बैंक",
  Interoperability: "अंतर-संचालन",
  "Sign out": "साइन आउट",

  // ─── Workspace tabs ───────────────────────────────────────────────────
  Overview: "सारांश",
  Compensation: "प्रतिकर",
  "R&R & Families": "पुनर्वास एवं परिवार",
  Infrastructure: "आधारभूत संरचना",
  Legal: "विधिक",
  Tenders: "निविदाएँ",
  Community: "समुदाय",
  Documents: "दस्तावेज़",

  // ─── Land record ──────────────────────────────────────────────────────
  "Survey No.": "सर्वेक्षण संख्या",
  "Survey number": "सर्वेक्षण संख्या",
  "Patta No.": "पट्टा संख्या",
  "Patta number": "पट्टा संख्या",
  Village: "गाँव",
  District: "ज़िला",
  State: "राज्य",
  "Area (ha)": "क्षेत्रफल (हे.)",
  Extent: "क्षेत्रफल",
  Parcel: "भूखंड",
  Parcels: "भूखंड",
  Location: "स्थान",
  Map: "मानचित्र",

  // ─── Compensation ─────────────────────────────────────────────────────
  "Total award": "कुल अवार्ड",
  "Market value of land": "भूमि का बाज़ार मूल्य",
  Solatium: "सांत्वना राशि",
  Interest: "ब्याज",
  Status: "स्थिति",
  Action: "कार्रवाई",
  Actions: "कार्रवाइयाँ",
  Paid: "भुगतान किया गया",
  Assessed: "आकलित",
  Unassessed: "अनाकलित",

  // ─── R&R ──────────────────────────────────────────────────────────────
  Families: "परिवार",
  "Affected families": "प्रभावित परिवार",
  Entitlements: "हकदारियाँ",
  Rehabilitation: "पुनर्वास",
  Succession: "उत्तराधिकार",

  // ─── Workflow / status ────────────────────────────────────────────────
  "Current Stage": "वर्तमान चरण",
  Stage: "चरण",
  History: "इतिहास",
  "SLA Timelines": "समय-सीमा",
  Pending: "लंबित",
  Approved: "स्वीकृत",
  Rejected: "अस्वीकृत",
  Completed: "पूर्ण",

  // ─── Workspace section titles ─────────────────────────────────────────
  "Edit alignment & parcels": "संरेखण एवं भूखंड संपादित करें",
  "Before / after compare": "पहले / बाद की तुलना",
  "3D terrain view": "त्रि-आयामी भू-दृश्य",
  "Elevation profile": "ऊँचाई प्रोफ़ाइल",
  "Affected Families": "प्रभावित परिवार",
  "Rehabilitation Facilitation": "पुनर्वास सहायता",
  "Legal Disputes": "विधिक विवाद",
  "Tenders & Contractors": "निविदाएँ एवं ठेकेदार",
  "Gram Sabha Consultations": "ग्राम सभा परामर्श",
  "Notifications to Affected Families": "प्रभावित परिवारों को सूचनाएँ",
  "AI Risk Assessment": "जोखिम आकलन",
  "AI Land Rate Prediction": "भूमि दर पूर्वानुमान",
  "Land Bank Register": "भूमि बैंक रजिस्टर",
  "Infrastructure Checklist": "आधारभूत संरचना जाँच-सूची",

  // ─── Common actions ───────────────────────────────────────────────────
  Search: "खोजें",
  Filter: "छाँटें",
  Download: "डाउनलोड",
  Upload: "अपलोड",
  Save: "सहेजें",
  Cancel: "रद्द करें",
  Submit: "जमा करें",
  Close: "बंद करें",
  View: "देखें",
  Details: "विवरण",
};

/** The Tamil rendering of `term`, or null when the vocabulary has no entry. */
export function ta(term: string): string | null {
  return TA[term] ?? null;
}

/** The Hindi rendering of `term`, or null when the vocabulary has no entry. */
export function hi(term: string): string | null {
  return HI[term] ?? null;
}
