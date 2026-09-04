"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NewProjectForm({
  lockedState,
  lockedDistrict,
}: {
  /** For roles tied to one state/district (e.g. district officers), lock
   * the field to their own scope — a project created outside it would
   * immediately disappear from their own project list. Agencies aren't
   * tied to a district, so they get free-text fields. */
  lockedState?: string;
  lockedDistrict?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        purpose: String(formData.get("purpose") ?? ""),
        state: lockedState ?? String(formData.get("state") ?? ""),
        district: lockedDistrict ?? String(formData.get("district") ?? ""),
      }),
    });
    const body = (await res.json()) as { id?: string; error?: string };
    setPending(false);
    if (!res.ok || !body.id) {
      toast.error(body.error ?? "Failed to create project");
      return;
    }
    toast.success("Project created as DRAFT");
    setOpen(false);
    router.push(`/app/projects/${body.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New land acquisition project</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="np-name">Project name</Label>
            <Input id="np-name" name="name" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="np-purpose">Purpose</Label>
            <Textarea id="np-purpose" name="purpose" required rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="np-state">State</Label>
              {lockedState ? (
                <Input id="np-state" value={lockedState} disabled />
              ) : (
                <Input id="np-state" name="state" required />
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="np-district">District</Label>
              {lockedDistrict ? (
                <Input id="np-district" value={lockedDistrict} disabled />
              ) : (
                <Input id="np-district" name="district" required />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The project starts in DRAFT. You&apos;ll set its alignment/parcels and submit it for
            scrutiny from the project page.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
