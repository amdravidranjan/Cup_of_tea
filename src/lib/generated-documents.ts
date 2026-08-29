import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Stage } from "./workflow";

export type GeneratedDocumentType =
  | "NOTIFICATION"
  | "DECLARATION"
  | "AWARD_LETTER"
  | "POSSESSION_CERTIFICATE";

export const GENERATED_DOCUMENT_TYPES: GeneratedDocumentType[] = [
  "NOTIFICATION",
  "DECLARATION",
  "AWARD_LETTER",
  "POSSESSION_CERTIFICATE",
];

// The stage a project must have reached before this document can be
// generated — matches the workflow event that actually produces the
// real-world equivalent (e.g. the Award Letter only exists once AWARDED
// has actually been reached).
export const GENERATED_DOCUMENT_STAGE: Record<GeneratedDocumentType, Stage> = {
  NOTIFICATION: "NOTIFIED",
  DECLARATION: "DECLARED",
  AWARD_LETTER: "AWARDED",
  POSSESSION_CERTIFICATE: "POSSESSION",
};

export const GENERATED_DOCUMENT_TITLES: Record<GeneratedDocumentType, string> = {
  NOTIFICATION: "Section 11 Preliminary Notification",
  DECLARATION: "Section 19 Final Declaration",
  AWARD_LETTER: "Award of Compensation",
  POSSESSION_CERTIFICATE: "Certificate of Possession",
};

const BODY_TEXT: Record<GeneratedDocumentType, (p: GeneratedDocumentData["project"]) => string[]> = {
  NOTIFICATION: (p) => [
    `Notice is hereby given under Section 11 of the Right to Fair Compensation and`,
    `Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013`,
    `that the land described below is likely to be needed for the public purpose of`,
    `"${p.purpose}". The market value of the land for compensation purposes shall`,
    `be determined as on the date of this notification.`,
  ],
  DECLARATION: (p) => [
    `In pursuance of Section 19 of the RFCTLARR Act, 2013, it is hereby declared`,
    `that the land specified below is required for the public purpose of`,
    `"${p.purpose}", and the acquisition proceedings shall continue accordingly.`,
  ],
  AWARD_LETTER: () => [
    `An award of compensation under Sections 26 to 30 of the RFCTLARR Act, 2013`,
    `has been passed by the Collector for the parcels listed below, computed as`,
    `market value plus applicable multiplier, solatium, and statutory interest.`,
  ],
  POSSESSION_CERTIFICATE: () => [
    `This is to certify that possession of the land described below has been`,
    `taken by the Collector under Section 38 of the RFCTLARR Act, 2013,`,
    `following full payment of compensation and applicable R&R entitlements.`,
  ],
};

export interface GeneratedDocumentData {
  type: GeneratedDocumentType;
  project: { name: string; purpose: string; state: string; district: string };
  issuedAt: Date;
  issuedBy: string;
  parcels?: { village: string; areaHectares: number }[];
  compensationTotal?: number;
}

function formatLakh(amount: number): string {
  return `Rs. ${(amount / 100000).toFixed(2)} lakh`;
}

export async function renderDocumentPdf(data: GeneratedDocumentData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const margin = 56;
  const width = page.getWidth();
  let y = page.getHeight() - margin;

  function line(
    text: string,
    opts: { size?: number; useFont?: typeof font; center?: boolean; gap?: number } = {}
  ) {
    const size = opts.size ?? 11;
    const useFont = opts.useFont ?? font;
    const textWidth = useFont.widthOfTextAtSize(text, size);
    const x = opts.center ? (width - textWidth) / 2 : margin;
    page.drawText(text, { x, y, size, font: useFont, color: rgb(0.11, 0.14, 0.2) });
    y -= (opts.gap ?? size + 8);
  }

  line("GOVERNMENT OF INDIA", { size: 10, useFont: bold, center: true, gap: 14 });
  line("DEPARTMENT OF LAND RESOURCES", { size: 10, useFont: bold, center: true, gap: 22 });
  line(GENERATED_DOCUMENT_TITLES[data.type], { size: 16, useFont: bold, center: true, gap: 28 });

  page.drawLine({
    start: { x: margin, y: y + 8 },
    end: { x: width - margin, y: y + 8 },
    thickness: 1,
    color: rgb(0.75, 0.42, 0.25),
  });
  y -= 12;

  line(`Project: ${data.project.name}`, { size: 12, useFont: bold, gap: 18 });
  line(`Location: ${data.project.district}, ${data.project.state}`, { gap: 24 });

  for (const paragraphLine of BODY_TEXT[data.type](data.project)) {
    line(paragraphLine, { gap: 16 });
  }
  y -= 10;

  if (data.parcels && data.parcels.length > 0) {
    line("Affected Parcels", { size: 12, useFont: bold, gap: 18 });
    for (const parcel of data.parcels) {
      line(`  ${parcel.village} — ${parcel.areaHectares.toFixed(2)} ha`, { gap: 15 });
    }
    y -= 8;
  }

  if (typeof data.compensationTotal === "number") {
    line(`Total Compensation Awarded: ${formatLakh(data.compensationTotal)}`, {
      size: 12,
      useFont: bold,
      gap: 24,
    });
  }

  y -= 20;
  line(`Issued on ${data.issuedAt.toISOString().slice(0, 10)} by ${data.issuedBy}`, {
    size: 10,
    gap: 16,
  });
  line("Sub-Collector / Land Acquiring Officer", { size: 10, gap: 14 });

  return pdfDoc.save();
}
