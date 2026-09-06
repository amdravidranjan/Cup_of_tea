"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_META,
  documentCategoryMeta,
} from "@/lib/document-categories";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Accepted formats for the project file.
 *
 * Wider than the bulk-intake reader's list, because this is the filing
 * cabinet: a signed award scan or a site photograph belongs on the file even
 * though nothing can be read out of it. What is refused is what has no place
 * on a statutory file at all — executables, archives, and the `.txt` the demo
 * seed used to lean on. No revenue office issues a .txt.
 */
const ACCEPTED = [
  ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv",
  ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".dwg", ".dxf", ".zip",
];

const ACCEPT_ATTRIBUTE = ACCEPTED.join(",");
const MAX_BYTES = 25 * 1024 * 1024;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/**
 * Rejects before uploading, so the officer is told what is wrong by the
 * control they are standing in front of rather than by a failed request.
 */
function rejectionFor(file: File): string | null {
  const extension = extensionOf(file.name);
  if (!extension) {
    return `${file.name} has no file extension, so its type cannot be established.`;
  }
  if (extension === ".txt") {
    return "Plain text is not a document format a revenue office issues. Upload the PDF, DOCX, XLSX or scan you were given.";
  }
  if (!ACCEPTED.includes(extension)) {
    return `${extension} files are not accepted. Accepted formats: ${ACCEPTED.join(", ")}.`;
  }
  if (file.size === 0) {
    return `${file.name} is empty.`;
  }
  if (file.size > MAX_BYTES) {
    return `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB, over the 25 MB limit.`;
  }
  return null;
}

export function DocumentUpload({ projectId }: { projectId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [chosen, setChosen] = useState<File | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const selectedMeta = documentCategoryMeta(category);

  function accept(file: File | undefined) {
    if (!file) return;
    const problem = rejectionFor(file);
    if (problem) {
      setChosen(null);
      setRejection(problem);
      return;
    }
    setRejection(null);
    setChosen(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen) {
      toast.error("Choose a file to upload");
      return;
    }
    setPending(true);
    const formData = new FormData();
    formData.set("file", chosen);
    formData.set("category", category);

    const res = await fetch(`/api/projects/${projectId}/documents`, {
      method: "POST",
      body: formData,
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Upload failed");
      return;
    }
    toast.success(
      selectedMeta && selectedMeta.yields.length > 0
        ? "Filed — open its extraction below to register the record it contains"
        : "Filed"
    );
    formRef.current?.reset();
    setChosen(null);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  const groups = ["Project file", "Revenue records"] as const;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category" className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {DOCUMENT_CATEGORIES.filter(
                  (c) => DOCUMENT_CATEGORY_META[c].group === group
                ).map((c) => (
                  <SelectItem key={c} value={c}>
                    {DOCUMENT_CATEGORY_META[c].label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`flex cursor-pointer items-center gap-3 rounded-md border-2 border-dashed p-4 transition-colors ${
          dragging ? "border-brand bg-brand/5" : "border-muted-foreground/25 hover:border-muted-foreground/40"
        }`}
      >
        <Icon
          icon={chosen ? "mdi:file-check-outline" : "mdi:tray-arrow-up"}
          width={22}
          className={chosen ? "text-emerald-600" : "text-muted-foreground"}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {chosen ? chosen.name : "Drop a file here, or click to choose"}
          </p>
          <p className="text-xs text-muted-foreground">
            {chosen
              ? `${(chosen.size / 1024).toFixed(1)} KB — ready to file`
              : `${ACCEPTED.join(", ")} · up to 25 MB`}
          </p>
        </div>
        <input
          ref={inputRef}
          id="file"
          name="file"
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </div>

      {rejection && (
        <p className="flex items-start gap-1.5 text-xs text-red-700">
          <Icon icon="mdi:alert-circle-outline" width={14} className="mt-0.5 shrink-0" />
          {rejection}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !chosen}>
          {pending ? "Filing…" : "File this document"}
        </Button>
        {selectedMeta && (
          <p className="text-xs text-muted-foreground">
            {selectedMeta.issuedBy} — {selectedMeta.basis}.
            {selectedMeta.yields.length > 0 &&
              " For more than one record, use bulk intake above instead."}
          </p>
        )}
      </div>
    </form>
  );
}
