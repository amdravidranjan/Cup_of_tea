"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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

export function DocumentUpload({ projectId }: { projectId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [pending, setPending] = useState(false);
  const selectedMeta = documentCategoryMeta(category);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
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
        ? "Document uploaded — open its extraction below to register the record it contains"
        : "Document uploaded"
    );
    formRef.current?.reset();
    router.refresh();
  }

  const groups = ["Project file", "Revenue records"] as const;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
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
      <div className="space-y-1">
        <Label htmlFor="file">File</Label>
        <input
          id="file"
          name="file"
          type="file"
          required
          className="block text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </Button>
      {selectedMeta && (
        <p className="w-full text-xs text-muted-foreground">
          {selectedMeta.issuedBy} — {selectedMeta.basis}.
          {selectedMeta.yields.includes("PARCEL") &&
            " Reading this registers a parcel with its boundary, so the plot does not have to be drawn by hand."}
          {selectedMeta.yields.includes("FAMILY") &&
            " Reading this registers the titleholder as an affected family."}
        </p>
      )}
    </form>
  );
}
