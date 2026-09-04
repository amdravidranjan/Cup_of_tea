"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ENTITLEMENT_LABELS,
  FAMILY_CATEGORIES,
  FAMILY_CATEGORY_LABELS,
  type EntitlementType,
  type FamilyCategory,
} from "@/lib/entitlements";
import { toneBadgeClass } from "@/lib/status-colors";

interface Entitlement {
  id: string;
  type: EntitlementType;
  status: "PENDING" | "GRANTED";
  amount: number | null;
  note: string | null;
}

interface Family {
  id: string;
  headOfHouseholdName: string;
  village: string;
  category: string;
  memberCount: number;
  vulnerableGroup: boolean;
  deceasedAt?: Date | string | null;
  entitlements: Entitlement[];
}

function entitlementTone(status: string): "pending" | "success" {
  return status === "GRANTED" ? "success" : "pending";
}

function GrantForm({ familyId, entitlementId }: { familyId: string; entitlementId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("amount"));
    const note = formData.get("note");
    const res = await fetch(
      `/api/families/${familyId}/entitlements/${entitlementId}/grant`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: note ? String(note) : undefined }),
      }
    );
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to grant entitlement");
      return;
    }
    toast.success("Entitlement granted");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={`amount-${entitlementId}`} className="text-xs">
          Amount (₹)
        </Label>
        <Input
          id={`amount-${entitlementId}`}
          name="amount"
          type="number"
          min="1"
          step="0.01"
          required
          className="h-8 w-32"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`note-${entitlementId}`} className="text-xs">
          Note (optional)
        </Label>
        <Input id={`note-${entitlementId}`} name="note" className="h-8 w-48" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Granting…" : "Grant"}
      </Button>
    </form>
  );
}

function NewFamilyForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState<FamilyCategory>("landowner");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const vulnerableGroup = formData.get("vulnerableGroup") === "on";
    const contactPhone = formData.get("contactPhone");
    const res = await fetch(`/api/projects/${projectId}/families`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headOfHouseholdName: String(formData.get("headOfHouseholdName") ?? ""),
        village: String(formData.get("village") ?? ""),
        category,
        memberCount: Number(formData.get("memberCount")),
        vulnerableGroup,
        contactPhone: contactPhone ? String(contactPhone) : undefined,
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to register family");
      return;
    }
    toast.success("Family registered");
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="headOfHouseholdName">Head of household</Label>
        <Input id="headOfHouseholdName" name="headOfHouseholdName" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="village">Village</Label>
        <Input id="village" name="village" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as FamilyCategory)}>
          <SelectTrigger id="category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FAMILY_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {FAMILY_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="memberCount">Household size</Label>
        <Input id="memberCount" name="memberCount" type="number" min="1" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contactPhone">Contact phone (optional)</Label>
        <Input id="contactPhone" name="contactPhone" />
      </div>
      <div className="flex items-center gap-2 self-end pb-2">
        <input id="vulnerableGroup" name="vulnerableGroup" type="checkbox" className="h-4 w-4" />
        <Label htmlFor="vulnerableGroup" className="font-normal">
          Vulnerable group (SC/ST/BPL etc.)
        </Label>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Registering…" : "Register family"}
        </Button>
      </div>
    </form>
  );
}

function SuccessionForm({ familyId, onDone }: { familyId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [heirCount, setHeirCount] = useState(2);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const heirs = Array.from({ length: heirCount })
      .map((_, i) => ({
        name: String(fd.get(`heirName${i}`) ?? "").trim(),
        relationship: String(fd.get(`heirRel${i}`) ?? "").trim(),
        sharePercent: Number(fd.get(`heirShare${i}`) ?? 0),
      }))
      .filter((h) => h.name && h.relationship && h.sharePercent > 0);
    if (heirs.length === 0) {
      toast.error("Add at least one heir with a name, relationship, and share");
      return;
    }
    setPending(true);
    const res = await fetch(`/api/families/${familyId}/succession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deceasedAt: fd.get("deceasedAt"),
        successionNote: fd.get("successionNote") || undefined,
        heirs,
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to record succession");
      return;
    }
    toast.success("Succession recorded — entitlement split across heirs");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="space-y-1">
        <Label htmlFor="deceasedAt" className="text-xs">
          Date of death
        </Label>
        <Input id="deceasedAt" name="deceasedAt" type="date" required className="h-8 w-40" />
      </div>
      {Array.from({ length: heirCount }).map((_, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <Input name={`heirName${i}`} placeholder="Heir name" className="h-8 w-36" />
          <Input name={`heirRel${i}`} placeholder="Relationship" className="h-8 w-28" />
          <Input name={`heirShare${i}`} type="number" min={1} max={100} placeholder="Share %" className="h-8 w-24" />
        </div>
      ))}
      <Button type="button" size="sm" variant="ghost" onClick={() => setHeirCount((c) => c + 1)}>
        + Add another heir
      </Button>
      <Input name="successionNote" placeholder="Note (optional)" className="h-8" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Record succession"}
      </Button>
    </form>
  );
}

export function FamiliesPanel({
  projectId,
  families,
  canManage,
  canGrant,
}: {
  projectId: string;
  families: Family[];
  canManage: boolean;
  canGrant: boolean;
}) {
  const router = useRouter();
  const [successionOpenFor, setSuccessionOpenFor] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {canManage && <NewFamilyForm projectId={projectId} />}

      {families.length === 0 ? (
        <p className="text-sm text-muted-foreground">No affected families registered yet.</p>
      ) : (
        <div className="space-y-3">
          {families.map((family) => (
            <Card key={family.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {family.headOfHouseholdName}
                  <Badge variant="outline">{family.village}</Badge>
                  <Badge variant="outline">{family.category}</Badge>
                  <Badge variant="outline">{family.memberCount} members</Badge>
                  {family.vulnerableGroup && (
                    <Badge variant="outline" className={toneBadgeClass("pending")}>
                      Vulnerable group
                    </Badge>
                  )}
                  {family.deceasedAt && (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                      Succession recorded
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {family.entitlements.map((e) => (
                    <li key={e.id} className="flex flex-col gap-2 border-t pt-2 first:border-t-0 first:pt-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm">{ENTITLEMENT_LABELS[e.type]}</span>
                        <Badge variant="outline" className={toneBadgeClass(entitlementTone(e.status))}>
                          {e.status === "GRANTED" ? `Granted — ₹${e.amount}` : "Pending"}
                        </Badge>
                      </div>
                      {canGrant && e.status === "PENDING" && (
                        <GrantForm familyId={family.id} entitlementId={e.id} />
                      )}
                    </li>
                  ))}
                </ul>
                {canManage && !family.deceasedAt && (
                  <div>
                    {successionOpenFor === family.id ? (
                      <SuccessionForm
                        familyId={family.id}
                        onDone={() => {
                          setSuccessionOpenFor(null);
                          router.refresh();
                        }}
                      />
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => setSuccessionOpenFor(family.id)}
                      >
                        Head of household deceased? Record succession →
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
