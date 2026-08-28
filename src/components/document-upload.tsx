"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DOCUMENT_CATEGORIES } from "@/lib/document-categories";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DocumentUpload({ projectId }: { projectId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [pending, setPending] = useState(false);

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
    toast.success("Document uploaded");
    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
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
        {pending ? "Uploading..." : "Upload"}
      </Button>
    </form>
  );
}
