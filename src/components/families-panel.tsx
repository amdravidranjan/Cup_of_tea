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
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
