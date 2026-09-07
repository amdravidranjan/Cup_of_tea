"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InputNotes, SandboxField } from "@/components/ai-explainability";
import { formatINR } from "@/lib/ai/input-guard";
import { DOCUMENT_CATEGORIES } from "@/lib/document-categories";
import type { TriageResult } from "@/lib/ai/document-triage";
import {
  ASSET_KIND_LABELS,
  PROJECT_DOCUMENT_FIXTURES,
  extractProjectDetails,
  summariseProjectRead,
  type ProjectDocumentFixture,
} from "@/lib/ai/document-project-details";

/**
 * What the document reader does with whatever it is handed.
 *
 * The real upload path needs an actual file, which is exactly what a judge at
 * a demo table does not have — and the files they do have are a holiday photo
 * and a zip. So this panel takes the *metadata* of an upload rather than the
 * bytes: a name, a type, a size, and whether the PDF had a text layer. That is
 * everything triage and the project-detail reader actually use, so pressing a
 * fixture here is not a mock of the feature, it is the feature with the file
 * step skipped.
 *
 * The eight fixtures between them hit every branch: a document that fills the
 * form, one that fills only the statutory particulars, one that is the wrong
 * kind of document entirely, one whose category has to be inferred, a
 * photograph that caps its own confidence, an encrypted file, and a JPEG
 * wearing a .pdf extension.
 */

const SEVERITY_BADGE: Record<TriageResult["severity"], string> = {
  ok: "bg-emerald-100 text-emerald-800 border-emerald-200",
  degraded: "bg-amber-100 text-amber-800 border-amber-200",
  blocked: "bg-red-100 text-red-800 border-red-200",
};

const MIME_OPTIONS = [
  { value: "application/pdf", label: "PDF" },
  { value: "image/jpeg", label: "JPEG photograph" },
  { value: "image/png", label: "PNG image" },
  { value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word (.docx)" },
  { value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel (.xlsx)" },
  { value: "text/csv", label: "CSV" },
  { value: "text/plain", label: "Plain text" },
  { value: "application/zip", label: "Zip archive" },
  { value: "application/x-msdownload", label: "Executable" },
  { value: "", label: "(type not reported)" },
];

interface FormState {
  fileName: string;
  mimeType: string;
  sizeKb: string;
  category: string;
  hasTextLayer: boolean;
  encrypted: boolean;
}

function fixtureToForm(fixture: ProjectDocumentFixture): FormState {
  return {
    fileName: fixture.fileName,
    mimeType: fixture.mimeType,
    sizeKb: String(Math.round(fixture.sizeBytes / 1024)),
    category: fixture.category,
    hasTextLayer: fixture.hasTextLayer,
    encrypted: fixture.encrypted ?? false,
  };
}

export function DocumentReadSandbox() {
  const [activeFixture, setActiveFixture] = useState<string | null>(
    PROJECT_DOCUMENT_FIXTURES[0].id
  );
  const [form, setForm] = useState<FormState>(() => fixtureToForm(PROJECT_DOCUMENT_FIXTURES[0]));
  const [context, setContext] = useState({ state: "Tamil Nadu", district: "" });

  const details = useMemo(() => {
    const sizeKb = Number(form.sizeKb);
    return extractProjectDetails({
      // The document id is what makes the read deterministic, so it is derived
      // from the inputs rather than randomised — the same file described the
      // same way always reads back identically.
      documentId: activeFixture ? `fixture:${activeFixture}` : `manual:${form.fileName}:${form.mimeType}`,
      fileName: form.fileName,
      mimeType: form.mimeType,
      sizeBytes: Number.isFinite(sizeKb) ? sizeKb * 1024 : form.sizeKb,
      category: form.category,
      state: context.state,
      district: context.district,
      hasTextLayer: form.hasTextLayer,
      encrypted: form.encrypted,
    });
  }, [form, context, activeFixture]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setActiveFixture(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  const triage = details.triage;
  const readFields: { label: string; value: string; confidence: number; source: string }[] = [
    { label: "Project name", value: details.name.value || "—", confidence: details.name.confidence, source: details.name.source },
    { label: "Public purpose", value: details.purpose.value || "—", confidence: details.purpose.confidence, source: details.purpose.source },
    { label: "Asset type", value: ASSET_KIND_LABELS[details.assetKind.value], confidence: details.assetKind.confidence, source: details.assetKind.source },
    { label: "District", value: details.district.value || "—", confidence: details.district.confidence, source: details.district.source },
    { label: "Villages", value: details.villages.value.join(", ") || "—", confidence: details.villages.confidence, source: details.villages.source },
    { label: "Total extent", value: details.totalAreaHectares.value ? `${details.totalAreaHectares.value} ha` : "—", confidence: details.totalAreaHectares.confidence, source: details.totalAreaHectares.source },
    { label: "Requiring body", value: details.requiringBody.value || "—", confidence: details.requiringBody.confidence, source: details.requiringBody.source },
    { label: "Estimated cost", value: details.estimatedCost.value === null ? "—" : formatINR(details.estimatedCost.value), confidence: details.estimatedCost.confidence, source: details.estimatedCost.source },
    { label: "Notification number", value: details.notificationNumber.value ?? "—", confidence: details.notificationNumber.confidence, source: details.notificationNumber.source },
    { label: "Notification date", value: details.notificationDate.value ?? "—", confidence: details.notificationDate.confidence, source: details.notificationDate.source },
    { label: "Affected families", value: details.estimatedAffectedFamilies.value === null ? "—" : String(details.estimatedAffectedFamilies.value), confidence: details.estimatedAffectedFamilies.confidence, source: details.estimatedAffectedFamilies.source },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Document reading — drop in any file description
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Reads project details off a DPR or a s.11 notification into the new-project form. Every
          field states where it came from, and the fields the document does not contain are named
          rather than left blank without comment.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium text-foreground">Load a sample document</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROJECT_DOCUMENT_FIXTURES.map((fixture) => (
              <button
                key={fixture.id}
                type="button"
                onClick={() => {
                  setActiveFixture(fixture.id);
                  setForm(fixtureToForm(fixture));
                  setContext({ state: fixture.state, district: fixture.district });
                }}
                className={`rounded-md border px-3 py-2 text-left transition-colors ${
                  activeFixture === fixture.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                <span className="block text-xs font-semibold text-foreground">{fixture.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {fixture.demonstrates}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <SandboxField label="File name" hint="The category is inferred from this when none is chosen.">
            <Input
              value={form.fileName}
              onChange={(e) => set("fileName", e.target.value)}
              className="h-8 text-sm"
              aria-label="File name"
            />
          </SandboxField>

          <SandboxField label="File type">
            <select
              value={form.mimeType}
              onChange={(e) => set("mimeType", e.target.value)}
              aria-label="File type"
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {MIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </SandboxField>

          <SandboxField label="Size (KB)" hint="Above 25,600 KB is refused; 0 reads as an interrupted upload.">
            <Input
              value={form.sizeKb}
              onChange={(e) => set("sizeKb", e.target.value)}
              inputMode="numeric"
              className="h-8 text-sm"
              aria-label="Size in KB"
            />
          </SandboxField>

          <SandboxField label="Category" hint="Leave blank to watch it be inferred from the name.">
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              aria-label="Document category"
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">(not selected — infer it)</option>
              {DOCUMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </SandboxField>

          <SandboxField label="District already known" hint="Project context beats anything read from the file.">
            <Input
              value={context.district}
              onChange={(e) => setContext((c) => ({ ...c, district: e.target.value }))}
              placeholder="(none)"
              className="h-8 text-sm"
              aria-label="District already known"
            />
          </SandboxField>

          <div className="space-y-2 pt-5">
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={form.hasTextLayer}
                onChange={(e) => set("hasTextLayer", e.target.checked)}
              />
              PDF has a text layer
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={form.encrypted}
                onChange={(e) => set("encrypted", e.target.checked)}
              />
              Password protected
            </label>
          </div>
        </div>

        <div className="rounded-md border">
          <div className="flex items-start justify-between gap-3 border-b bg-muted/30 px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-foreground">{triage.label}</p>
              <p className="ta text-[11px] text-muted-foreground">{triage.labelTamil}</p>
            </div>
            <Badge variant="outline" className={SEVERITY_BADGE[triage.severity]}>
              {triage.canExtract
                ? `up to ${Math.round(triage.confidenceCeiling * 100)}% confidence`
                : "not read"}
            </Badge>
          </div>
          <div className="space-y-2 px-3 py-2.5">
            <p className="text-xs text-foreground">{triage.reason}</p>
            <p className="ta text-[11px] text-muted-foreground">{triage.reasonTamil}</p>
            <p className="rounded border-l-2 border-l-primary/40 bg-primary/5 px-2 py-1.5 text-xs text-foreground">
              <span className="font-medium">Next: </span>
              {triage.nextAction}
            </p>
          </div>
        </div>

        <InputNotes notes={details.notes} />

        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-foreground">
              What would be filled into the new-project form
            </p>
            <p className="text-[11px] text-muted-foreground">
              {details.method} · {summariseProjectRead(details)}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Field</th>
                  <th className="py-1.5 pr-3 font-medium">Value read</th>
                  <th className="py-1.5 pr-3 font-medium">Where from</th>
                  <th className="py-1.5 text-right font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {readFields.map((field) => (
                  <tr key={field.label} className="border-b last:border-0 align-top">
                    <td className="py-1.5 pr-3 font-medium text-foreground">{field.label}</td>
                    <td className="py-1.5 pr-3 text-foreground">{field.value}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{field.source}</td>
                    <td className="py-1.5 text-right font-mono text-muted-foreground">
                      {field.confidence === 0 ? "—" : `${Math.round(field.confidence * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {details.missingFields.length > 0 && (
            <p className="rounded border-l-2 border-l-amber-400 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
              <span className="font-medium">
                Still needs a person ({details.missingFields.length}):{" "}
              </span>
              {details.missingFields.join(", ")}. This document does not contain them, so the form
              marks them as required rather than submitting an incomplete project.
            </p>
          )}

          {details.advisories.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">Findings an officer must act on</p>
              {details.advisories.map((advisory, index) => (
                <p
                  key={index}
                  className="rounded border-l-2 border-l-primary/40 bg-primary/5 px-2 py-1.5 text-xs text-foreground"
                >
                  {advisory}
                </p>
              ))}
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Template extraction per document category, with field-level confidence. No character
          recognition runs on images — a photograph of a page is capped and the reason is stated,
          rather than a survey number being invented off a picture.
        </p>
      </CardContent>
    </Card>
  );
}
