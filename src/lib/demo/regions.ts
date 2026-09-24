/**
 * Where the walkthrough's demo project is sited, per language.
 *
 * A judge who picks Kannada should not be handed a Tamil Nadu case with Tamil
 * titleholders. Picking a language therefore picks a *region*: the state, the
 * district, the revenue villages, the river the bridge crosses and the pool of
 * names the land records are written from all change with it.
 *
 * ── What is real and what is not ──────────────────────────────────────────
 * The state, district, taluk, town and river of each region are real, and the
 * crossing coordinates put the project on that river, so the map and the 3D
 * terrain show somewhere defensible. The revenue villages, survey numbers,
 * titleholders, patta numbers and every rupee figure are invented. No region
 * below describes a real acquisition, a real holding or a real person.
 *
 * `crossing.bearing` is the river's flow direction in degrees from north; the
 * alignment is laid out square to it (see `buildRegionParcels`). Tamil Nadu is
 * the exception: it carries the hand-drawn flagship geometry, because the
 * pitch deck, the demo video and the shipped demo-kit files are all cut from
 * those exact plots.
 */

import type { SecondLang } from "@/lib/lang";

export interface RegionVillage {
  name: string;
  native: string;
  /** Which side of the river it lies on. */
  bank: "north" | "south";
  code: string;
}

export interface DemoRegion {
  id: string;
  /** Tour languages that land in this region. */
  langs: string[];
  /** The second UI language that suits this region. */
  uiSecond: SecondLang;
  state: string;
  stateNative: string;
  district: string;
  districtNative: string;
  taluk: string;
  town: string;
  townNative: string;
  river: string;
  riverNative: string;
  projectName: string;
  projectNameNative: string;
  purpose: string;
  requiringBody: string;
  dprNumber: string;
  /** Prefix of the fictional ration-card numbers. */
  rationPrefix: string;
  /** Notified rate for the district, in rupees per hectare. */
  ratePerHectare: number;
  villages: RegionVillage[];
  given: string[];
  givenNative: string[];
  initials: string[];
  crossing: { lon: number; lat: number; bearing: number; widthM: number };
  /** Set only for Tamil Nadu, which keeps the hand-drawn flagship geometry. */
  flagship?: true;
}

export const REGIONS: DemoRegion[] = [
  {
    id: "tn",
    langs: ["en", "ta"],
    uiSecond: "ta",
    state: "Tamil Nadu",
    stateNative: "தமிழ்நாடு",
    district: "Coimbatore",
    districtNative: "கோயம்புத்தூர்",
    taluk: "Mettupalayam",
    town: "Sirumugai",
    townNative: "சிறுமுகை",
    river: "Bhavani",
    riverNative: "பவானி",
    projectName: "Bhavani River Bridge & Approach Road, Sirumugai",
    projectNameNative: "பவானி ஆற்றுப் பாலம் மற்றும் அணுகு சாலை, சிறுமுகை",
    purpose:
      "A two-lane high-level bridge across the Bhavani at Sirumugai with approach roads on both banks, replacing the low-level causeway that is overtopped and impassable through the north-east monsoon.",
    requiringBody: "Highways Department, Government of Tamil Nadu",
    dprNumber: "TNHD/CBE/MTP/2025/BR-14",
    rationPrefix: "TN",
    ratePerHectare: 2_950_000,
    villages: [
      { name: "Kizhakku Sirumugai", native: "கிழக்கு சிறுமுகை", bank: "north", code: "CBE-MTP-041" },
      { name: "Alangombu", native: "அலங்கொம்பு", bank: "south", code: "CBE-MTP-042" },
      { name: "Thenkarai Pudur", native: "தென்கரை புதூர்", bank: "south", code: "CBE-MTP-043" },
    ],
    given: [
      "Murugan", "Lakshmi", "Ramasamy", "Kaliyammal", "Selvaraj", "Meenakshi",
      "Palanisamy", "Ponnammal", "Duraisamy", "Saroja", "Kandasamy", "Vasanthi",
    ],
    givenNative: [
      "முருகன்", "லட்சுமி", "ராமசாமி", "காளியம்மாள்", "செல்வராஜ்", "மீனாட்சி",
      "பழனிசாமி", "பொன்னம்மாள்", "துரைசாமி", "சரோஜா", "கந்தசாமி", "வசந்தி",
    ],
    initials: ["R", "K", "M", "S", "P", "V", "N", "T", "C", "A", "G", "D"],
    crossing: { lon: 77.008861, lat: 11.32225, bearing: 72, widthM: 210 },
    flagship: true,
  },
  {
    id: "up",
    langs: ["hi"],
    uiSecond: "hi",
    state: "Uttar Pradesh",
    stateNative: "उत्तर प्रदेश",
    district: "Lucknow",
    districtNative: "लखनऊ",
    taluk: "Bakshi Ka Talab",
    town: "Kathwara",
    townNative: "कथवारा",
    river: "Gomti",
    riverNative: "गोमती",
    projectName: "Gomti River Bridge & Approach Road, Kathwara",
    projectNameNative: "गोमती नदी पुल एवं पहुँच मार्ग, कथवारा",
    purpose:
      "A two-lane high-level bridge across the Gomti at Kathwara with approach roads on both banks, replacing the seasonal pontoon crossing that is withdrawn every monsoon.",
    requiringBody: "Public Works Department, Government of Uttar Pradesh",
    dprNumber: "UPPWD/LKO/BKT/2025/BR-09",
    rationPrefix: "UP",
    ratePerHectare: 3_400_000,
    villages: [
      { name: "Kathwara Uttari", native: "कथवारा उत्तरी", bank: "north", code: "LKO-BKT-031" },
      { name: "Gaura Bhadauli", native: "गौरा भदौली", bank: "south", code: "LKO-BKT-032" },
      { name: "Sarsawan Pur", native: "सरसावाँ पुर", bank: "south", code: "LKO-BKT-033" },
    ],
    given: [
      "Ram Prasad", "Sunita", "Shiv Kumar", "Kamla", "Rajendra", "Savitri",
      "Dinesh", "Phoolmati", "Mahesh", "Ram Dulari", "Suresh", "Chandrawati",
    ],
    givenNative: [
      "राम प्रसाद", "सुनीता", "शिव कुमार", "कमला", "राजेन्द्र", "सावित्री",
      "दिनेश", "फूलमती", "महेश", "राम दुलारी", "सुरेश", "चंद्रावती",
    ],
    initials: ["R", "S", "K", "M", "P", "V", "A", "B", "D", "G", "L", "N"],
    crossing: { lon: 81.00900, lat: 26.98000, bearing: 135, widthM: 130 },
  },
  {
    id: "ap",
    langs: ["te"],
    uiSecond: "hi",
    state: "Andhra Pradesh",
    stateNative: "ఆంధ్రప్రదేశ్",
    district: "Guntur",
    districtNative: "గుంటూరు",
    taluk: "Thullur",
    town: "Amaravati",
    townNative: "అమరావతి",
    river: "Krishna",
    riverNative: "కృష్ణా",
    projectName: "Krishna River Bridge & Approach Road, Amaravati",
    projectNameNative: "కృష్ణా నది వంతెన మరియు చేరు రహదారి, అమరావతి",
    purpose:
      "A two-lane high-level bridge across the Krishna at Amaravati with approach roads on both banks, replacing the ferry that stops running whenever the river is in spate.",
    requiringBody: "Roads & Buildings Department, Government of Andhra Pradesh",
    dprNumber: "APRB/GNT/TLR/2025/BR-07",
    rationPrefix: "AP",
    ratePerHectare: 4_200_000,
    villages: [
      { name: "Uttara Lingayapalem", native: "ఉత్తర లింగాయపాలెం", bank: "north", code: "GNT-TLR-021" },
      { name: "Venkatapalem", native: "వెంకటపాలెం", bank: "south", code: "GNT-TLR-022" },
      { name: "Rayapudi Kotha", native: "రాయపూడి కొత్త", bank: "south", code: "GNT-TLR-023" },
    ],
    given: [
      "Venkateswarlu", "Lakshmi Devi", "Ramanaiah", "Padmavathi", "Nageswara Rao", "Sarojini",
      "Subba Rao", "Ananthalakshmi", "Koteswara Rao", "Rajeswari", "Srinivasulu", "Vijaya",
    ],
    givenNative: [
      "వెంకటేశ్వర్లు", "లక్ష్మీ దేవి", "రామనయ్య", "పద్మావతి", "నాగేశ్వర రావు", "సరోజిని",
      "సుబ్బారావు", "అనంతలక్ష్మి", "కోటేశ్వర రావు", "రాజేశ్వరి", "శ్రీనివాసులు", "విజయ",
    ],
    initials: ["K", "V", "P", "N", "S", "M", "R", "B", "G", "T", "D", "A"],
    crossing: { lon: 80.51500, lat: 16.57300, bearing: 100, widthM: 620 },
  },
  {
    id: "ka",
    langs: ["kn"],
    uiSecond: "hi",
    state: "Karnataka",
    stateNative: "ಕರ್ನಾಟಕ",
    district: "Mandya",
    districtNative: "ಮಂಡ್ಯ",
    taluk: "Srirangapatna",
    town: "Karighatta",
    townNative: "ಕರಿಘಟ್ಟ",
    river: "Kaveri",
    riverNative: "ಕಾವೇರಿ",
    projectName: "Kaveri River Bridge & Approach Road, Karighatta",
    projectNameNative: "ಕಾವೇರಿ ನದಿ ಸೇತುವೆ ಮತ್ತು ಸಂಪರ್ಕ ರಸ್ತೆ, ಕರಿಘಟ್ಟ",
    purpose:
      "A two-lane high-level bridge across the Kaveri at Karighatta with approach roads on both banks, replacing the low-level causeway that is submerged whenever the dam releases water.",
    requiringBody: "Public Works Department, Government of Karnataka",
    dprNumber: "KPWD/MYA/SRP/2025/BR-12",
    rationPrefix: "KA",
    ratePerHectare: 3_850_000,
    villages: [
      { name: "Karighatta Uttara", native: "ಕರಿಘಟ್ಟ ಉತ್ತರ", bank: "north", code: "MYA-SRP-018" },
      { name: "Belagola Hosuru", native: "ಬೆಳಗೊಳ ಹೊಸೂರು", bank: "south", code: "MYA-SRP-019" },
      { name: "Ganjam Kaval", native: "ಗಂಜಾಂ ಕಾವಲ್", bank: "south", code: "MYA-SRP-020" },
    ],
    given: [
      "Mahadevappa", "Gowramma", "Siddaraju", "Nagamma", "Puttaswamy", "Lakshmamma",
      "Chikkanna", "Sharadamma", "Basavaraju", "Jayamma", "Shivanna", "Rathnamma",
    ],
    givenNative: [
      "ಮಹಾದೇವಪ್ಪ", "ಗೌರಮ್ಮ", "ಸಿದ್ದರಾಜು", "ನಾಗಮ್ಮ", "ಪುಟ್ಟಸ್ವಾಮಿ", "ಲಕ್ಷ್ಮಮ್ಮ",
      "ಚಿಕ್ಕಣ್ಣ", "ಶಾರದಮ್ಮ", "ಬಸವರಾಜು", "ಜಯಮ್ಮ", "ಶಿವಣ್ಣ", "ರತ್ನಮ್ಮ",
    ],
    initials: ["K", "M", "S", "B", "N", "H", "C", "L", "P", "R", "G", "D"],
    crossing: { lon: 76.69000, lat: 12.41500, bearing: 80, widthM: 250 },
  },
  {
    id: "kl",
    langs: ["ml"],
    uiSecond: "hi",
    state: "Kerala",
    stateNative: "കേരളം",
    district: "Ernakulam",
    districtNative: "എറണാകുളം",
    taluk: "Aluva",
    town: "Chengamanad",
    townNative: "ചെങ്ങമനാട്",
    river: "Periyar",
    riverNative: "പെരിയാർ",
    projectName: "Periyar River Bridge & Approach Road, Chengamanad",
    projectNameNative: "പെരിയാർ നദി പാലവും സമീപന റോഡും, ചെങ്ങമനാട്",
    purpose:
      "A two-lane high-level bridge across the Periyar at Chengamanad with approach roads on both banks, replacing the narrow colonial-era bridge that cannot carry the traffic to the airport road.",
    requiringBody: "Public Works Department, Government of Kerala",
    dprNumber: "KPWD/EKM/ALV/2025/BR-05",
    rationPrefix: "KL",
    ratePerHectare: 5_600_000,
    villages: [
      { name: "Chengamanad North", native: "ചെങ്ങമനാട് വടക്ക്", bank: "north", code: "EKM-ALV-011" },
      { name: "Nedumbassery Kara", native: "നെടുമ്പാശ്ശേരി കര", bank: "south", code: "EKM-ALV-012" },
      { name: "Kanjoor Thekku", native: "കാഞ്ഞൂർ തെക്ക്", bank: "south", code: "EKM-ALV-013" },
    ],
    given: [
      "Krishnankutty", "Sarasamma", "Balakrishnan", "Ammini", "Rajan", "Omana",
      "Velayudhan", "Sulochana", "Gopalakrishnan", "Devaki", "Sasidharan", "Leelamma",
    ],
    givenNative: [
      "കൃഷ്ണൻകുട്ടി", "സരസമ്മ", "ബാലകൃഷ്ണൻ", "അമ്മിണി", "രാജൻ", "ഓമന",
      "വേലായുധൻ", "സുലോചന", "ഗോപാലകൃഷ്ണൻ", "ദേവകി", "ശശിധരൻ", "ലീലാമ്മ",
    ],
    initials: ["K", "P", "T", "V", "M", "N", "A", "C", "S", "G", "R", "J"],
    crossing: { lon: 76.34000, lat: 10.11000, bearing: 250, widthM: 180 },
  },
  {
    id: "mh",
    langs: ["mr"],
    uiSecond: "hi",
    state: "Maharashtra",
    stateNative: "महाराष्ट्र",
    district: "Chhatrapati Sambhajinagar",
    districtNative: "छत्रपती संभाजीनगर",
    taluk: "Paithan",
    town: "Bidkin",
    townNative: "बिडकीन",
    river: "Godavari",
    riverNative: "गोदावरी",
    projectName: "Godavari River Bridge & Approach Road, Bidkin",
    projectNameNative: "गोदावरी नदी पूल व पोहोच रस्ता, बिडकीन",
    purpose:
      "A two-lane high-level bridge across the Godavari at Bidkin with approach roads on both banks, replacing the causeway that is closed for weeks together when Jayakwadi releases water.",
    requiringBody: "Public Works Department, Government of Maharashtra",
    dprNumber: "MPWD/CSN/PTN/2025/BR-16",
    rationPrefix: "MH",
    ratePerHectare: 3_650_000,
    villages: [
      { name: "Bidkin Uttar", native: "बिडकीन उत्तर", bank: "north", code: "CSN-PTN-027" },
      { name: "Pachod Khurd", native: "पाचोड खुर्द", bank: "south", code: "CSN-PTN-028" },
      { name: "Nanded Tanda", native: "नांदेड तांडा", bank: "south", code: "CSN-PTN-029" },
    ],
    given: [
      "Dnyaneshwar", "Shantabai", "Bhaurao", "Mangal", "Vitthal", "Sushila",
      "Namdev", "Kalpana", "Ramrao", "Indubai", "Sopan", "Vaishali",
    ],
    givenNative: [
      "ज्ञानेश्वर", "शांताबाई", "भाऊराव", "मंगल", "विठ्ठल", "सुशीला",
      "नामदेव", "कल्पना", "रामराव", "इंदुबाई", "सोपान", "वैशाली",
    ],
    initials: ["P", "S", "K", "B", "D", "J", "M", "N", "G", "R", "T", "V"],
    crossing: { lon: 75.38000, lat: 19.48000, bearing: 95, widthM: 300 },
  },
  {
    id: "gj",
    langs: ["gu"],
    uiSecond: "hi",
    state: "Gujarat",
    stateNative: "ગુજરાત",
    district: "Bharuch",
    districtNative: "ભરૂચ",
    taluk: "Bharuch",
    town: "Zadeshwar",
    townNative: "ઝાડેશ્વર",
    river: "Narmada",
    riverNative: "નર્મદા",
    projectName: "Narmada River Bridge & Approach Road, Zadeshwar",
    projectNameNative: "નર્મદા નદી પુલ અને પહોંચ માર્ગ, ઝાડેશ્વર",
    purpose:
      "A two-lane high-level bridge across the Narmada at Zadeshwar with approach roads on both banks, taking the district traffic off the single ageing crossing at Bharuch.",
    requiringBody: "Roads & Buildings Department, Government of Gujarat",
    dprNumber: "GRB/BRC/BRC/2025/BR-11",
    rationPrefix: "GJ",
    ratePerHectare: 4_100_000,
    villages: [
      { name: "Zadeshwar Uttar", native: "ઝાડેશ્વર ઉત્તર", bank: "north", code: "BRC-BRC-014" },
      { name: "Sherpura Kotha", native: "શેરપુરા કોઠા", bank: "south", code: "BRC-BRC-015" },
      { name: "Vadadla Moti", native: "વડદલા મોટી", bank: "south", code: "BRC-BRC-016" },
    ],
    given: [
      "Bhikhabhai", "Kantaben", "Ramanbhai", "Jasuben", "Naranbhai", "Shardaben",
      "Chhaganbhai", "Manjulaben", "Dahyabhai", "Ramilaben", "Jayantibhai", "Hansaben",
    ],
    givenNative: [
      "ભીખાભાઈ", "કાંતાબેન", "રમણભાઈ", "જસુબેન", "નારણભાઈ", "શારદાબેન",
      "છગનભાઈ", "મંજુલાબેન", "દહ્યાભાઈ", "રમીલાબેન", "જયંતીભાઈ", "હંસાબેન",
    ],
    initials: ["P", "M", "D", "R", "V", "S", "K", "J", "N", "B", "C", "H"],
    crossing: { lon: 72.99000, lat: 21.72000, bearing: 265, widthM: 500 },
  },
  {
    id: "wb",
    langs: ["bn"],
    uiSecond: "hi",
    state: "West Bengal",
    stateNative: "পশ্চিমবঙ্গ",
    district: "Purba Bardhaman",
    districtNative: "পূর্ব বর্ধমান",
    taluk: "Bardhaman Sadar",
    town: "Palla Road",
    townNative: "পাল্লা রোড",
    river: "Damodar",
    riverNative: "দামোদর",
    projectName: "Damodar River Bridge & Approach Road, Palla Road",
    projectNameNative: "দামোদর নদ সেতু ও সংযোগ সড়ক, পাল্লা রোড",
    purpose:
      "A two-lane high-level bridge across the Damodar at Palla Road with approach roads on both banks, replacing the sand crossing that is unusable from June to October.",
    requiringBody: "Public Works Department, Government of West Bengal",
    dprNumber: "WBPWD/PBN/BSD/2025/BR-08",
    rationPrefix: "WB",
    ratePerHectare: 3_150_000,
    villages: [
      { name: "Palla Uttar", native: "পাল্লা উত্তর", bank: "north", code: "PBN-BSD-036" },
      { name: "Sadarghat Dakshin", native: "সদরঘাট দক্ষিণ", bank: "south", code: "PBN-BSD-037" },
      { name: "Idilpur Kholsa", native: "ইদিলপুর খোলসা", bank: "south", code: "PBN-BSD-038" },
    ],
    given: [
      "Nitai", "Anima", "Haradhan", "Basanti", "Sanatan", "Sandhya",
      "Kartik", "Jharna", "Bimal", "Kalpana", "Swapan", "Mira",
    ],
    givenNative: [
      "নিতাই", "অনিমা", "হারাধন", "বাসন্তী", "সনাতন", "সন্ধ্যা",
      "কার্তিক", "ঝর্ণা", "বিমল", "কল্পনা", "স্বপন", "মীরা",
    ],
    initials: ["S", "M", "D", "B", "G", "R", "H", "K", "P", "N", "T", "A"],
    crossing: { lon: 87.79000, lat: 23.21000, bearing: 120, widthM: 400 },
  },
  {
    id: "pb",
    langs: ["pa"],
    uiSecond: "hi",
    state: "Punjab",
    stateNative: "ਪੰਜਾਬ",
    district: "Jalandhar",
    districtNative: "ਜਲੰਧਰ",
    taluk: "Phillaur",
    town: "Goraya",
    townNative: "ਗੁਰਾਇਆ",
    river: "Sutlej",
    riverNative: "ਸਤਲੁਜ",
    projectName: "Sutlej River Bridge & Approach Road, Phillaur",
    projectNameNative: "ਸਤਲੁਜ ਦਰਿਆ ਪੁਲ ਅਤੇ ਪਹੁੰਚ ਸੜਕ, ਫਿਲੌਰ",
    purpose:
      "A two-lane high-level bridge across the Sutlej at Phillaur with approach roads on both banks, taking farm traffic off the single congested crossing to Ludhiana.",
    requiringBody: "Public Works Department, Government of Punjab",
    dprNumber: "PPWD/JAL/PHL/2025/BR-06",
    rationPrefix: "PB",
    ratePerHectare: 4_800_000,
    villages: [
      { name: "Nurpur Bet", native: "ਨੂਰਪੁਰ ਬੇਟ", bank: "north", code: "JAL-PHL-024" },
      { name: "Sangatpur Dona", native: "ਸੰਗਤਪੁਰ ਡੋਨਾ", bank: "south", code: "JAL-PHL-025" },
      { name: "Mau Sahib Khurd", native: "ਮਊ ਸਾਹਿਬ ਖੁਰਦ", bank: "south", code: "JAL-PHL-026" },
    ],
    given: [
      "Gurdial Singh", "Harbans Kaur", "Jagtar Singh", "Surinder Kaur", "Balwinder Singh", "Amarjit Kaur",
      "Mohinder Singh", "Gurmeet Kaur", "Darshan Singh", "Rajwant Kaur", "Sukhdev Singh", "Manjit Kaur",
    ],
    givenNative: [
      "ਗੁਰਦਿਆਲ ਸਿੰਘ", "ਹਰਬੰਸ ਕੌਰ", "ਜਗਤਾਰ ਸਿੰਘ", "ਸੁਰਿੰਦਰ ਕੌਰ", "ਬਲਵਿੰਦਰ ਸਿੰਘ", "ਅਮਰਜੀਤ ਕੌਰ",
      "ਮੋਹਿੰਦਰ ਸਿੰਘ", "ਗੁਰਮੀਤ ਕੌਰ", "ਦਰਸ਼ਨ ਸਿੰਘ", "ਰਾਜਵੰਤ ਕੌਰ", "ਸੁਖਦੇਵ ਸਿੰਘ", "ਮਨਜੀਤ ਕੌਰ",
    ],
    initials: ["S", "G", "H", "J", "B", "A", "M", "D", "R", "K", "T", "N"],
    crossing: { lon: 75.79000, lat: 31.02000, bearing: 250, widthM: 350 },
  },
  {
    id: "od",
    langs: ["or"],
    uiSecond: "hi",
    state: "Odisha",
    stateNative: "ଓଡ଼ିଶା",
    district: "Cuttack",
    districtNative: "କଟକ",
    taluk: "Cuttack Sadar",
    town: "Naraj",
    townNative: "ନରାଜ",
    river: "Mahanadi",
    riverNative: "ମହାନଦୀ",
    projectName: "Mahanadi River Bridge & Approach Road, Naraj",
    projectNameNative: "ମହାନଦୀ ସେତୁ ଓ ପହଞ୍ଚ ରାସ୍ତା, ନରାଜ",
    purpose:
      "A two-lane high-level bridge across the Mahanadi at Naraj with approach roads on both banks, giving the villages upstream a crossing that survives the flood season.",
    requiringBody: "Works Department, Government of Odisha",
    dprNumber: "OWD/CTC/CSD/2025/BR-13",
    rationPrefix: "OD",
    ratePerHectare: 2_750_000,
    villages: [
      { name: "Naraj Uttara", native: "ନରାଜ ଉତ୍ତର", bank: "north", code: "CTC-CSD-042" },
      { name: "Kanpur Sasan", native: "କାନପୁର ଶାସନ", bank: "south", code: "CTC-CSD-043" },
      { name: "Gopalpur Patana", native: "ଗୋପାଳପୁର ପାଟଣା", bank: "south", code: "CTC-CSD-044" },
    ],
    given: [
      "Bhagaban", "Sanjukta", "Trilochan", "Basanti", "Jagannath", "Nirmala",
      "Dhruba", "Saraswati", "Bipin", "Kumudini", "Prafulla", "Sabita",
    ],
    givenNative: [
      "ଭଗବାନ", "ସଂଯୁକ୍ତା", "ତ୍ରିଲୋଚନ", "ବାସନ୍ତୀ", "ଜଗନ୍ନାଥ", "ନିର୍ମଳା",
      "ଧ୍ରୁବ", "ସରସ୍ୱତୀ", "ବିପିନ", "କୁମୁଦିନୀ", "ପ୍ରଫୁଲ୍ଲ", "ସବିତା",
    ],
    initials: ["B", "S", "M", "P", "J", "N", "D", "R", "K", "T", "G", "A"],
    crossing: { lon: 85.76000, lat: 20.49000, bearing: 100, widthM: 500 },
  },
  {
    id: "as",
    langs: ["as"],
    uiSecond: "hi",
    state: "Assam",
    stateNative: "অসম",
    district: "Kamrup",
    districtNative: "কামৰূপ",
    taluk: "Chhaygaon",
    town: "Kurua",
    townNative: "কুৰুৱা",
    river: "Kulsi",
    riverNative: "কুলসী",
    projectName: "Kulsi River Bridge & Approach Road, Kurua",
    projectNameNative: "কুলসী নদী দলং আৰু সংযোগী পথ, কুৰুৱা",
    purpose:
      "A two-lane high-level bridge across the Kulsi at Kurua with approach roads on both banks, replacing the country boats the villages depend on through the monsoon.",
    requiringBody: "Public Works Department, Government of Assam",
    dprNumber: "APWD/KAM/CHG/2025/BR-04",
    rationPrefix: "AS",
    ratePerHectare: 2_450_000,
    villages: [
      { name: "Kurua Uttar", native: "কুৰুৱা উত্তৰ", bank: "north", code: "KAM-CHG-009" },
      { name: "Bardwar Pathar", native: "বৰদুৱাৰ পথাৰ", bank: "south", code: "KAM-CHG-010" },
      { name: "Chamaria Gaon", native: "চামৰিয়া গাঁও", bank: "south", code: "KAM-CHG-011" },
    ],
    given: [
      "Dhaniram", "Nirmali", "Jogesh", "Anima", "Hemkanta", "Junu",
      "Bhaben", "Purnima", "Rajen", "Dipali", "Nabin", "Rupali",
    ],
    givenNative: [
      "ধনীৰাম", "নিৰ্মলী", "যোগেশ", "অনিমা", "হেমকান্ত", "জুনু",
      "ভবেন", "পূৰ্ণিমা", "ৰাজেন", "দীপালী", "নবীন", "ৰূপালী",
    ],
    initials: ["D", "B", "K", "H", "N", "R", "S", "P", "J", "T", "G", "M"],
    crossing: { lon: 91.43000, lat: 26.04000, bearing: 30, widthM: 150 },
  },
  {
    id: "jk",
    langs: ["ur"],
    uiSecond: "hi",
    state: "Jammu & Kashmir",
    stateNative: "جموں و کشمیر",
    district: "Anantnag",
    districtNative: "اننت ناگ",
    taluk: "Bijbehara",
    town: "Sangam",
    townNative: "سنگم",
    river: "Jhelum",
    riverNative: "جہلم",
    projectName: "Jhelum River Bridge & Approach Road, Sangam",
    projectNameNative: "دریائے جہلم پل اور رسائی سڑک، سنگم",
    purpose:
      "A two-lane high-level bridge across the Jhelum at Sangam with approach roads on both banks, taking orchard traffic off the single crossing on the national highway.",
    requiringBody: "Public Works (R&B) Department, Government of Jammu & Kashmir",
    dprNumber: "JKRB/ANT/BJB/2025/BR-03",
    rationPrefix: "JK",
    ratePerHectare: 5_200_000,
    villages: [
      { name: "Sangam Bala", native: "سنگم بالا", bank: "north", code: "ANT-BJB-007" },
      { name: "Marhama Payeen", native: "مرہامہ پائین", bank: "south", code: "ANT-BJB-008" },
      { name: "Wanpora Kalan", native: "وانپورہ کلاں", bank: "south", code: "ANT-BJB-009" },
    ],
    given: [
      "Ghulam Mohammad", "Hafiza", "Abdul Rashid", "Zooni", "Mohammad Yousuf", "Saja",
      "Bashir Ahmad", "Raja Begum", "Ali Mohammad", "Fatima", "Nazir Ahmad", "Haleema",
    ],
    givenNative: [
      "غلام محمد", "حافظہ", "عبدالرشید", "زونی", "محمد یوسف", "ساجہ",
      "بشیر احمد", "راجہ بیگم", "علی محمد", "فاطمہ", "نذیر احمد", "حلیمہ",
    ],
    initials: ["M", "A", "G", "B", "S", "N", "R", "F", "H", "Z", "K", "W"],
    crossing: { lon: 75.10000, lat: 33.73000, bearing: 320, widthM: 120 },
  },
  {
    id: "sk",
    langs: ["ne"],
    uiSecond: "hi",
    state: "Sikkim",
    stateNative: "सिक्किम",
    district: "Pakyong",
    districtNative: "पाक्योङ",
    taluk: "Rangpo",
    town: "Majitar",
    townNative: "माजिटार",
    river: "Teesta",
    riverNative: "तीस्ता",
    projectName: "Teesta River Bridge & Approach Road, Majitar",
    projectNameNative: "तीस्ता नदी पुल र पहुँच सडक, माजिटार",
    purpose:
      "A two-lane high-level bridge across the Teesta at Majitar with approach roads on both banks, giving the valley a crossing that stays open when landslides close the highway.",
    requiringBody: "Roads & Bridges Department, Government of Sikkim",
    dprNumber: "SKRB/PKG/RGP/2025/BR-02",
    rationPrefix: "SK",
    ratePerHectare: 4_400_000,
    villages: [
      { name: "Majitar Uttar", native: "माजिटार उत्तर", bank: "north", code: "PKG-RGP-004" },
      { name: "Chujachen Busty", native: "चुजाचेन बस्ती", bank: "south", code: "PKG-RGP-005" },
      { name: "Aho Shanti Nagar", native: "आहो शान्ति नगर", bank: "south", code: "PKG-RGP-006" },
    ],
    given: [
      "Man Bahadur", "Kamala", "Dil Kumar", "Sarita", "Tek Bahadur", "Maya",
      "Hari Prasad", "Bimala", "Nar Bahadur", "Radhika", "Padam", "Sabitri",
    ],
    givenNative: [
      "मान बहादुर", "कमला", "दिल कुमार", "सरिता", "टेक बहादुर", "माया",
      "हरि प्रसाद", "विमला", "नर बहादुर", "राधिका", "पदम", "सावित्री",
    ],
    initials: ["R", "S", "T", "G", "L", "P", "B", "D", "K", "M", "N", "C"],
    crossing: { lon: 88.53000, lat: 27.18000, bearing: 180, widthM: 120 },
  },
  {
    id: "ks",
    langs: ["ks"],
    uiSecond: "hi",
    state: "Jammu & Kashmir",
    stateNative: "جموں تہٕ کٔشیٖر",
    district: "Baramulla",
    districtNative: "بارہ مُلہٕ",
    taluk: "Sopore",
    town: "Dangiwacha",
    townNative: "ڈانگیٖ وؠچھ",
    river: "Jhelum",
    riverNative: "ویتھ",
    projectName: "Jhelum River Bridge & Approach Road, Dangiwacha",
    projectNameNative: "ویتھ کَنٛۍ پُل تہٕ رسٲیی سٹرک، ڈانگیٖ وؠچھ",
    purpose:
      "A two-lane high-level bridge across the Jhelum at Dangiwacha with approach roads on both banks, replacing the ferry the orchard villages still depend on.",
    requiringBody: "Public Works (R&B) Department, Government of Jammu & Kashmir",
    dprNumber: "JKRB/BRM/SPR/2025/BR-10",
    rationPrefix: "JK",
    ratePerHectare: 4_900_000,
    villages: [
      { name: "Dangiwacha Bala", native: "ڈانگیٖ وؠچھ بالا", bank: "north", code: "BRM-SPR-012" },
      { name: "Rafiabad Payeen", native: "رفیع آباد پائین", bank: "south", code: "BRM-SPR-013" },
      { name: "Chandoosa Kalan", native: "چندوسہ کلاں", bank: "south", code: "BRM-SPR-014" },
    ],
    given: [
      "Ghulam Nabi", "Aisha", "Abdul Ahad", "Posha", "Mohammad Sultan", "Zaina",
      "Farooq Ahmad", "Mymoona", "Ali Mohammad", "Khatija", "Bashir Ahmad", "Rehti",
    ],
    givenNative: [
      "غلام نبی", "عٲیشہ", "عبدالاحد", "پوشہٕ", "محمد سلطان", "زٲینہ",
      "فاروق احمد", "میمونہ", "علی محمد", "خدیجہ", "بشیر احمد", "رِہتی",
    ],
    initials: ["M", "G", "A", "B", "S", "F", "N", "Z", "K", "H", "R", "W"],
    crossing: { lon: 74.47000, lat: 34.28000, bearing: 300, widthM: 140 },
  },
  {
    id: "kutch",
    langs: ["sd"],
    uiSecond: "hi",
    state: "Gujarat",
    stateNative: "گجرات",
    district: "Kachchh",
    districtNative: "ڪڇ",
    taluk: "Bhuj",
    town: "Madhapar",
    townNative: "مڌاپر",
    river: "Rukmavati",
    riverNative: "رڪماوتي",
    projectName: "Rukmavati River Bridge & Approach Road, Madhapar",
    projectNameNative: "رڪماوتي ندي جو پل ۽ رسائي رستو، مڌاپر",
    purpose:
      "A two-lane high-level bridge across the Rukmavati at Madhapar with approach roads on both banks, replacing the causeway that is cut off by every flash flood.",
    requiringBody: "Roads & Buildings Department, Government of Gujarat",
    dprNumber: "GRB/KCH/BHJ/2025/BR-17",
    rationPrefix: "GJ",
    ratePerHectare: 2_900_000,
    villages: [
      { name: "Madhapar Uttar", native: "مڌاپر اتر", bank: "north", code: "KCH-BHJ-019" },
      { name: "Mirzapar Wadi", native: "مرزاپر واڙي", bank: "south", code: "KCH-BHJ-020" },
      { name: "Kukma Nani", native: "ڪُڪما ناني", bank: "south", code: "KCH-BHJ-021" },
    ],
    given: [
      "Hassan", "Khairunnisa", "Lakhman", "Sushila", "Ibrahim", "Zainab",
      "Devji", "Parvati", "Suleman", "Amina", "Naran", "Jethi",
    ],
    givenNative: [
      "حسن", "خيرالنساء", "لکمڻ", "سشيلا", "ابراهيم", "زينب",
      "ديوجي", "پاروتي", "سليمان", "آمنه", "نارڻ", "جيٺي",
    ],
    initials: ["H", "L", "D", "S", "I", "K", "N", "P", "A", "Z", "M", "J"],
    crossing: { lon: 69.67000, lat: 23.22000, bearing: 200, widthM: 80 },
  },
  {
    id: "ga",
    langs: ["kok"],
    uiSecond: "hi",
    state: "Goa",
    stateNative: "गोंय",
    district: "North Goa",
    districtNative: "उत्तर गोंय",
    taluk: "Tiswadi",
    town: "Old Goa",
    townNative: "पोरनें गोंय",
    river: "Mandovi",
    riverNative: "म्हादय",
    projectName: "Mandovi River Bridge & Approach Road, Old Goa",
    projectNameNative: "म्हादय न्हंय पूल आनी पावपी रस्तो, पोरनें गोंय",
    purpose:
      "A two-lane high-level bridge across the Mandovi at Old Goa with approach roads on both banks, taking the ferry traffic between the two banks off the water.",
    requiringBody: "Public Works Department, Government of Goa",
    dprNumber: "GPWD/NGA/TSW/2025/BR-01",
    rationPrefix: "GA",
    ratePerHectare: 6_300_000,
    villages: [
      { name: "Ella Uttar", native: "एला उत्तर", bank: "north", code: "NGA-TSW-003" },
      { name: "Corlim Dakshin", native: "कुर्ली दक्षिण", bank: "south", code: "NGA-TSW-004" },
      { name: "Goltim Navelim", native: "गोलतीं नावेली", bank: "south", code: "NGA-TSW-005" },
    ],
    given: [
      "Santan", "Filomena", "Damodar", "Shubhada", "Caetano", "Maria",
      "Vasant", "Sushila", "Francisco", "Anita", "Ramakant", "Deepa",
    ],
    givenNative: [
      "सांतान", "फिलोमेना", "दामोदर", "शुभदा", "काईतान", "मारिया",
      "वसंत", "सुशीला", "फ्रांसिस", "अनिता", "रमाकांत", "दीपा",
    ],
    initials: ["S", "D", "F", "C", "V", "M", "R", "A", "P", "N", "G", "L"],
    crossing: { lon: 73.91000, lat: 15.50000, bearing: 270, widthM: 480 },
  },
  {
    id: "mai",
    langs: ["mai"],
    uiSecond: "hi",
    state: "Bihar",
    stateNative: "बिहार",
    district: "Madhubani",
    districtNative: "मधुबनी",
    taluk: "Jhanjharpur",
    town: "Kamlapur",
    townNative: "कमलापुर",
    river: "Kamla Balan",
    riverNative: "कमला बलान",
    projectName: "Kamla Balan Bridge & Approach Road, Jhanjharpur",
    projectNameNative: "कमला बलान पुल आ पहुँच सड़क, झंझारपुर",
    purpose:
      "A two-lane high-level bridge across the Kamla Balan at Jhanjharpur with approach roads on both banks, replacing the boat crossing the villages use once the embankment road floods.",
    requiringBody: "Road Construction Department, Government of Bihar",
    dprNumber: "BRCD/MDB/JJP/2025/BR-15",
    rationPrefix: "BR",
    ratePerHectare: 2_600_000,
    villages: [
      { name: "Kamlapur Uttar", native: "कमलापुर उत्तर", bank: "north", code: "MDB-JJP-033" },
      { name: "Bathnaha Dakshin", native: "बथनाहा दक्षिण", bank: "south", code: "MDB-JJP-034" },
      { name: "Parmanandpur Tola", native: "परमानंदपुर टोला", bank: "south", code: "MDB-JJP-035" },
    ],
    given: [
      "Jhamman", "Sukhia", "Ramashish", "Phulo", "Baleshwar", "Sitiya",
      "Chandrika", "Jamuni", "Shiv Narayan", "Rukmini", "Bhola", "Sunaina",
    ],
    givenNative: [
      "झम्मन", "सुखिया", "रामाशीष", "फूलो", "बलेश्वर", "सितिया",
      "चन्द्रिका", "जमुनी", "शिव नारायण", "रुक्मिणी", "भोला", "सुनैना",
    ],
    initials: ["R", "S", "J", "B", "M", "C", "K", "P", "D", "N", "L", "G"],
    crossing: { lon: 86.28000, lat: 26.26000, bearing: 170, widthM: 200 },
  },
  {
    id: "doi",
    langs: ["doi"],
    uiSecond: "hi",
    state: "Jammu & Kashmir",
    stateNative: "जम्मू-कश्मीर",
    district: "Jammu",
    districtNative: "जम्मू",
    taluk: "Nagrota",
    town: "Jagti",
    townNative: "जगती",
    river: "Tawi",
    riverNative: "तवी",
    projectName: "Tawi River Bridge & Approach Road, Jagti",
    projectNameNative: "तवी दरिया पुल ते पहुँच सड़क, जगती",
    purpose:
      "A two-lane high-level bridge across the Tawi at Jagti with approach roads on both banks, giving the upper villages a crossing that survives the summer floods.",
    requiringBody: "Public Works (R&B) Department, Government of Jammu & Kashmir",
    dprNumber: "JKRB/JMU/NGR/2025/BR-18",
    rationPrefix: "JK",
    ratePerHectare: 4_300_000,
    villages: [
      { name: "Jagti Bala", native: "जगती बाला", bank: "north", code: "JMU-NGR-016" },
      { name: "Panjgrain Khurd", native: "पंजग्रैं खुर्द", bank: "south", code: "JMU-NGR-017" },
      { name: "Raipur Domana", native: "रायपुर डोमाना", bank: "south", code: "JMU-NGR-018" },
    ],
    given: [
      "Des Raj", "Kaushalya", "Bansi Lal", "Shakuntla", "Om Parkash", "Veena",
      "Ram Lal", "Kamlesh", "Kuldeep", "Santosh", "Yash Paul", "Sarla",
    ],
    givenNative: [
      "देस राज", "कौशल्या", "बंसी लाल", "शकुंतला", "ओम प्रकाश", "वीणा",
      "राम लाल", "कमलेश", "कुलदीप", "संतोष", "यश पाल", "सरला",
    ],
    initials: ["S", "K", "R", "B", "O", "D", "V", "P", "M", "A", "G", "T"],
    crossing: { lon: 74.93000, lat: 32.79000, bearing: 230, widthM: 150 },
  },
  {
    id: "mn",
    langs: ["mni"],
    uiSecond: "hi",
    state: "Manipur",
    stateNative: "মণিপুর",
    district: "Thoubal",
    districtNative: "থৌবাল",
    taluk: "Lilong",
    town: "Wangjing",
    townNative: "ৱাংজিং",
    river: "Imphal",
    riverNative: "ইম্ফাল তুরেল",
    projectName: "Imphal River Bridge & Approach Road, Wangjing",
    projectNameNative: "ইম্ফাল তুরেল লম্বী থোং অমসুং লম্বী, ৱাংজিং",
    purpose:
      "A two-lane high-level bridge across the Imphal river at Wangjing with approach roads on both banks, replacing the timber bridge that is closed to loaded vehicles.",
    requiringBody: "Public Works Department, Government of Manipur",
    dprNumber: "MPWD/THB/LLG/2025/BR-19",
    rationPrefix: "MN",
    ratePerHectare: 3_050_000,
    villages: [
      { name: "Wangjing Awang", native: "ৱাংজিং অৱাং", bank: "north", code: "THB-LLG-022" },
      { name: "Heirok Makha", native: "হৈরোক মখা", bank: "south", code: "THB-LLG-023" },
      { name: "Tentha Khunou", native: "তেন্থা খুনৌ", bank: "south", code: "THB-LLG-024" },
    ],
    given: [
      "Ibomcha", "Ongbi Thoibi", "Tomba", "Memma", "Ibohal", "Sanatombi",
      "Kulachandra", "Ibemhal", "Nandalal", "Chaobi", "Robindro", "Thabalngoubi",
    ],
    givenNative: [
      "ইবোমচা", "ওংবী থোইবী", "তোম্বা", "মেম্মা", "ইবোহাল", "সনাতোম্বী",
      "কুলচন্দ্র", "ইবেমহাল", "নন্দলাল", "চাওবী", "রবীন্দ্র", "থাবালঙৌবী",
    ],
    initials: ["L", "N", "S", "K", "Th", "M", "R", "Y", "H", "W", "P", "C"],
    crossing: { lon: 94.00000, lat: 24.65000, bearing: 180, widthM: 90 },
  },
  {
    id: "brx",
    langs: ["brx"],
    uiSecond: "hi",
    state: "Assam",
    stateNative: "आसाम",
    district: "Kokrajhar",
    districtNative: "कोकराझार",
    taluk: "Gossaigaon",
    town: "Serfanguri",
    townNative: "सेरफांगुरी",
    river: "Aie",
    riverNative: "आइ",
    projectName: "Aie River Bridge & Approach Road, Serfanguri",
    projectNameNative: "आइ दैमा थाङो आरो थांनाय लामा, सेरफांगुरी",
    purpose:
      "A two-lane high-level bridge across the Aie at Serfanguri with approach roads on both banks, replacing the bamboo crossing that is washed away each year.",
    requiringBody: "Public Works Department, Bodoland Territorial Region",
    dprNumber: "BTRPWD/KKJ/GSG/2025/BR-20",
    rationPrefix: "AS",
    ratePerHectare: 2_200_000,
    villages: [
      { name: "Serfanguri Uttar", native: "सेरफांगुरी उथोर", bank: "north", code: "KKJ-GSG-026" },
      { name: "Bhaoraguri", native: "भाओरागुरी", bank: "south", code: "KKJ-GSG-027" },
      { name: "Saraibil Khagrabari", native: "सरायबिल खाग्राबारी", bank: "south", code: "KKJ-GSG-028" },
    ],
    given: [
      "Jwngsar", "Sansuma", "Bwisagu", "Laogi", "Khwrwmdao", "Dwimalu",
      "Rwngwra", "Fwilaoyi", "Gwmbwrgwra", "Anjali", "Birkhang", "Sikhwna",
    ],
    givenNative: [
      "ज्वंसार", "सानसुमा", "बैसागु", "लाओगी", "खोरोमदाओ", "दैमालु",
      "रोंग्ओरा", "फैलावयी", "गोमबोरग्ओरा", "अनजाली", "बिरखां", "सिखोना",
    ],
    initials: ["B", "N", "D", "S", "K", "M", "G", "R", "J", "L", "T", "A"],
    crossing: { lon: 90.17000, lat: 26.44000, bearing: 180, widthM: 160 },
  },
  {
    id: "jh",
    langs: ["sat"],
    uiSecond: "hi",
    state: "Jharkhand",
    stateNative: "ᱡᱷᱟᱨᱠᱷᱚᱸᱰ",
    district: "East Singhbhum",
    districtNative: "ᱯᱩᱨᱩᱵ ᱥᱤᱝᱷᱵᱷᱩᱢ",
    taluk: "Ghatshila",
    town: "Galudih",
    townNative: "ᱜᱟᱞᱩᱰᱤᱦ",
    river: "Subarnarekha",
    riverNative: "ᱥᱩᱵᱚᱨᱱᱚᱨᱮᱠᱷᱟ",
    projectName: "Subarnarekha River Bridge & Approach Road, Galudih",
    projectNameNative: "ᱥᱩᱵᱚᱨᱱᱚᱨᱮᱠᱷᱟ ᱜᱟᱰᱟ ᱥᱟᱸᱠᱚ ᱟᱨ ᱦᱚᱨ, ᱜᱟᱞᱩᱰᱤᱦ",
    purpose:
      "A two-lane high-level bridge across the Subarnarekha at Galudih with approach roads on both banks, replacing the barrage road that is closed whenever the gates are opened.",
    requiringBody: "Road Construction Department, Government of Jharkhand",
    dprNumber: "JRCD/ESB/GTS/2025/BR-21",
    rationPrefix: "JH",
    ratePerHectare: 2_350_000,
    villages: [
      { name: "Galudih Uttar", native: "ᱜᱟᱞᱩᱰᱤᱦ ᱩᱛᱟᱨ", bank: "north", code: "ESB-GTS-029" },
      { name: "Dhalbhumgarh Tola", native: "ᱫᱷᱟᱞᱵᱷᱩᱢᱜᱟᱲ ᱴᱩᱞᱟ", bank: "south", code: "ESB-GTS-030" },
      { name: "Kalikapur Basti", native: "ᱠᱟᱞᱤᱠᱟᱯᱩᱨ ᱵᱟᱥᱛᱤ", bank: "south", code: "ESB-GTS-031" },
    ],
    given: [
      "Budhan", "Sukhmani", "Mangal", "Phuli", "Somra", "Jhano",
      "Birsa", "Sita", "Chunu", "Maino", "Dukhu", "Lakhi",
    ],
    givenNative: [
      "ᱵᱩᱫᱷᱟᱱ", "ᱥᱩᱠᱷᱢᱟᱱᱤ", "ᱢᱟᱝᱜᱟᱞ", "ᱯᱷᱩᱞᱤ", "ᱥᱳᱢᱨᱟ", "ᱡᱷᱟᱱᱩ",
      "ᱵᱤᱨᱥᱟ", "ᱥᱤᱛᱟ", "ᱪᱩᱱᱩ", "ᱢᱟᱭᱱᱚ", "ᱫᱩᱠᱷᱩ", "ᱞᱟᱠᱷᱤ",
    ],
    initials: ["H", "M", "S", "T", "B", "K", "C", "G", "L", "R", "D", "N"],
    crossing: { lon: 86.46000, lat: 22.53000, bearing: 130, widthM: 250 },
  },
  {
    id: "mp",
    langs: ["sa"],
    uiSecond: "hi",
    state: "Madhya Pradesh",
    stateNative: "मध्यप्रदेशः",
    district: "Ujjain",
    districtNative: "उज्जयिनी",
    taluk: "Ujjain",
    town: "Kaliyadeh",
    townNative: "कालियादेहः",
    river: "Shipra",
    riverNative: "क्षिप्रा",
    projectName: "Shipra River Bridge & Approach Road, Kaliyadeh",
    projectNameNative: "क्षिप्रानद्याः सेतुः मार्गश्च, कालियादेहः",
    purpose:
      "A two-lane high-level bridge across the Shipra at Kaliyadeh with approach roads on both banks, carrying the pilgrim traffic that the old causeway cannot take.",
    requiringBody: "Public Works Department, Government of Madhya Pradesh",
    dprNumber: "MPPWD/UJN/UJN/2025/BR-22",
    rationPrefix: "MP",
    ratePerHectare: 3_250_000,
    villages: [
      { name: "Kaliyadeh Uttar", native: "कालियादेह-उत्तरम्", bank: "north", code: "UJN-UJN-039" },
      { name: "Sandipani Grama", native: "सान्दीपनि-ग्रामः", bank: "south", code: "UJN-UJN-040" },
      { name: "Nagziri Dakshin", native: "नागझिरी-दक्षिणम्", bank: "south", code: "UJN-UJN-041" },
    ],
    given: [
      "Shivnarayan", "Godavari", "Ramcharan", "Tulsabai", "Jagdish", "Parvati",
      "Mangilal", "Radha", "Kailash", "Shanti", "Prabhulal", "Saraswati",
    ],
    givenNative: [
      "शिवनारायणः", "गोदावरी", "रामचरणः", "तुलसाबाई", "जगदीशः", "पार्वती",
      "माङ्गीलालः", "राधा", "कैलाशः", "शान्तिः", "प्रभुलालः", "सरस्वती",
    ],
    initials: ["S", "R", "M", "K", "P", "G", "J", "T", "D", "B", "N", "V"],
    crossing: { lon: 75.78000, lat: 23.22000, bearing: 190, widthM: 90 },
  },
];

export const DEFAULT_REGION = REGIONS[0];

/** The region a tour language lands in. Unmapped languages fall back to Hindi's. */
export function regionForLang(lang: string): DemoRegion {
  return (
    REGIONS.find((r) => r.langs.includes(lang)) ??
    REGIONS.find((r) => r.langs.includes("hi")) ??
    DEFAULT_REGION
  );
}

export function regionById(id: string | null | undefined): DemoRegion {
  return REGIONS.find((r) => r.id === id) ?? DEFAULT_REGION;
}

/** Cookie holding the region of the visitor's sandbox, so the demo-kit files match it. */
export const DEMO_REGION_COOKIE = "nilams_demo_region";

/**
 * The court a stay order on this project would come from.
 *
 * The walkthrough records a stay to show payments being blocked by it, and a
 * writ petition against a Karnataka acquisition is not heard in Madras.
 */
const HIGH_COURTS: Record<string, string> = {
  tn: "High Court of Madras",
  up: "High Court of Judicature at Allahabad, Lucknow Bench",
  ap: "High Court of Andhra Pradesh at Amaravati",
  ka: "High Court of Karnataka at Bengaluru",
  kl: "High Court of Kerala at Ernakulam",
  mh: "High Court of Bombay, Aurangabad Bench",
  gj: "High Court of Gujarat at Ahmedabad",
  wb: "High Court at Calcutta",
  pb: "High Court of Punjab & Haryana at Chandigarh",
  od: "High Court of Orissa at Cuttack",
  as: "Gauhati High Court",
  jk: "High Court of Jammu & Kashmir and Ladakh at Srinagar",
  sk: "High Court of Sikkim at Gangtok",
  ks: "High Court of Jammu & Kashmir and Ladakh at Srinagar",
  kutch: "High Court of Gujarat at Ahmedabad",
  ga: "High Court of Bombay at Goa",
  mai: "High Court of Judicature at Patna",
  doi: "High Court of Jammu & Kashmir and Ladakh at Jammu",
  mn: "High Court of Manipur at Imphal",
  brx: "Gauhati High Court",
  jh: "High Court of Jharkhand at Ranchi",
  mp: "High Court of Madhya Pradesh, Indore Bench",
};

export function highCourtFor(region: DemoRegion): string {
  return HIGH_COURTS[region.id] ?? "High Court";
}
