"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EditFieldType = "text" | "number" | "select" | "boolean";

export interface EditField {
  name: string;
  label: string;
  type: EditFieldType;
  value: string | number | boolean | null;
  options?: { value: string; label: string }[];
  /** Shown under the input — what this field means, or what changes if it moves. */
  hint?: string;
  required?: boolean;
  step?: string;
}

/**
 * Corrects a record already on the file.
 *
 * Every edit demands a written reason. That is not friction for its own
 * sake: the audit trail records what changed regardless, and the reason is
 * the only part a later reader cannot reconstruct from the diff. An extent
 * that went from 0.84 to 0.61 hectares is a fact; "re-measured after the
 * titleholder disputed the DGPS reading" is what makes it defensible.
 *
 * Sends only the fields the officer actually touched, so an untouched field
 * never appears in the trail as a change to the same value.
 */
export function RecordEditDialog({
  endpoint,
  title,
  description,
  fields,
  trigger,
  onSaved,
}: {
  endpoint: string;
  title: string;
  description?: string;
  fields: EditField[];
  trigger?: ReactNode;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState("");
  const [values, setValues] = useState<Record<string, string>>(() => initial(fields));

  function initial(source: EditField[]): Record<string, string> {
    return Object.fromEntries(
      source.map((f) => [f.name, f.value === null || f.value === undefined ? "" : String(f.value)])
    );
  }

  function reset() {
    setValues(initial(fields));
    setReason("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!reason.trim()) {
      toast.error("Give a reason for this change");
      return;
    }

    const payload: Record<string, unknown> = { reason: reason.trim() };
    let changed = false;
    for (const field of fields) {
      const original = field.value === null || field.value === undefined ? "" : String(field.value);
      const current = values[field.name] ?? "";
      if (current === original) continue;
      changed = true;
      if (field.type === "number") {
        payload[field.name] = current === "" ? null : Number(current);
      } else if (field.type === "boolean") {
        payload[field.name] = current === "true";
      } else {
        payload[field.name] = current;
      }
    }
    if (!changed) {
      toast.error("Nothing has been changed yet");
      return;
    }

    setPending(true);
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);

    if (!res.ok) {
      toast.error(body.error ?? "The change could not be saved");
      return;
    }
    toast.success("Saved — the change is recorded in the audit trail");
    setOpen(false);
    reset();
    onSaved?.();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reopening should show the record as it is now, not the abandoned
        // draft from a previous attempt.
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Icon icon="mdi:pencil-outline" width={14} />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {description ??
                "Correct this record. The change, the previous value and your reason are all recorded."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-1">
                <Label htmlFor={`edit-${field.name}`} className="text-xs">
                  {field.label}
                </Label>
                {field.type === "select" || field.type === "boolean" ? (
                  <Select
                    value={values[field.name] ?? ""}
                    onValueChange={(v) => setValues((prev) => ({ ...prev, [field.name]: v }))}
                  >
                    <SelectTrigger id={`edit-${field.name}`}>
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.type === "boolean"
                        ? [
                            { value: "true", label: "Yes" },
                            { value: "false", label: "No" },
                          ]
                        : (field.options ?? [])
                      ).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`edit-${field.name}`}
                    type={field.type === "number" ? "number" : "text"}
                    step={field.step}
                    required={field.required}
                    value={values[field.name] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                    }
                  />
                )}
                {field.hint && (
                  <p className="text-[11px] text-muted-foreground">{field.hint}</p>
                )}
              </div>
            ))}

            <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50/50 p-3">
              <Label htmlFor="edit-reason" className="text-xs">
                Reason for this change <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="edit-reason"
                required
                rows={2}
                placeholder="e.g. Re-measured after the titleholder disputed the original DGPS reading"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Recorded against your name in the audit trail. The diff shows what changed; this
                is the only record of why.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save change"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
