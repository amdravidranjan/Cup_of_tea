import { describe, expect, it } from "vitest";
import {
  TRIAGE_OUTCOMES,
  inferCategoryFromFileName,
  prepareDocumentRead,
  triageUpload,
} from "./document-triage";
import {
  PROJECT_DOCUMENT_FIXTURES,
  extractFixtureProjectDetails,
  extractProjectDetails,
  summariseProjectRead,
} from "./document-project-details";

/**
 * The cases here are the files a judge actually drops on a demo laptop, which
 * is a different set from the files an officer uploads: a holiday photo named
 * `.pdf`, a `.zip`, a zero-byte upload, a 40 MB scan, and a password-protected
 * draft. Every one of them has to produce a sentence and a next action rather
 * than a spinner.
 */

const PDF = { fileName: "patta-extract.pdf", mimeType: "application/pdf", sizeBytes: 240_000 };

describe("triageUpload", () => {
  it("never throws, whatever the fields contain", () => {
    const nasties = [
      { fileName: undefined, mimeType: undefined, sizeBytes: undefined },
      { fileName: null, mimeType: null, sizeBytes: null },
      { fileName: {}, mimeType: [], sizeBytes: "big" },
      { fileName: 42, mimeType: 7, sizeBytes: NaN },
      { fileName: "x".repeat(5000), mimeType: "application/pdf", sizeBytes: -1 },
    ];
    for (const nasty of nasties) {
      expect(() => triageUpload(nasty)).not.toThrow();
      const { result } = triageUpload(nasty);
      expect(result.nextAction.length).toBeGreaterThan(0);
    }
  });

  it("reads a text-layer PDF at full confidence", () => {
    const { result } = triageUpload({ ...PDF, hasTextLayer: true });
    expect(result.outcome).toBe("TEXT_LAYER_PDF");
    expect(result.canExtract).toBe(true);
    expect(result.confidenceCeiling).toBeGreaterThan(0.9);
  });

  it("caps a PDF with no text layer and blames the file, not the reader", () => {
    const { result } = triageUpload({ ...PDF, hasTextLayer: false });
    expect(result.outcome).toBe("IMAGE_ONLY_PDF");
    expect(result.confidenceCeiling).toBeLessThanOrEqual(0.78);
    expect(result.reason).toContain("picture of a page");
  });

  it("caps a photograph and states that no character recognition runs", () => {
    const { result } = triageUpload({
      fileName: "IMG_2043.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 2_400_000,
    });
    expect(result.outcome).toBe("SCANNED_IMAGE");
    expect(result.confidenceCeiling).toBeLessThanOrEqual(0.78);
    expect(result.reason.toLowerCase()).toContain("no character recognition");
  });

  it("blocks a zero-byte upload before anything else", () => {
    // Order matters: a 0-byte .exe must report as empty or unsupported, never
    // as a readable document.
    const { result } = triageUpload({ ...PDF, sizeBytes: 0 });
    expect(result.outcome).toBe("EMPTY_FILE");
    expect(result.canExtract).toBe(false);
  });

  it("blocks archives and executables", () => {
    for (const file of [
      { fileName: "records.zip", mimeType: "application/zip", sizeBytes: 5000 },
      { fileName: "setup.exe", mimeType: "application/x-msdownload", sizeBytes: 5000 },
      { fileName: "clip.mp4", mimeType: "video/mp4", sizeBytes: 5000 },
    ]) {
      const { result } = triageUpload(file);
      expect(result.outcome).toBe("UNSUPPORTED_TYPE");
      expect(result.canExtract).toBe(false);
    }
  });

  it("blocks a file above 25 MB and states the size it saw", () => {
    const { result } = triageUpload({ ...PDF, sizeBytes: 40 * 1024 * 1024 });
    expect(result.outcome).toBe("OVERSIZE");
    expect(result.reason).toContain("40.0 MB");
  });

  it("blocks an encrypted file but keeps it as an attachment", () => {
    const { result } = triageUpload({ ...PDF, encrypted: true });
    expect(result.outcome).toBe("ENCRYPTED");
    expect(result.nextAction).toContain("unprotected");
  });

  it("catches a JPEG named .pdf and trusts the contents over the name", () => {
    const { result } = triageUpload({
      fileName: "project_report_final_FINAL.pdf",
      mimeType: "image/jpeg",
      sizeBytes: 4_400_000,
    });
    expect(result.outcome).toBe("EXTENSION_MISMATCH");
    expect(result.reason).toContain("named .pdf");
  });

  it("reads spreadsheets as bulk intake rather than as one document", () => {
    const { result } = triageUpload({
      fileName: "village-parcels.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 90_000,
    });
    expect(result.outcome).toBe("SPREADSHEET");
    expect(result.nextAction).toContain("bulk intake");
  });

  it("gives every outcome a bilingual label and a next action", () => {
    for (const outcome of TRIAGE_OUTCOMES) {
      expect(outcome.label.length).toBeGreaterThan(0);
      expect(outcome.labelTamil.length).toBeGreaterThan(0);
      expect(outcome.reasonTamil.length).toBeGreaterThan(0);
      expect(outcome.nextAction.length).toBeGreaterThan(0);
    }
  });
});

describe("inferCategoryFromFileName", () => {
  it("recognises the names a taluk office actually uses", () => {
    expect(inferCategoryFromFileName("pattaa_extract.pdf").category).toBe("PATTA_CHITTA");
    expect(inferCategoryFromFileName("chitta adangal 2024.pdf").category).toBe("PATTA_CHITTA");
    expect(inferCategoryFromFileName("FMB_sketch_142-2B.pdf").category).toBe("FMB_SKETCH");
    expect(inferCategoryFromFileName("DGPS survey report.pdf").category).toBe("GPS_SURVEY_REPORT");
    expect(inferCategoryFromFileName("EC-2009-2025.pdf").category).toBe("ENCUMBRANCE_CERTIFICATE");
    expect(inferCategoryFromFileName("legal_heir_certificate.pdf").category).toBe("LEGAL_HEIR_CERTIFICATE");
    expect(inferCategoryFromFileName("section19_declaration.pdf").category).toBe("DECLARATION");
  });

  it("falls back to Other with a stated reason rather than guessing", () => {
    const guess = inferCategoryFromFileName("scan0001.pdf");
    expect(guess.category).toBe("OTHER");
    expect(guess.confidence).toBe(0);
    expect(guess.why).toContain("does not identify");
  });

  it("handles a missing name", () => {
    expect(inferCategoryFromFileName(undefined).category).toBe("OTHER");
  });
});

describe("prepareDocumentRead", () => {
  it("never lets an inferred guess overrule an explicit officer choice", () => {
    // The file is named like a patta but the officer said it is an FMB sketch.
    // A system that silently overrules a human who was explicit is worse than
    // one that guesses wrong.
    const prep = prepareDocumentRead({
      fileName: "patta-extract.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1000,
      category: "FMB_SKETCH",
    });
    expect(prep.category).toBe("FMB_SKETCH");
    expect(prep.categoryWasInferred).toBe(false);
  });

  it("infers a category when none was chosen, and notes that it did", () => {
    const prep = prepareDocumentRead({
      fileName: "section11-notification.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1000,
      category: "",
    });
    expect(prep.category).toBe("NOTIFICATION");
    expect(prep.categoryWasInferred).toBe(true);
    expect(prep.notes.some((n) => n.field === "Document category")).toBe(true);
  });
});

describe("extractProjectDetails", () => {
  it("never throws on any fixture and always states a method", () => {
    for (const fixture of PROJECT_DOCUMENT_FIXTURES) {
      expect(() => extractFixtureProjectDetails(fixture)).not.toThrow();
      const details = extractFixtureProjectDetails(fixture);
      expect(details.method.length).toBeGreaterThan(0);
      expect(summariseProjectRead(details).length).toBeGreaterThan(0);
    }
  });

  it("is deterministic — the same document id reads back identically", () => {
    const fixture = PROJECT_DOCUMENT_FIXTURES[0];
    const first = extractFixtureProjectDetails(fixture);
    const second = extractFixtureProjectDetails(fixture);
    expect(second.name.value).toBe(first.name.value);
    expect(second.totalAreaHectares.value).toBe(first.totalAreaHectares.value);
    expect(second.notificationNumber.value).toBe(first.notificationNumber.value);
  });

  it("fills cost from a DPR but leaves it blank on a notification", () => {
    // A gazette notification does not state a project cost, and claiming one
    // would be inventing a statutory particular.
    const dpr = extractFixtureProjectDetails(PROJECT_DOCUMENT_FIXTURES.find((f) => f.id === "dpr-complete")!);
    const notification = extractFixtureProjectDetails(
      PROJECT_DOCUMENT_FIXTURES.find((f) => f.id === "s11-notification")!
    );

    expect(dpr.estimatedCost.value).not.toBeNull();
    expect(notification.estimatedCost.value).toBeNull();
    expect(notification.missingFields).toContain("Estimated cost");
    expect(notification.notificationNumber.value).toBeTruthy();
  });

  it("names the gaps rather than staying quiet about them", () => {
    const drawing = extractProjectDetails({
      documentId: "d-1",
      fileName: "GAD-drawing.pdf",
      mimeType: "application/pdf",
      sizeBytes: 500_000,
      category: "DESIGN_DRAWING",
      hasTextLayer: true,
    });
    expect(drawing.missingFields).toContain("Total extent");
    expect(drawing.missingFields).toContain("Notification date");
  });

  it("invents no project from a document that carries none", () => {
    const wrong = extractFixtureProjectDetails(
      PROJECT_DOCUMENT_FIXTURES.find((f) => f.id === "wrong-document")!
    );
    expect(wrong.name.value).toBe("");
    expect(wrong.overallConfidence).toBe(0);
    expect(wrong.advisories.join(" ")).toContain("does not carry project-level particulars");
  });

  it("reads nothing at all out of an encrypted file", () => {
    const locked = extractFixtureProjectDetails(
      PROJECT_DOCUMENT_FIXTURES.find((f) => f.id === "locked-pdf")!
    );
    expect(locked.triage.outcome).toBe("ENCRYPTED");
    expect(locked.name.value).toBe("");
    expect(locked.missingFields.length).toBeGreaterThan(5);
  });

  it("caps confidence on a photographed notification", () => {
    const scan = extractFixtureProjectDetails(
      PROJECT_DOCUMENT_FIXTURES.find((f) => f.id === "scanned-notification")!
    );
    expect(scan.overallConfidence).toBeLessThanOrEqual(0.78);
    expect(scan.advisories.join(" ")).toContain("photograph or scan");
  });

  it("prefers known project context over anything read from the document", () => {
    const details = extractProjectDetails({
      documentId: "d-2",
      fileName: "dpr.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1000,
      category: "DPR",
      state: "Odisha",
      district: "Koraput",
      hasTextLayer: true,
    });
    expect(details.district.value).toBe("Koraput");
    expect(details.district.confidence).toBe(1);
    expect(details.district.source).toBe("project context");
  });

  it("advises on the transaction freeze when reading a s.11 notification", () => {
    const notification = extractFixtureProjectDetails(
      PROJECT_DOCUMENT_FIXTURES.find((f) => f.id === "s11-notification")!
    );
    expect(notification.advisories.join(" ")).toContain("freezes transactions");
  });

  it("keeps every confidence figure inside the triage ceiling", () => {
    for (const fixture of PROJECT_DOCUMENT_FIXTURES) {
      const details = extractFixtureProjectDetails(fixture);
      const ceiling = details.triage.confidenceCeiling;
      for (const key of ["name", "purpose", "villages", "totalAreaHectares"] as const) {
        expect(details[key].confidence).toBeLessThanOrEqual(ceiling);
      }
    }
  });

  it("covers every branch across the fixture set", () => {
    // The point of the fixtures is that pressing all of them exercises the
    // whole feature without owning a Tamil Nadu gazette.
    const outcomes = new Set(
      PROJECT_DOCUMENT_FIXTURES.map((f) => extractFixtureProjectDetails(f).triage.outcome)
    );
    expect(outcomes.has("TEXT_LAYER_PDF")).toBe(true);
    expect(outcomes.has("SCANNED_IMAGE")).toBe(true);
    expect(outcomes.has("ENCRYPTED")).toBe(true);
    expect(outcomes.has("EXTENSION_MISMATCH")).toBe(true);
  });
});
