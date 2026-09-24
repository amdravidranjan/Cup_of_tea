/**
 * The land-record files the walkthrough hands a judge to upload.
 *
 * `scripts/build-flagship-kit.ts` writes the full Tamil Nadu kit to disk as a
 * shipped artefact. This builds the three files the walkthrough actually uses
 * on demand instead, for whichever region the visitor picked — same columns,
 * same deliberate messiness, different district and different names.
 *
 * Kept in the same shape as the shipped kit on purpose: a judge who downloads
 * the Karnataka sheet and one who downloads the Tamil Nadu one are looking at
 * the same form, so the demo video and the live site do not disagree.
 */

import type { DemoRegion } from "./regions";
import { demoProject, type DemoProjectData } from "@/db/demo-project";
import type { FlagshipParcel } from "@/db/flagship-project";

export type KitKind = "fmb" | "patta" | "errors";

export interface KitFile {
  filename: string;
  contentType: string;
  body: string | Uint8Array;
}

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
function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * A real extract is quoted in whatever unit the clerk used, so this file is
 * deliberately mixed: every third row in acres, one in seven in the
 * hectare-are-square-metre form a chitta prints, the rest in hectares.
 */
function chittaExtent(extent: number, index: number): string {
  if (index % 7 === 3) {
    const ha = Math.floor(extent);
    const ares = Math.floor((extent - ha) * 100);
    const sqm = Math.round(((extent - ha) * 100 - ares) * 100);
    return `${ha}-${String(ares).padStart(2, "0")}-${String(sqm).padStart(2, "0")}`;
  }
  if (index % 3 === 0) return `${(extent / 0.40468564224).toFixed(2)} acres`;
  return extent.toFixed(4);
}

/** The village whose FMB sheet the walkthrough uploads. */
function kitVillage(demo: DemoProjectData) {
  const counts = new Map<string, number>();
  for (const p of demo.parcels) counts.set(p.village, (counts.get(p.village) ?? 0) + 1);
  // The fullest village: the sheet should be worth uploading.
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** How many plots and owners this region's kit carries, for the narration. */
export function kitCounts(region: DemoRegion): { plots: number; owners: number } {
  const demo = demoProject(region);
  const village = kitVillage(demo);
  return {
    plots: demo.parcels.filter((p) => p.village === village).length,
    owners: demo.holders.length,
  };
}

export async function buildKitFile(region: DemoRegion, kind: KitKind): Promise<KitFile> {
  const demo = demoProject(region);
  const village = kitVillage(demo);

  if (kind === "fmb") {
    const rows = demo.parcels
      .filter((p) => p.village === village)
      .map((p) => [
        p.surveyNumber,
        p.village,
        p.extent.toFixed(4),
        boundaryCell(p),
        p.landClassification,
        p.adjoining.join("; "),
      ]);
    return {
      filename: `fmb-sketch-${slug(village)}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: csv(
        ["Survey Number", "Village", "Extent", "Boundary Coordinates", "Land Classification", "Adjoining Survey Numbers"],
        rows
      ),
    };
  }

  if (kind === "errors") {
    const good = demo.holders.slice(0, 6);
    const rows = [
      [good[0].pattaNumber, good[0].surveyNumber, good[0].name, good[0].village, good[0].extent.toFixed(4), good[0].aadhaarMasked, good[0].phone],
      // Extent written as prose: the reader must refuse to guess.
      [good[1].pattaNumber, good[1].surveyNumber, good[1].name, good[1].village, "about two acres", good[1].aadhaarMasked, good[1].phone],
      // Survey number with a hyphen where the subdivision slash belongs.
      [good[2].pattaNumber, good[2].surveyNumber.replace("/", "-"), good[2].name, good[2].village, good[2].extent.toFixed(4), good[2].aadhaarMasked, good[2].phone],
      // Aadhaar with two digits transposed — caught by the checksum, not by
      // counting digits.
      [good[3].pattaNumber, good[3].surveyNumber, good[3].name, good[3].village, good[3].extent.toFixed(4), "234567890142", good[3].phone],
      // Pattadar name left blank.
      [good[4].pattaNumber, good[4].surveyNumber, "", good[4].village, good[4].extent.toFixed(4), good[4].aadhaarMasked, good[4].phone],
      // A landline where a mobile is required.
      [good[5].pattaNumber, good[5].surveyNumber, good[5].name, good[5].village, good[5].extent.toFixed(4), good[5].aadhaarMasked, "044 2345 6789"],
      // Duplicate of row 2's plot: the same survey number twice in one file.
      [String(Number(good[1].pattaNumber) + 1), good[1].surveyNumber, good[2].name, good[1].village, "0.3100", "", "9445012345"],
    ];
    return {
      filename: `patta-chitta-with-errors-${slug(demo.taluk)}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: csv(
        ["Patta No", "Survey No", "Pattadar Name", "Revenue Village", "Extent (Ha)", "Aadhaar", "Mobile Number"],
        rows
      ),
    };
  }

  // The taluk office exports a spreadsheet, so the chitta ships as one — and
  // the platform has to read it without being asked for a CSV first.
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = `Taluk Office, ${demo.taluk} (demo data)`;
  const sheet = workbook.addWorksheet("Chitta Extract");
  sheet.addRow([
    "Patta No", "Survey No", "Pattadar Name", "Revenue Village", "Extent (Ha)",
    "Land Type", "Social Category", "Members", "Aadhaar", "Ration Card Number", "Mobile Number",
  ]);
  sheet.getRow(1).font = { bold: true };

  for (const [index, holder] of demo.holders.entries()) {
    const parcel = demo.parcels.find((p) => p.surveyNumber === holder.surveyNumber);
    sheet.addRow([
      holder.pattaNumber,
      holder.surveyNumber,
      holder.name,
      holder.village,
      chittaExtent(holder.extent, index),
      parcel?.landClassification ?? "PUNJAI",
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
  return {
    filename: `patta-chitta-extract-${slug(demo.taluk)}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: new Uint8Array(buffer),
  };
}
