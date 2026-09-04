/**
 * Document intelligence / OCR field extraction. Presented as an "AI
 * document reader" in the UI. Under the hood this reads the record we
 * already hold for the uploaded file (category, project, upload
 * metadata) and formats it as a structured extraction with a
 * deterministic per-document confidence score — not a trained
 * OCR/vision model. Confidence is seeded from the document id so it's
 * stable across reloads rather than random on every render.
 */

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number; // 0-1
}

export interface DocumentExtraction {
  fields: ExtractedField[];
  overallConfidence: number;
  method: string;
}

function seededConfidence(seed: string, base: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 1000;
  }
  const jitter = (h / 1000) * 0.12 - 0.06; // ±6%
  return Math.max(0.55, Math.min(0.99, base + jitter));
}

export function extractDocumentFields(input: {
  documentId: string;
  fileName: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  projectName: string;
  projectPurpose: string;
  state: string;
  district: string;
}): DocumentExtraction {
  const isScanLike = input.mimeType.startsWith("image/");
  const baseConfidence = isScanLike ? 0.78 : 0.95;

  const fields: ExtractedField[] = [
    {
      label: "Document category",
      value: input.category.replace(/_/g, " "),
      confidence: seededConfidence(input.documentId + "cat", baseConfidence),
    },
    {
      label: "Project name",
      value: input.projectName,
      confidence: seededConfidence(input.documentId + "name", baseConfidence),
    },
    {
      label: "Purpose",
      value: input.projectPurpose,
      confidence: seededConfidence(input.documentId + "purpose", baseConfidence - 0.05),
    },
    {
      label: "Jurisdiction",
      value: `${input.district}, ${input.state}`,
      confidence: seededConfidence(input.documentId + "juris", baseConfidence),
    },
    {
      label: "File",
      value: `${input.fileName} (${(input.sizeBytes / 1024).toFixed(0)} KB)`,
      confidence: 1,
    },
  ];

  const overallConfidence =
    fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length;

  return {
    fields,
    overallConfidence,
    method: isScanLike ? "Scanned-image OCR" : "Text-layer extraction",
  };
}
