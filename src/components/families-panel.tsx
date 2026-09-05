"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  grantedBy?: string | null;
  grantedAt?: Date | string | null;
  note: string | null;
}

interface Family {
  id: string;
  headOfHouseholdName: string;
  village: string;
  category: string;
  memberCount: number;
  vulnerableGroup: boolean;
  contactPhone?: string | null;
  parcelId?: string | null;
  surveyedBy?: string | null;
  surveyedAt?: Date | string | null;
  deceasedAt?: Date | string | null;
  successionNote?: string | null;
  entitlements: Entitlement[];
}

function entitlementTone(status: string): "pending" | "success" {
  return status === "GRANTED" ? "success" : "pending";
}

/* ── Family Detail Dialog ─────────────────────────────────────────── */

function FamilyDetailDialog({
  family,
  open,
  onClose,
}: {
  family: Family | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!family) return null;
  const granted = family.entitlements.filter((e) => e.status === "GRANTED");
  const pending = family.entitlements.filter((e) => e.status === "PENDING");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{family.headOfHouseholdName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Village</span>
              <p className="font-medium">{family.village}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Category</span>
              <p className="font-medium">
                {(FAMILY_CATEGORY_LABELS as Record<string, string>)[family.category] ?? family.category}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Household size</span>
              <p className="font-medium">{family.memberCount} members</p>
            </div>
            <div>
              <span className="text-muted-foreground">Vulnerable group</span>
              <p className="font-medium">{family.vulnerableGroup ? "Yes (SC/ST/BPL)" : "No"}</p>
            </div>
            {family.contactPhone && (
              <div>
                <span className="text-muted-foreground">Contact</span>
                <p className="font-medium">{family.contactPhone}</p>
              </div>
            )}
            {family.parcelId && (
              <div>
                <span className="text-muted-foreground">Linked parcel</span>
                <p className="font-mono text-xs">{family.parcelId}</p>
              </div>
            )}
          </div>

          {/* Succession */}
          {family.deceasedAt && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="font-semibold text-xs uppercase tracking-wide">Succession recorded</p>
              {family.successionNote && <p className="mt-1">{family.successionNote}</p>}
            </div>
          )}

          {/* Entitlements table */}
          <div>
            <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Entitlements ({granted.length} granted, {pending.length} pending)
            </p>
            {family.entitlements.length === 0 ? (
              <p className="text-muted-foreground">No entitlements registered.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {family.entitlements.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{ENTITLEMENT_LABELS[e.type]}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={toneBadgeClass(entitlementTone(e.status))}>
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {e.amount != null ? `₹${e.amount.toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Legal basis */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <p className="font-semibold">Legal basis</p>
            <p>
              RFCTLARR Act 2013, Second Schedule — entitlements for affected families
              including housing, employment, subsistence, and transportation.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Grant Form ───────────────────────────────────────────────────── */

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

/* ── New Family Form ──────────────────────────────────────────────── */

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

/* ── Succession Form ──────────────────────────────────────────────── */

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

/* ── Main Panel ───────────────────────────────────────────────────── */

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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);

  const filtered = useMemo(() => {
    return families.filter((f) => {
      const q = search.toLowerCase();
      if (
        q &&
        !f.headOfHouseholdName.toLowerCase().includes(q) &&
        !f.village.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      return true;
    });
  }, [families, search, categoryFilter]);

  const uniqueCategories = useMemo(
    () => [...new Set(families.map((f) => f.category))],
    [families]
  );

  return (
    <div className="space-y-4">
      {canManage && <NewFamilyForm projectId={projectId} />}

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or village…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {uniqueCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {(FAMILY_CATEGORY_LABELS as Record<string, string>)[c] ?? c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {families.length} families
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {families.length === 0
            ? "No affected families registered yet."
            : "No families match your search."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((family) => (
            <Card
              key={family.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setSelectedFamily(family)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {family.headOfHouseholdName}
                  <Badge variant="outline">{family.village}</Badge>
                  <Badge variant="outline">
                    {(FAMILY_CATEGORY_LABELS as Record<string, string>)[family.category] ?? family.category}
                  </Badge>
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
              <CardContent className="space-y-3" onClick={(e) => e.stopPropagation()}>
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

      <FamilyDetailDialog
        family={selectedFamily}
        open={selectedFamily !== null}
        onClose={() => setSelectedFamily(null)}
      />
    </div>
  );
}
