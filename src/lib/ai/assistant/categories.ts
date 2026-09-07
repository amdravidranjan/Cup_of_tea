/**
 * The ten things people come to a land-acquisition help desk about.
 *
 * The widget's current five chips ("Project Status", "Compensation", "R&R",
 * "Grievance", "Documents") are a list of *our* modules. This is a list of
 * *their* problems, which is a different list — "where is my land", "am I
 * allowed to refuse", "when will the money arrive" are the three most common
 * questions at a real Collector's office and none of them is a module name.
 *
 * Grouping matters more than it looks. A free-text box is a memory test: the
 * user has to guess what the assistant knows. Two taps through a category to a
 * written-out question is not a fallback for people who cannot type — it is the
 * faster path for everyone, and on a phone handed across a table it is the only
 * path that works. So the categories are the primary interface and the text box
 * is the secondary one.
 *
 * `featured` is ordered by how often the question actually gets asked, not by
 * how fundamental it is. "How much will I get" comes before "how is market
 * value determined" even though the second explains the first.
 */

import type { QueryCategory } from "./types";

export const QUERY_CATEGORIES: QueryCategory[] = [
  {
    id: "compensation",
    label: { en: "Compensation & my money", ta: "இழப்பீடு மற்றும் பணம்" },
    blurb: {
      en: "How much you are owed, how it was calculated, and when it is paid.",
      ta: "உங்களுக்கு எவ்வளவு வரும், எப்படி கணக்கிடப்பட்டது, எப்போது வழங்கப்படும்.",
    },
    icon: "mdi:cash-multiple",
    featured: [
      "comp-how-much",
      "comp-formula",
      "comp-solatium",
      "comp-multiplier",
      "comp-market-value",
      "comp-when-paid",
      "comp-how-paid",
      "comp-disagree",
    ],
  },
  {
    id: "rr",
    label: { en: "Rehabilitation & resettlement", ta: "மறுவாழ்வு மற்றும் மீள்குடியேற்றம்" },
    blurb: {
      en: "Housing, grants, jobs and the help you get beyond the money.",
      ta: "வீடு, மாதாந்திர உதவி, வேலை — பணத்திற்கு அப்பால் கிடைக்கும் உதவிகள்.",
    },
    icon: "mdi:home-heart",
    featured: [
      "rr-what-do-i-get",
      "rr-housing",
      "rr-subsistence",
      "rr-job",
      "rr-who-qualifies",
      "rr-tenant",
      "rr-sc-st",
      "rr-when",
    ],
  },
  {
    id: "status",
    label: { en: "Project status & stages", ta: "திட்ட நிலை மற்றும் கட்டங்கள்" },
    blurb: {
      en: "Which stage a project has reached, what happens next, and how long it takes.",
      ta: "திட்டம் எந்த கட்டத்தில் உள்ளது, அடுத்து என்ன, எவ்வளவு காலம் ஆகும்.",
    },
    icon: "mdi:progress-clock",
    featured: [
      "status-check-project",
      "status-all-stages",
      "status-what-is-notified",
      "status-what-is-declared",
      "status-sia",
      "status-gram-sabha",
      "status-how-long",
      "status-why-delayed",
    ],
  },
  {
    id: "grievance",
    label: { en: "Complaints & objections", ta: "குறைகள் மற்றும் ஆட்சேபணைகள்" },
    blurb: {
      en: "How to object, how to complain, and what happens after you do.",
      ta: "ஆட்சேபிக்க, குறை தெரிவிக்க, அதன் பிறகு என்ன நடக்கும்.",
    },
    icon: "mdi:gavel",
    featured: [
      "grv-how-to-file",
      "grv-track",
      "grv-what-happens",
      "grv-how-long",
      "grv-object-acquisition",
      "grv-escalate",
      "grv-court",
      "grv-anonymous",
    ],
  },
  {
    id: "documents",
    label: { en: "Documents & certificates", ta: "ஆவணங்கள் மற்றும் சான்றிதழ்கள்" },
    blurb: {
      en: "What papers you need, where to get them, and what the portal publishes.",
      ta: "என்ன ஆவணங்கள் தேவை, எங்கு பெறுவது, வலைதளத்தில் என்ன வெளியிடப்படுகிறது.",
    },
    icon: "mdi:file-document-multiple",
    featured: [
      "doc-what-do-i-need",
      "doc-patta",
      "doc-ec",
      "doc-heir",
      "doc-download-notice",
      "doc-fmb",
      "doc-upload-formats",
      "doc-lost-patta",
    ],
  },
  {
    id: "land-records",
    label: { en: "Finding my land", ta: "எனது நிலத்தைக் கண்டறிதல்" },
    blurb: {
      en: "Look up a parcel by survey or patta number and read what the record says.",
      ta: "நில அளவை எண் அல்லது பட்டா எண் மூலம் உங்கள் நிலத்தைத் தேடுங்கள்.",
    },
    icon: "mdi:map-search",
    featured: [
      "land-find-my-parcel",
      "land-survey-number",
      "land-patta-vs-survey",
      "land-units",
      "land-classification",
      "land-boundary-wrong",
      "land-joint-owners",
      "land-partly-affected",
    ],
  },
  {
    id: "rights",
    label: { en: "My rights under the law", ta: "சட்டப்படி எனது உரிமைகள்" },
    blurb: {
      en: "What the 2013 Act guarantees you, and what the government must do first.",
      ta: "2013 சட்டம் உங்களுக்கு உறுதியளிப்பது என்ன, அரசு முதலில் என்ன செய்ய வேண்டும்.",
    },
    icon: "mdi:scale-balance",
    featured: [
      "rights-can-i-refuse",
      "rights-consent",
      "rights-hearing",
      "rights-lapse",
      "rights-unused-land",
      "rights-multi-crop",
      "rights-urgency",
      "rights-which-act",
    ],
  },
  {
    id: "possession",
    label: { en: "Possession & land use", ta: "கையகப்படுத்தல் மற்றும் நில பயன்பாடு" },
    blurb: {
      en: "When the government can take the land, and what happens to it afterwards.",
      ta: "அரசு எப்போது நிலத்தை எடுக்கலாம், அதன் பிறகு என்ன ஆகும்.",
    },
    icon: "mdi:fence",
    featured: [
      "poss-when-taken",
      "poss-notice-first",
      "poss-still-farming",
      "poss-crops",
      "poss-encroachment",
      "poss-land-bank",
      "poss-structures",
      "poss-verification-visit",
    ],
  },
  {
    id: "system",
    label: { en: "Using this portal", ta: "இந்த வலைதளத்தைப் பயன்படுத்துதல்" },
    blurb: {
      en: "What TN-GLMS is, who can see your data, and how the analytics work.",
      ta: "TN-GLMS என்றால் என்ன, உங்கள் தகவலை யார் பார்க்க முடியும், பகுப்பாய்வு எவ்வாறு செயல்படுகிறது.",
    },
    icon: "mdi:information-outline",
    featured: [
      "sys-what-is-this",
      "sys-need-account",
      "sys-privacy",
      "sys-audit-trail",
      "sys-ai-explain",
      "sys-tamil",
      "sys-offline",
      "sys-official",
    ],
  },
  {
    id: "help",
    label: { en: "Help & contact", ta: "உதவி மற்றும் தொடர்பு" },
    blurb: {
      en: "Talk to a person, find your office, or get help using this page.",
      ta: "ஒரு அதிகாரியுடன் பேசுங்கள், உங்கள் அலுவலகத்தைக் கண்டறியுங்கள்.",
    },
    icon: "mdi:lifebuoy",
    featured: [
      "help-what-can-you-do",
      "help-talk-to-person",
      "help-which-office",
      "help-languages",
      "help-not-my-question",
      "help-voice",
      "help-illiterate",
      "help-report-portal-bug",
    ],
  },
];

export function categoryById(id: string): QueryCategory | null {
  return QUERY_CATEGORIES.find((c) => c.id === id) ?? null;
}
