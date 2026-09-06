/**
 * Builds the flagship demo kit: the actual documents an officer would be
 * handed for the Bhavani River Bridge acquisition.
 *
 * Every file is generated from `src/db/flagship-project.ts`, so the FMB sheet,
 * the chitta extract, the valuation and the award all describe the same
 * sixty plots and the same seventy-seven households. Nothing is transcribed
 * by hand, so nothing can disagree.
 *
 * Crucially these are written to be *read back*: the CSV, XLSX, DOCX and PDF
 * record files are parsed by `src/lib/extraction` on upload. Generating them
 * from the schemas the validator enforces is what stops the demo assets and
 * the parser from drifting apart.
 *
 *   npx tsx scripts/build-flagship-kit.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  FLAGSHIP,
  VILLAGES,
  ALIGNMENT,
  BHAVANI_CENTRELINE,
  BRIDGE_SPAN,
  RIVER_WIDTH_M,
  SIRUMUGAI,
  buildParcels,
  buildHolders,
  buildSurveyedFamilies,
  flagshipTotals,
  type FlagshipParcel,
  type FlagshipHolder,
} from "../src/db/flagship-project";
import { schemaFor } from "../src/lib/extraction/schemas";
import { buildTemplateGuide } from "../src/lib/extraction/templates";

const OUT = resolve(process.cwd(), "demo-kit", "flagship");
const RECORDS = join(OUT, "records");
const DOCUMENTS = join(OUT, "documents");
const DRAWINGS = join(OUT, "drawings");
const REJECTS = join(OUT, "rejected-samples");

for (const dir of [OUT, RECORDS, DOCUMENTS, DRAWINGS, REJECTS]) {
  mkdirSync(dir, { recursive: true });
}

const parcels = buildParcels();
const holders = buildHolders(parcels);
const surveyed = buildSurveyedFamilies(parcels);
const totals = flagshipTotals(parcels, holders, surveyed);

const written: string[] = [];
function write(path: string, contents: string | Uint8Array) {
  writeFileSync(path, contents);
  written.push(path.replace(resolve(process.cwd()) + "\\", "").replace(/\\/g, "/"));
}

/* ── CSV helpers ──────────────────────────────────────────────────────── */

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function csv(headers: string[], rows: (string | number)[][]): string {
  return [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n") + "\n";
}
function boundaryCell(parcel: FlagshipParcel): string {
  return parcel.boundary.map(([lon, lat]) => `${lon.toFixed(6)} ${lat.toFixed(6)}`).join("; ");
}

/* ── 1. FMB sketches, per village ─────────────────────────────────────── */

// One file per village, because that is how the Survey & Settlement office
// holds them — a taluk never issues a single sheet spanning three villages.
for (const village of VILLAGES) {
  const rows = parcels
    .filter((p) => p.village === village.name)
    .map((p) => [
      p.surveyNumber,
      p.village,
      p.extent.toFixed(4),
      boundaryCell(p),
      p.landClassification,
      p.adjoining.join("; "),
    ]);
  if (rows.length === 0) continue;
  const slug = village.name.toLowerCase().replace(/\s+/g, "-");
  write(
    join(RECORDS, `fmb-sketch-${slug}.csv`),
    csv(
      ["Survey Number", "Village", "Extent", "Boundary Coordinates", "Land Classification", "Adjoining Survey Numbers"],
      rows
    )
  );
}

/* ── 2. Patta / chitta extract, as an XLSX ────────────────────────────── */

// The taluk office exports a spreadsheet, so the chitta ships as one — and
// the platform has to read it without being asked for a CSV first.
async function writeChittaXlsx() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Taluk Office, Mettupalayam (demo data)";
  const sheet = workbook.addWorksheet("Chitta Extract");

  sheet.addRow([
    "Patta No", "Survey No", "Pattadar Name", "Revenue Village", "Extent (Ha)",
    "Land Type", "Social Category", "Members", "Aadhaar", "Ration Card Number", "Mobile Number",
  ]);
  sheet.getRow(1).font = { bold: true };

  for (const holder of holders) {
    const parcel = parcels.find((p) => p.surveyNumber === holder.surveyNumber)!;
    sheet.addRow([
      holder.pattaNumber,
      holder.surveyNumber,
      holder.name,
      holder.village,
      // Deliberately mixed units across the file. A real extract is quoted
      // in whatever the clerk used, and the reader has to cope: every third
      // row is in acres, and one in seven in the hectare-are-square-metre
      // form a chitta prints.
      chittaExtent(holder, parcels.indexOf(parcel)),
      parcel.landClassification,
      holder.category,
      holder.memberCount,
      holder.aadhaarMasked,
      holder.rationCard,
      holder.phone,
    ]);
  }

  sheet.columns.forEach((c) => {
    c.width = 18;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  write(join(RECORDS, "patta-chitta-extract-mettupalayam.xlsx"), new Uint8Array(buffer));
}

function chittaExtent(holder: FlagshipHolder, index: number): string {
  if (index % 7 === 3) {
    // Hectare-are-square metre.
    const ha = Math.floor(holder.extent);
    const ares = Math.floor((holder.extent - ha) * 100);
    const sqm = Math.round(((holder.extent - ha) * 100 - ares) * 100);
    return `${ha}-${String(ares).padStart(2, "0")}-${String(sqm).padStart(2, "0")}`;
  }
  if (index % 3 === 0) {
    return `${(holder.extent / 0.40468564224).toFixed(2)} acres`;
  }
  return holder.extent.toFixed(4);
}

/* ── 3. DGPS re-survey, as a text-layer PDF ───────────────────────────── */

// The survey department issues its report as a PDF. This one carries a real
// text layer, which is what the reader needs — and its rejected twin in
// `rejected-samples/` is the same table as an image, to show the refusal.
async function writeDgpsPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const columns = [
    { header: "Survey Number", x: 40, width: 78 },
    { header: "Village", x: 120, width: 96 },
    { header: "Extent", x: 218, width: 52 },
    { header: "Boundary Coordinates", x: 272, width: 300 },
  ];

  // Only the first-rank plots were re-surveyed by DGPS for the acquisition;
  // the rest stand on their historical FMB sheets. That is how a s.12 survey
  // is actually scoped, and it keeps this file a different shape from the
  // FMB CSV so the demo shows two genuinely different documents.
  const resurveyed = parcels.filter((p) => !/\d$/.test(p.surveyNumber));

  let page = pdf.addPage([842, 595]); // A4 landscape: a survey table is wide.
  let y = 545;

  const drawHeader = () => {
    page.drawText("DGPS / Total-Station Survey Report", { x: 40, y, size: 13, font: bold });
    y -= 16;
    page.drawText(
      `${FLAGSHIP.name} · RFCTLARR s.12 · Survey & Settlement Department, ${FLAGSHIP.taluk} taluk`,
      { x: 40, y, size: 8, font, color: rgb(0.35, 0.35, 0.35) }
    );
    y -= 22;
    for (const col of columns) {
      page.drawText(col.header, { x: col.x, y, size: 8.5, font: bold });
    }
    y -= 4;
    page.drawLine({ start: { x: 40, y }, end: { x: 800, y }, thickness: 0.6, color: rgb(0.6, 0.6, 0.6) });
    y -= 12;
  };
  drawHeader();

  for (const parcel of resurveyed) {
    if (y < 50) {
      page = pdf.addPage([842, 595]);
      y = 545;
      drawHeader();
    }
    // Only the first three corners fit on a line at this size, so the
    // coordinate cell is wrapped across two lines — which is exactly the
    // case the reader's line-grouping has to survive.
    const cells = [
      parcel.surveyNumber,
      parcel.village,
      parcel.extent.toFixed(4),
      boundaryCell(parcel),
    ];
    cells.forEach((text, i) => {
      page.drawText(text, { x: columns[i].x, y, size: 7.5, font });
    });
    y -= 13;
  }

  write(join(RECORDS, "dgps-survey-report.pdf"), await pdf.save());
}

/* ── 4. Encumbrance, guideline value, asset valuation, legal heirs ────── */

function writeSupportingRecords() {
  // Encumbrances sit on a minority of plots, as they do in practice.
  const encumbered = parcels.filter((_, i) => i % 9 === 2);
  write(
    join(RECORDS, "encumbrance-certificate.csv"),
    csv(
      ["Survey Number", "Document Number", "Nature of Deed", "Executed On", "Party Name", "Amount"],
      encumbered.map((p, i) => [
        p.surveyNumber,
        `${4200 + i * 37}/20${19 + (i % 6)}`,
        i % 3 === 0 ? "Mortgage" : i % 3 === 1 ? "Sale" : "Partition",
        `${String(3 + (i % 25)).padStart(2, "0")}-${String(1 + (i % 12)).padStart(2, "0")}-20${19 + (i % 6)}`,
        i % 3 === 0
          ? "Coimbatore District Central Co-operative Bank, Mettupalayam branch"
          : `${holders[(i * 5) % holders.length].name} (previous holder)`,
        i % 3 === 0 ? 450000 + i * 25000 : 0,
      ])
    )
  );

  // Guideline value differs by classification: wet land is worth more than
  // dry, and a house site more than either. The award has to reflect that.
  const gvByClass: Record<string, number> = {
    NANJAI: 4_150_000,
    PUNJAI: 2_680_000,
    MANAVARI: 2_100_000,
    HOUSE_SITE: 7_400_000,
  };
  write(
    join(RECORDS, "guideline-value-certificate.csv"),
    csv(
      ["Survey Number", "Village", "Guideline Value Per Hectare", "Effective From"],
      parcels.map((p) => [p.surveyNumber, p.village, gvByClass[p.landClassification], "01-04-2025"])
    )
  );

  // Assets attached to the land, valued under s.29 — the wells, trees and
  // structures that make an award more than a rate times an area.
  const assetRows: (string | number)[][] = [];
  parcels.forEach((p, i) => {
    if (p.landClassification === "NANJAI" && i % 2 === 0) {
      assetRows.push([p.surveyNumber, "Open well with 5 HP pump set", 1, 185000, "Assistant Executive Engineer, PWD"]);
    }
    if (p.landClassification === "HOUSE_SITE") {
      assetRows.push([p.surveyNumber, "Tiled dwelling, 62 sq m", 1, 640000, "Assistant Executive Engineer, PWD"]);
      assetRows.push([p.surveyNumber, "Compound wall, brick, 34 m", 34, 61200, "Assistant Executive Engineer, PWD"]);
    }
    if (i % 4 === 1) {
      assetRows.push([p.surveyNumber, "Coconut trees, bearing", 12 + (i % 9), (12 + (i % 9)) * 4800, "Deputy Director, Horticulture"]);
    }
    if (i % 6 === 5) {
      assetRows.push([p.surveyNumber, "Borewell with submersible pump", 1, 142000, "Assistant Executive Engineer, PWD"]);
    }
  });
  write(
    join(RECORDS, "asset-valuation-report.csv"),
    csv(["Survey Number", "Asset Type", "Quantity", "Assessed Value", "Valued By"], assetRows)
  );

  // Two titleholders died between the s.11 notification and the award, so
  // their entitlement apportions among heirs under s.77. This is the case
  // the succession flow exists for.
  const deceased = [holders[6], holders[27]];
  const heirRows: (string | number)[][] = [];
  for (const holder of deceased) {
    heirRows.push([holder.name, holder.pattaNumber, `${holder.name.split(". ")[0]}. Chellammal`, "Wife", 50, holder.phone]);
    heirRows.push([holder.name, holder.pattaNumber, `${holder.name.split(". ")[0]}. Saravanan`, "Son", 25, ""]);
    heirRows.push([holder.name, holder.pattaNumber, `${holder.name.split(". ")[0]}. Kavitha`, "Daughter", 25, ""]);
  }
  write(
    join(RECORDS, "legal-heir-certificate.csv"),
    csv(["Deceased Name", "Patta Number", "Heir Name", "Relationship", "Share Percent", "Mobile"], heirRows)
  );
}

/* ── 5. A file that fails, on purpose ─────────────────────────────────── */

/**
 * The error report is a feature, so the kit ships something to trigger it.
 * Six rows, six different failures, each the kind of mistake a clerk
 * actually makes — not nonsense designed to be obviously wrong.
 */
function writeBrokenExtract() {
  const good = holders.slice(0, 6);
  write(
    join(RECORDS, "patta-chitta-with-errors.csv"),
    csv(
      ["Patta No", "Survey No", "Pattadar Name", "Revenue Village", "Extent (Ha)", "Aadhaar", "Mobile Number"],
      [
        [good[0].pattaNumber, good[0].surveyNumber, good[0].name, good[0].village, good[0].extent.toFixed(4), good[0].aadhaarMasked, good[0].phone],
        // Extent written as prose: the reader must refuse to guess.
        [good[1].pattaNumber, good[1].surveyNumber, good[1].name, good[1].village, "about two acres", good[1].aadhaarMasked, good[1].phone],
        // Survey number with a hyphen where the subdivision slash belongs.
        [good[2].pattaNumber, "112-2A", good[2].name, good[2].village, good[2].extent.toFixed(4), good[2].aadhaarMasked, good[2].phone],
        // Aadhaar with two digits transposed — caught by the checksum, not
        // by counting digits.
        [good[3].pattaNumber, good[3].surveyNumber, good[3].name, good[3].village, good[3].extent.toFixed(4), "234567890142", good[3].phone],
        // Pattadar name left blank.
        [good[4].pattaNumber, good[4].surveyNumber, "", good[4].village, good[4].extent.toFixed(4), good[4].aadhaarMasked, good[4].phone],
        // A landline where a mobile is required.
        [good[5].pattaNumber, good[5].surveyNumber, good[5].name, good[5].village, good[5].extent.toFixed(4), good[5].aadhaarMasked, "044 2345 6789"],
        // Duplicate of row 2's plot: the same survey number twice in one file.
        [String(Number(good[1].pattaNumber) + 1), good[1].surveyNumber, "P. Duraisamy", good[1].village, "0.3100", "", "9445012345"],
      ]
    )
  );

  // Rejected outright, each for a different stated reason.
  write(
    join(REJECTS, "patta-extract.txt"),
    "Patta 1247 Survey 112/2A R. Murugan 0.84 ha\n\nThis is what the old demo shipped as a land record.\nNo revenue office issues a .txt, and the platform now says so.\n"
  );
  write(
    join(REJECTS, "README.md"),
    [
      "# Files the platform refuses, and why",
      "",
      "Rejection is the feature. The previous document reader derived every value",
      "from a hash of the document id and never opened the file, so it would",
      "cheerfully \"extract\" a titleholder from any of these. It no longer does.",
      "",
      "| File | What happens |",
      "|---|---|",
      "| `patta-extract.txt` | Refused: plain text is not a format a revenue office issues. |",
      "| `scanned-patta.png` | Refused: an image carries no machine-readable text. The message names the remedy — export the digital extract, or use the template. |",
      "| `../records/patta-chitta-with-errors.csv` | Read, but seven rows fail. Each gets a row number, the column, the value found, why it was refused, and what was expected. Download the error report to see all of them at once. |",
      "",
      "There is no OCR. That is deliberate: rule-based extraction over noisy OCR",
      "output would be strict in name only.",
      "",
    ].join("\n")
  );
}

/** A PNG of a "scanned" record — the image-rejection path, as a real file. */
function writeScanSample() {
  // A minimal valid PNG. Its content does not matter; what matters is that
  // the reader refuses it by type and says why, rather than inventing a row.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  write(join(REJECTS, "scanned-patta.png"), png);
}

/* ── 6. Narrative documents ───────────────────────────────────────────── */

async function writeNarrativePdf(
  fileName: string,
  title: string,
  subtitle: string,
  sections: { heading: string; body: string[] }[]
) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  let page = pdf.addPage([595, 842]);
  let y = 780;
  const left = 56;
  const width = 483;

  const wrap = (text: string, size: number, f = font): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(candidate, size) > width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const ensure = (needed: number) => {
    if (y - needed < 60) {
      page = pdf.addPage([595, 842]);
      y = 780;
    }
  };

  page.drawText("GOVERNMENT OF TAMIL NADU", { x: left, y, size: 9, font: bold, color: rgb(0.3, 0.3, 0.3) });
  y -= 24;
  for (const line of wrap(title, 15, bold)) {
    page.drawText(line, { x: left, y, size: 15, font: bold });
    y -= 19;
  }
  y -= 4;
  for (const line of wrap(subtitle, 9.5)) {
    page.drawText(line, { x: left, y, size: 9.5, font, color: rgb(0.35, 0.35, 0.35) });
    y -= 13;
  }
  y -= 10;
  page.drawLine({ start: { x: left, y }, end: { x: left + width, y }, thickness: 0.8, color: rgb(0.7, 0.7, 0.7) });
  y -= 22;

  for (const section of sections) {
    ensure(40);
    page.drawText(section.heading, { x: left, y, size: 11, font: bold });
    y -= 16;
    for (const paragraph of section.body) {
      const lines = wrap(paragraph, 10);
      ensure(lines.length * 13 + 8);
      for (const line of lines) {
        page.drawText(line, { x: left, y, size: 10, font });
        y -= 13;
      }
      y -= 7;
    }
    y -= 6;
  }

  ensure(40);
  page.drawText(
    "Demo document. Fictional acquisition; not a legal instrument.",
    { x: left, y: 44, size: 7.5, font, color: rgb(0.55, 0.55, 0.55) }
  );

  write(join(DOCUMENTS, fileName), await pdf.save());
}

async function writeNarratives() {
  const inr = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;
  const spanM = Math.round(
    Math.hypot(
      (BRIDGE_SPAN.south[0] - BRIDGE_SPAN.north[0]) * 111320 * Math.cos((SIRUMUGAI.lat * Math.PI) / 180),
      (BRIDGE_SPAN.south[1] - BRIDGE_SPAN.north[1]) * 110574
    )
  );

  await writeNarrativePdf(
    "01-detailed-project-report.pdf",
    "Detailed Project Report",
    `${FLAGSHIP.name} · DPR ${FLAGSHIP.dprNumber} · ${FLAGSHIP.requiringBody}`,
    [
      {
        heading: "1. Public purpose",
        body: [
          `The Bhavani is crossed at Sirumugai by a low-level causeway which is overtopped during the north-east monsoon. In an average year the crossing is impassable on 24 to 40 days, isolating the villages on the south bank from the taluk headquarters at Mettupalayam, from the Sathyamangalam road, and from the nearest hospital.`,
          `This project provides a two-lane high-level bridge of ${spanM} m across the river at the same crossing, with approach roads on both banks totalling approximately 1.6 km. The alignment is set square to the flow so that piers stand with the current rather than broadside to it.`,
          `The public purpose is infrastructure of the kind described in s.2(1)(b)(i) of the Act — a public road maintained by the State Government.`,
        ],
      },
      {
        heading: "2. Land required",
        body: [
          `${totals.parcelCount} plots across ${totals.villages.length} revenue villages (${totals.villages.join(", ")}) in ${FLAGSHIP.taluk} taluk, totalling ${totals.totalHectares} hectares.`,
          `No land is sought between the abutments: the deck spans the river and the bed is not acquired. The land taken is the approach embankment either side, together with the abutment footprints and the temporary construction corridor.`,
          `Of the ${totals.parcelCount} plots, the classification breakdown is: ${classificationSummary()}.`,
        ],
      },
      {
        heading: "3. Alternatives considered",
        body: [
          `Three alignments were examined. A crossing 900 m upstream would have shortened the span but required acquisition of 4.1 ha of house sites in Kizhakku Sirumugai and the displacement of a further 31 households; it was rejected on that ground.`,
          `A crossing 1.4 km downstream avoided all house sites but added 2.7 km of approach road across nanjai land under two paddy crops a year, increasing both the land take and the livelihood impact.`,
          `The alignment proposed here takes the least land of the three and displaces the fewest households, at the cost of a marginally longer span.`,
        ],
      },
      {
        heading: "4. Estimated cost",
        body: [
          `Civil works ${inr(486_000_000)}; land acquisition and R&R ${inr(212_400_000)}; utility diversion and contingencies ${inr(38_600_000)}. Total ${inr(737_000_000)}.`,
          `The land acquisition and R&R estimate is provisional and is superseded by the award once compensation is determined under s.23.`,
        ],
      },
    ]
  );

  await writeNarrativePdf(
    "02-social-impact-assessment.pdf",
    "Social Impact Assessment Report",
    `${FLAGSHIP.name} · RFCTLARR ss.4-6 · SIA Unit, Coimbatore`,
    [
      {
        heading: "1. Scope and method",
        body: [
          `The assessment was carried out under s.4 of the Act following the notification of intent. It covers a house-to-house census of every household in the corridor and a 300 m band either side, group consultations in each of the three affected revenue villages, and a public hearing convened under s.5.`,
          `The census was conducted between the dates recorded in the project file and enumerated ${totals.affectedFamilyCount} affected families.`,
        ],
      },
      {
        heading: "2. Affected and displaced families",
        body: [
          `${totals.affectedFamilyCount} families are affected within the meaning of s.3(c). Of these, ${totals.titleholderCount} are titleholders identified from the record of rights, and ${totals.surveyedCount} are non-titleholders who could only be identified by the census: tenant cultivators, agricultural labourers dependent on the acquired holdings, and residents of more than three years standing without title.`,
          `${totals.displacedCount} families are displaced — that is, they lose the dwelling they occupy, not merely land they cultivate. The distinction matters: displaced families are entitled under the Second Schedule to housing, a resettlement site, transportation and a subsistence allowance which land-losing families who are not displaced do not receive.`,
          `The disproportionate presence of non-titleholders on nanjai land reflects the labour intensity of double-cropped paddy, and is the reason a titleholder count alone would have understated the R&R obligation by roughly a quarter.`,
        ],
      },
      {
        heading: "3. Impact on livelihoods and common property",
        body: [
          `${totals.totalHectares} hectares pass out of cultivation, of which the nanjai component is under two paddy crops a year. Households dependent on that land as tenants or labourers lose the whole of that income rather than a share of an asset, which is why their entitlement is assessed on dependency and not on extent.`,
          `Common property affected: one village threshing floor in Alangombu, a section of field channel serving four holdings on the south bank, and eleven roadside tamarind trees held in common. Each is to be reprovided rather than compensated in cash.`,
        ],
      },
      {
        heading: "4. Public hearing and objections",
        body: [
          `The public hearing was held in each affected village. The principal objections recorded were: the adequacy of the guideline value as a measure of market value for irrigated land; the position of the southern approach relative to an existing field channel; and the timing of possession relative to the standing crop.`,
          `The first is addressed by the multiplier applied under s.26 read with the First Schedule. The second resulted in a 40 m eastward shift of the southern approach at chainage 1+180. The third is addressed by scheduling possession after the samba harvest.`,
        ],
      },
      {
        heading: "5. Conclusion",
        body: [
          `The extent of land proposed is the minimum required for the stated public purpose, no unaffected alternative exists that would take less, and the potential benefits outweigh the social costs, subject to the R&R entitlements in the Second Schedule being delivered in full and in advance of possession.`,
        ],
      },
    ]
  );
}

function classificationSummary(): string {
  const counts = parcels.reduce<Record<string, number>>((acc, p) => {
    acc[p.landClassification] = (acc[p.landClassification] ?? 0) + 1;
    return acc;
  }, {});
  const labels: Record<string, string> = {
    NANJAI: "nanjai (wet)",
    PUNJAI: "punjai (dry)",
    MANAVARI: "manavari (rain-fed)",
    HOUSE_SITE: "house sites",
  };
  return Object.entries(counts)
    .map(([k, v]) => `${v} ${labels[k] ?? k}`)
    .join(", ");
}

/* ── 7. Drawings ──────────────────────────────────────────────────────── */

function writeDrawings() {
  write(join(DRAWINGS, "alignment-plan.svg"), alignmentPlanSvg());
  write(join(DRAWINGS, "bridge-elevation.svg"), bridgeElevationSvg());
  write(join(DRAWINGS, "row-cross-section.svg"), crossSectionSvg());
}

function alignmentPlanSvg(): string {
  const all = [...parcels.flatMap((p) => p.boundary), ...ALIGNMENT, ...BHAVANI_CENTRELINE];
  const lons = all.map((p) => p[0]);
  const lats = all.map((p) => p[1]);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const W = 900, H = 1100, pad = 50;
  const sx = (lon: number) => pad + ((lon - minLon) / (maxLon - minLon)) * (W - pad * 2);
  const sy = (lat: number) => H - pad - ((lat - minLat) / (maxLat - minLat)) * (H - pad * 2);

  const fill: Record<string, string> = {
    NANJAI: "#bfdbfe",
    PUNJAI: "#fde68a",
    MANAVARI: "#fed7aa",
    HOUSE_SITE: "#fecaca",
  };

  const plots = parcels
    .map((p) => {
      const pts = p.boundary.map(([lon, lat]) => `${sx(lon).toFixed(1)},${sy(lat).toFixed(1)}`).join(" ");
      return `<polygon points="${pts}" fill="${fill[p.landClassification] ?? "#e5e7eb"}" stroke="#475569" stroke-width="0.7"/>`;
    })
    .join("\n    ");

  const labels = parcels
    .map((p) => {
      const cx = p.boundary.reduce((s, b) => s + sx(b[0]), 0) / p.boundary.length;
      const cy = p.boundary.reduce((s, b) => s + sy(b[1]), 0) / p.boundary.length;
      return `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="6.5" text-anchor="middle" fill="#1e293b">${p.surveyNumber}</text>`;
    })
    .join("\n    ");

  const river = BHAVANI_CENTRELINE.map(([lon, lat]) => `${sx(lon).toFixed(1)},${sy(lat).toFixed(1)}`).join(" ");
  const road = ALIGNMENT.map(([lon, lat]) => `${sx(lon).toFixed(1)},${sy(lat).toFixed(1)}`).join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc"/>
  <g>
    <polyline points="${river}" fill="none" stroke="#3b82f6" stroke-width="${(RIVER_WIDTH_M / ((maxLat - minLat) * 110574)) * (H - pad * 2)}" stroke-opacity="0.35" stroke-linecap="round"/>
    <polyline points="${river}" fill="none" stroke="#1d4ed8" stroke-width="1.4" stroke-dasharray="7 4"/>
    ${plots}
    ${labels}
    <polyline points="${road}" fill="none" stroke="#111827" stroke-width="7" stroke-opacity="0.18"/>
    <polyline points="${road}" fill="none" stroke="#111827" stroke-width="2"/>
    <circle cx="${sx(BRIDGE_SPAN.north[0]).toFixed(1)}" cy="${sy(BRIDGE_SPAN.north[1]).toFixed(1)}" r="4" fill="#dc2626"/>
    <circle cx="${sx(BRIDGE_SPAN.south[0]).toFixed(1)}" cy="${sy(BRIDGE_SPAN.south[1]).toFixed(1)}" r="4" fill="#dc2626"/>
  </g>
  <g font-family="system-ui, sans-serif">
    <text x="${pad}" y="30" font-size="17" font-weight="700" fill="#0f172a">Land Acquisition Plan — ${FLAGSHIP.name}</text>
    <text x="${pad}" y="46" font-size="10" fill="#475569">${FLAGSHIP.taluk} taluk, ${FLAGSHIP.district} district · ${totals.parcelCount} plots · ${totals.totalHectares} ha · abutments marked in red</text>
    <g transform="translate(${pad}, ${H - 34})" font-size="10" fill="#334155">
      <rect width="13" height="9" fill="${fill.NANJAI}" stroke="#475569" stroke-width="0.6"/><text x="18" y="8">Nanjai</text>
      <rect x="72" width="13" height="9" fill="${fill.PUNJAI}" stroke="#475569" stroke-width="0.6"/><text x="90" y="8">Punjai</text>
      <rect x="144" width="13" height="9" fill="${fill.HOUSE_SITE}" stroke="#475569" stroke-width="0.6"/><text x="162" y="8">House site</text>
      <text x="250" y="8" fill="#1d4ed8">— Bhavani river</text>
      <text x="360" y="8" fill="#111827">— Proposed alignment</text>
    </g>
  </g>
</svg>
`;
}

function bridgeElevationSvg(): string {
  const W = 1200, H = 420;
  const deckY = 190, waterY = 300, bedY = 355;
  const startX = 120, endX = 1080;
  const piers = [0.25, 0.5, 0.75].map((t) => startX + (endX - startX) * t);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc"/>
  <!-- ground and riverbed -->
  <path d="M0 ${bedY} L${startX - 20} ${bedY} Q${startX + 40} ${bedY} ${startX + 90} ${bedY + 14} L${endX - 90} ${bedY + 14} Q${endX - 40} ${bedY} ${endX + 20} ${bedY} L${W} ${bedY} L${W} ${H} L0 ${H} Z" fill="#d6d3d1"/>
  <rect x="0" y="${bedY - 34}" width="${startX + 10}" height="${34}" fill="#a8a29e"/>
  <rect x="${endX - 10}" y="${bedY - 34}" width="${W - endX + 10}" height="${34}" fill="#a8a29e"/>
  <!-- water -->
  <rect x="${startX - 6}" y="${waterY}" width="${endX - startX + 12}" height="${bedY - waterY + 14}" fill="#60a5fa" fill-opacity="0.55"/>
  <line x1="${startX - 6}" y1="${waterY}" x2="${endX + 6}" y2="${waterY}" stroke="#2563eb" stroke-width="1.2"/>
  <!-- abutments -->
  <rect x="${startX - 46}" y="${deckY + 16}" width="46" height="${bedY - deckY - 16}" fill="#9ca3af" stroke="#4b5563"/>
  <rect x="${endX}" y="${deckY + 16}" width="46" height="${bedY - deckY - 16}" fill="#9ca3af" stroke="#4b5563"/>
  <!-- piers with pier caps and footings -->
  ${piers
    .map(
      (x) => `<g>
    <rect x="${x - 34}" y="${deckY + 16}" width="68" height="16" fill="#9ca3af" stroke="#4b5563"/>
    <rect x="${x - 17}" y="${deckY + 32}" width="34" height="${bedY - deckY - 18}" fill="#a1a1aa" stroke="#52525b"/>
    <rect x="${x - 40}" y="${bedY + 12}" width="80" height="16" fill="#78716c" stroke="#44403c"/>
  </g>`
    )
    .join("\n  ")}
  <!-- girders and deck -->
  <rect x="${startX - 46}" y="${deckY}" width="${endX - startX + 92}" height="16" fill="#cbd5e1" stroke="#475569"/>
  <rect x="${startX - 46}" y="${deckY - 7}" width="${endX - startX + 92}" height="7" fill="#e2e8f0" stroke="#64748b"/>
  <!-- railing -->
  ${Array.from({ length: 41 }, (_, i) => {
    const x = startX - 40 + (i * (endX - startX + 80)) / 40;
    return `<line x1="${x.toFixed(1)}" y1="${deckY - 7}" x2="${x.toFixed(1)}" y2="${deckY - 26}" stroke="#64748b" stroke-width="1.4"/>`;
  }).join("\n  ")}
  <line x1="${startX - 40}" y1="${deckY - 26}" x2="${endX + 40}" y2="${deckY - 26}" stroke="#475569" stroke-width="2.4"/>
  <!-- dimensions -->
  <g stroke="#dc2626" stroke-width="1" fill="#dc2626" font-family="system-ui, sans-serif" font-size="11">
    <line x1="${startX - 46}" y1="${deckY - 54}" x2="${endX + 46}" y2="${deckY - 54}"/>
    <line x1="${startX - 46}" y1="${deckY - 60}" x2="${startX - 46}" y2="${deckY - 48}"/>
    <line x1="${endX + 46}" y1="${deckY - 60}" x2="${endX + 46}" y2="${deckY - 48}"/>
    <text x="${(startX + endX) / 2}" y="${deckY - 60}" text-anchor="middle">Overall length 248 m — four spans of 62 m</text>
    <line x1="${endX + 88}" y1="${deckY}" x2="${endX + 88}" y2="${waterY}"/>
    <text x="${endX + 94}" y="${(deckY + waterY) / 2}" font-size="10">8.4 m to HFL</text>
  </g>
  <g font-family="system-ui, sans-serif" fill="#0f172a">
    <text x="30" y="34" font-size="16" font-weight="700">Bridge Elevation — ${FLAGSHIP.name}</text>
    <text x="30" y="52" font-size="10" fill="#475569">Bhavani River at Sirumugai · deck 8.4 m above highest flood level · not to scale</text>
  </g>
</svg>
`;
}

function crossSectionSvg(): string {
  const W = 1000, H = 380;
  const cx = W / 2, roadY = 210;
  const carriageway = 300; // 2 lanes at 3.5 m, scaled
  const shoulder = 70;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc"/>
  <path d="M60 ${roadY + 96} L${cx - carriageway / 2 - shoulder - 90} ${roadY + 8} L${cx + carriageway / 2 + shoulder + 90} ${roadY + 8} L${W - 60} ${roadY + 96} L${W - 60} ${H - 20} L60 ${H - 20} Z" fill="#d6d3d1" stroke="#a8a29e"/>
  <rect x="${cx - carriageway / 2 - shoulder}" y="${roadY - 6}" width="${carriageway + shoulder * 2}" height="14" fill="#a8a29e"/>
  <rect x="${cx - carriageway / 2}" y="${roadY - 10}" width="${carriageway}" height="10" fill="#3f3f46"/>
  <line x1="${cx}" y1="${roadY - 5}" x2="${cx}" y2="${roadY - 5}" stroke="#fff"/>
  ${Array.from({ length: 7 }, (_, i) => {
    const x = cx - carriageway / 2 + 20 + i * 44;
    return `<rect x="${x}" y="${roadY - 6}" width="22" height="2.4" fill="#fef3c7"/>`;
  }).join("\n  ")}
  <g stroke="#dc2626" fill="#dc2626" font-family="system-ui, sans-serif" font-size="11" stroke-width="1">
    <line x1="${cx - carriageway / 2}" y1="${roadY - 46}" x2="${cx + carriageway / 2}" y2="${roadY - 46}"/>
    <text x="${cx}" y="${roadY - 52}" text-anchor="middle">Carriageway 7.0 m</text>
    <line x1="${cx - carriageway / 2 - shoulder - 90}" y1="${roadY - 90}" x2="${cx + carriageway / 2 + shoulder + 90}" y2="${roadY - 90}"/>
    <line x1="${cx - carriageway / 2 - shoulder - 90}" y1="${roadY - 96}" x2="${cx - carriageway / 2 - shoulder - 90}" y2="${roadY - 84}"/>
    <line x1="${cx + carriageway / 2 + shoulder + 90}" y1="${roadY - 96}" x2="${cx + carriageway / 2 + shoulder + 90}" y2="${roadY - 84}"/>
    <text x="${cx}" y="${roadY - 96}" text-anchor="middle">Right of way to be acquired — 24.0 m</text>
  </g>
  <g font-family="system-ui, sans-serif" fill="#475569" font-size="10">
    <text x="${cx - carriageway / 2 - shoulder - 40}" y="${roadY + 34}">Shoulder 1.5 m</text>
    <text x="${cx + carriageway / 2 + shoulder - 40}" y="${roadY + 34}">Shoulder 1.5 m</text>
    <text x="90" y="${roadY + 120}">Embankment slope 2:1</text>
  </g>
  <g font-family="system-ui, sans-serif" fill="#0f172a">
    <text x="30" y="34" font-size="16" font-weight="700">Right-of-Way Cross Section — approach road</text>
    <text x="30" y="52" font-size="10" fill="#475569">Typical section, both approaches · 24 m corridor · not to scale</text>
  </g>
</svg>
`;
}

/* ── 8. Templates and the runbook ─────────────────────────────────────── */

function writeGuides() {
  for (const category of ["PATTA_CHITTA", "FMB_SKETCH", "GPS_SURVEY_REPORT"]) {
    const schema = schemaFor(category);
    if (!schema) continue;
    write(
      join(OUT, "templates", `${category.toLowerCase().replace(/_/g, "-")}-guide.md`),
      buildTemplateGuide(schema)
    );
  }
}

function writeReadme() {
  write(
    join(OUT, "README.md"),
    [
      `# ${FLAGSHIP.name} — demo kit`,
      "",
      "Everything here is generated from `src/db/flagship-project.ts` by",
      "`npx tsx scripts/build-flagship-kit.ts`. The FMB sheets, the chitta extract,",
      "the valuations and the award all describe the same plots and the same",
      "households, because they are all built from one source. Do not hand-edit",
      "these files — change the source and regenerate.",
      "",
      "## Where it is",
      "",
      `Sirumugai is a real panchayat town in ${FLAGSHIP.taluk} taluk, ${FLAGSHIP.district}`,
      "district, on the banks of the Bhavani River. The bridge is sited on that",
      "crossing, square to the flow. The town's coordinates are as published; the",
      "river centreline and plot boundaries are approximate, laid out to be",
      "geographically coherent rather than digitised from a survey.",
      "",
      "The revenue villages, survey numbers, titleholders and every rupee figure",
      "are invented. This is not a real acquisition and describes no real person.",
      "",
      "## What is in it",
      "",
      `- **${totals.parcelCount} plots**, ${totals.totalHectares} ha across ${totals.villages.length} revenue villages`,
      `- **${totals.affectedFamilyCount} affected families** — ${totals.titleholderCount} titleholders from the record of rights, plus ${totals.surveyedCount} non-titleholders only the SIA census can find`,
      `- **${totals.displacedCount} displaced families** — those who lose a dwelling, not merely land`,
      "",
      "```",
      "records/     land records the platform reads back on upload",
      "documents/   DPR and SIA report, as PDFs with a real text layer",
      "drawings/    alignment plan, bridge elevation, RoW cross section",
      "templates/   the field guide for each record type",
      "rejected-samples/  files the platform refuses, and why",
      "```",
      "",
      "## Order to upload",
      "",
      "1. `records/fmb-sketch-*.csv` — one per village. Registers the plots with",
      "   their boundaries. Do these first: a chitta names a survey number, and",
      "   the titleholder can only be attached to a plot that already exists.",
      "2. `records/patta-chitta-extract-mettupalayam.xlsx` — attaches the",
      "   titleholder to each plot. Note the extents are quoted in three",
      "   different units across the file, as a real extract would be.",
      "3. `records/dgps-survey-report.pdf` — the s.12 re-survey, as a PDF with a",
      "   text layer. Reads back the plots re-measured for the acquisition.",
      "4. The supporting records: encumbrances, guideline value, asset valuation,",
      "   legal heirs.",
      "5. `records/patta-chitta-with-errors.csv` — upload this to see the error",
      "   report. Seven rows, each failing for a different reason.",
      "",
      "## The point of the rejected samples",
      "",
      "The previous document reader derived every value from a hash of the",
      "document id and never opened the file — a blank upload still produced an",
      "owner, a survey number and a plot boundary. Upload anything from",
      "`rejected-samples/` to confirm that is no longer the case.",
      "",
    ].join("\n")
  );
}

/* ── Run ──────────────────────────────────────────────────────────────── */

async function main() {
  mkdirSync(join(OUT, "templates"), { recursive: true });
  await writeChittaXlsx();
  await writeDgpsPdf();
  writeSupportingRecords();
  writeBrokenExtract();
  writeScanSample();
  await writeNarratives();
  writeDrawings();
  writeGuides();
  writeReadme();

  console.log(`Flagship kit built: ${written.length} files\n`);
  for (const f of written) console.log(`  ${f}`);
  console.log(
    `\n${totals.parcelCount} plots · ${totals.totalHectares} ha · ` +
      `${totals.affectedFamilyCount} affected families (${totals.titleholderCount} titleholders + ${totals.surveyedCount} surveyed) · ` +
      `${totals.displacedCount} displaced`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
