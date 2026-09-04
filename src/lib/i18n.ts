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

/** The Tamil rendering of `term`, or null when the vocabulary has no entry. */
export function ta(term: string): string | null {
  return TA[term] ?? null;
}
