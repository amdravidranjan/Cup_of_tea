"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { STAGES, type Stage } from "@/lib/workflow";
import {
  GENERATED_DOCUMENT_STAGE,
  GENERATED_DOCUMENT_TYPES,
  GENERATED_DOCUMENT_TITLES,
  type GeneratedDocumentType,
} from "@/lib/generated-documents";

export function GenerateDocument({
  projectId,
  currentStage,
}: {
  projectId: string;
  currentStage: Stage;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<GeneratedDocumentType | null>(null);

  const available = GENERATED_DOCUMENT_TYPES.filter(
    (type) => STAGES.indexOf(currentStage) >= STAGES.indexOf(GENERATED_DOCUMENT_STAGE[type])
  );

  if (available.length === 0) return null;

  async function generate(type: GeneratedDocumentType) {
    setPending(type);
    const res = await fetch(`/api/projects/${projectId}/generate-document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to generate document");
      return;
    }
    toast.success(`${GENERATED_DOCUMENT_TITLES[type]} generated`);
    router.refresh();
  }

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <p className="text-sm font-medium">Official documents</p>
      <div className="flex flex-wrap gap-2">
        {available.map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            disabled={pending !== null}
            onClick={() => generate(type)}
          >
            {pending === type ? "Generating…" : `Generate ${GENERATED_DOCUMENT_TITLES[type]}`}
          </Button>
        ))}
      </div>
    </div>
  );
}
