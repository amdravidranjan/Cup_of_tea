# UI Foundation (shadcn/ui) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every bare-Tailwind-utility screen in the app with a real shadcn/ui component system, themed for an institutional/government tool, with toast confirmation on every mutating action.

**Architecture:** Install shadcn/ui (New York style, Zinc base) via its CLI, which generates `src/components/ui/*`. Add one shared status-tone helper (`src/lib/status-colors.ts`) so every badge/status indicator across the app uses the same four semantic colors. Restyle each existing screen in place — no route changes, no RBAC changes, no schema changes. This is a presentation-layer pass only.

**Tech Stack:** shadcn/ui (Radix primitives + Tailwind v4, already installed), `sonner` for toasts.

**Spec:** `docs/superpowers/specs/2026-08-29-ui-foundation-and-rr-workflow-design.md` (Sections 3, 5)

## Global Constraints

- Accent color: a single restrained deep blue (`blue-600`/`blue-700` range) used identically everywhere — no other accent hue anywhere in the app.
- One 8px (`rounded-lg`) corner-radius scale for buttons, cards, and inputs. No mixed radius systems.
- Semantic status colors, used identically everywhere a status appears: amber = pending/awaiting action, green = approved/paid/complete, red = rejected/overdue, blue = in-progress.
- Every mutating action (transition, upload, assess/pay compensation) fires a toast on both success and failure — no action may rely on `router.refresh()` alone to communicate its result.
- No change to routes, RBAC permission checks, or data-fetching logic in this plan. If a screen's current behavior is wrong, that is out of scope here.
- The existing test suite (65 tests as of the last commit) must still pass unchanged at the end of this plan — this plan touches no business logic.

---

### Task 1: Install shadcn/ui and core components

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `table.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `textarea.tsx`, `tabs.tsx`, `dialog.tsx`, `separator.tsx`, `progress.tsx`, `avatar.tsx`, `dropdown-menu.tsx`, `sonner.tsx`
- Modify: `package.json` (CLI adds Radix + `sonner` + `class-variance-authority` + `clsx` + `tailwind-merge` dependencies)

**Interfaces:**
- Produces: the full `src/components/ui/*` component set used by every later task in this plan. `cn()` from `src/lib/utils.ts` is the standard `clsx` + `tailwind-merge` helper every restyled component uses for conditional classes.

- [ ] **Step 1: Run the shadcn/ui init CLI**

```bash
npx shadcn@latest init -y -b zinc
```

If it prompts interactively despite the flags (framework detection, Tailwind version confirmation, or the `--force` question for React 19 peer deps), accept the detected Next.js/Tailwind v4 setup and answer yes. This creates `components.json` and `src/lib/utils.ts`, and updates `src/app/globals.css` with shadcn's CSS variable theme tokens.

- [ ] **Step 2: Verify `components.json` and `src/lib/utils.ts` exist**

```bash
cat components.json
cat src/lib/utils.ts
```

Expected: `components.json` shows `"style": "new-york"` (or the CLI's current single style) and `"baseColor": "zinc"`; `src/lib/utils.ts` exports a `cn` function.

- [ ] **Step 3: Install every core component in one command**

```bash
npx shadcn@latest add button card badge table input label select textarea tabs dialog separator progress avatar dropdown-menu sonner -y
```

- [ ] **Step 4: Verify every component file was created**

```bash
ls src/components/ui/
```

Expected: `button.tsx card.tsx badge.tsx table.tsx input.tsx label.tsx select.tsx textarea.tsx tabs.tsx dialog.tsx separator.tsx progress.tsx avatar.tsx dropdown-menu.tsx sonner.tsx` all present.

- [ ] **Step 5: Type-check and run the existing test suite (nothing should break)**

```bash
npx tsc --noEmit
npm run test
```

Expected: `tsc` clean, all 65 existing tests still pass (scaffolding only, no logic touched yet).

- [ ] **Step 6: Commit**

```bash
git add components.json src/lib/utils.ts src/components/ui package.json package-lock.json src/app/globals.css
git commit -m "chore: install shadcn/ui component foundation"
```

---

### Task 2: Theme tokens and shared status-tone helper

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/lib/status-colors.ts`
- Test: `src/lib/status-colors.test.ts`

**Interfaces:**
- Produces:
  - `type StatusTone = "pending" | "success" | "danger" | "info"`
  - `function toneBadgeClass(tone: StatusTone): string` — Tailwind classes for a `Badge` in that tone.
  - `function stageTone(stage: string): StatusTone` — maps every `Stage` value (from `src/lib/workflow.ts`) to a tone.
  - `function compensationTone(status: string): StatusTone` — maps `CompensationStatus` values to a tone.
  - Used by every later task in this plan wherever a status badge appears.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/status-colors.test.ts
import { describe, it, expect } from "vitest";
import { toneBadgeClass, stageTone, compensationTone } from "./status-colors";

describe("toneBadgeClass", () => {
  it("returns distinct classes for each tone", () => {
    const classes = new Set([
      toneBadgeClass("pending"),
      toneBadgeClass("success"),
      toneBadgeClass("danger"),
      toneBadgeClass("info"),
    ]);
    expect(classes.size).toBe(4);
  });
});

describe("stageTone", () => {
  it("marks terminal/awarded stages as success", () => {
    expect(stageTone("AWARDED")).toBe("success");
    expect(stageTone("POSSESSION")).toBe("success");
    expect(stageTone("RR_COMPLETE")).toBe("success");
  });

  it("marks pre-notification stages as pending", () => {
    expect(stageTone("DRAFT")).toBe("pending");
    expect(stageTone("SCRUTINY")).toBe("pending");
    expect(stageTone("SIA")).toBe("pending");
  });

  it("marks approval-chain stages as info", () => {
    expect(stageTone("NOTIFIED")).toBe("info");
    expect(stageTone("STATE_APPROVED")).toBe("info");
    expect(stageTone("CENTRAL_APPROVED")).toBe("info");
    expect(stageTone("DECLARED")).toBe("info");
    expect(stageTone("RR_IN_PROGRESS")).toBe("info");
  });

  it("defaults unknown stages to pending", () => {
    expect(stageTone("SOMETHING_NEW")).toBe("pending");
  });
});

describe("compensationTone", () => {
  it("marks PAID as success and ASSESSED as pending", () => {
    expect(compensationTone("PAID")).toBe("success");
    expect(compensationTone("ASSESSED")).toBe("pending");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/status-colors.test.ts`
Expected: FAIL — `Cannot find module './status-colors'`.

- [ ] **Step 3: Write `src/lib/status-colors.ts`**

```ts
export type StatusTone = "pending" | "success" | "danger" | "info";

const TONE_CLASSES: Record<StatusTone, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-green-200 bg-green-50 text-green-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

export function toneBadgeClass(tone: StatusTone): string {
  return TONE_CLASSES[tone];
}

const STAGE_TONES: Record<string, StatusTone> = {
  DRAFT: "pending",
  SCRUTINY: "pending",
  SIA: "pending",
  NOTIFIED: "info",
  STATE_APPROVED: "info",
  CENTRAL_APPROVED: "info",
  DECLARED: "info",
  AWARDED: "success",
  RR_IN_PROGRESS: "info",
  POSSESSION: "success",
  RR_COMPLETE: "success",
};

export function stageTone(stage: string): StatusTone {
  return STAGE_TONES[stage] ?? "pending";
}

const COMPENSATION_TONES: Record<string, StatusTone> = {
  ASSESSED: "pending",
  PAID: "success",
};

export function compensationTone(status: string): StatusTone {
  return COMPENSATION_TONES[status] ?? "pending";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/status-colors.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Set the accent color in `src/app/globals.css`**

Open `src/app/globals.css`. The shadcn init in Task 1 will have added `@theme inline` variables including `--color-primary` (and a `.dark` block). Find the `:root` block's `--primary` and `--primary-foreground` lines (added by shadcn's Zinc theme, currently near-black/white) and replace their values only:

```css
  --primary: oklch(0.45 0.15 255);
  --primary-foreground: oklch(0.98 0 0);
```

Leave every other token (radius, secondary, muted, destructive, etc.) exactly as the CLI generated them — the Zinc base already satisfies "one neutral base"; this is the one deliberate accent override per the design.

- [ ] **Step 6: Verify the build still compiles**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/status-colors.ts src/lib/status-colors.test.ts src/app/globals.css
git commit -m "feat: add accent color theming and shared status-tone helper"
```

---

### Task 3: Restyle the dashboard shell and role switcher

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/role-switcher.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `Avatar`/`AvatarFallback`, `DropdownMenu` family, `Button` (Task 1); `Toaster` from `src/components/ui/sonner.tsx` (Task 1)
- Produces: every later task's pages render inside this shell; `Toaster` is mounted once at the root so every later task's `toast()` calls render.

- [ ] **Step 1: Mount the `Toaster` in the root layout**

Modify `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "National Land Acquisition & Management System",
  description: "SIH PS 26016 — Dept. of Land Resources demo prototype",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/role-switcher.tsx` as a dropdown**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DEMO_USERS = [
  { id: "u-central-1", label: "Central (DoLR)" },
  { id: "u-state-1", label: "State Govt (Odisha)" },
  { id: "u-district-1", label: "District (Koraput)" },
  { id: "u-agency-1", label: "Project Agency (NHAI)" },
  { id: "u-field-1", label: "Field Officer" },
] as const;

export function RoleSwitcher() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function switchTo(userId: string, label: string) {
    setPending(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setPending(false);
    if (!res.ok) {
      toast.error("Failed to switch role");
      return;
    }
    toast.success(`Switched to ${label}`);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={pending}>
          {pending ? "Switching..." : "Switch demo role"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {DEMO_USERS.map((u) => (
          <DropdownMenuItem key={u.id} onSelect={() => switchTo(u.id, u.label)}>
            {u.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Rewrite `src/app/(dashboard)/layout.tsx`**

```tsx
import { getSession } from "@/lib/auth";
import { RoleSwitcher } from "@/components/role-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex flex-col gap-3 border-b bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold">
            National Land Acquisition &amp; Management System
          </h1>
          {session && (
            <div className="mt-1 flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">
                  {initials(session.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">
                {session.name} &middot; {session.role}
              </p>
            </div>
          )}
        </div>
        <RoleSwitcher />
      </header>
      <main className="p-6">
        {session ? (
          children
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a demo role above to continue.
          </p>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Manually verify**

```bash
netstat -ano | grep ":3000" | grep LISTENING | awk '{print $5}' | sort -u | while read pid; do taskkill //F //PID "$pid" 2>/dev/null; done
npm run dev > /tmp/nextdev-ui1.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
curl -s http://localhost:3000 -o /dev/null -w "status: %{http_code}\n"
grep -aiE "error" /tmp/nextdev-ui1.log | grep -v "Warning: Next.js ignored package-lock"
npx tsc --noEmit
```

Expected: status 200, no server errors, `tsc` clean. Then open `http://localhost:3000` in a browser: the "Switch demo role" dropdown opens and switching roles shows a success toast.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/components/role-switcher.tsx "src/app/(dashboard)/layout.tsx"
git commit -m "feat: restyle dashboard shell and role switcher with shadcn/ui"
```

---

### Task 4: Restyle the project list page

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `Table` family, `Badge` (Task 1); `stageTone`, `toneBadgeClass` (Task 2)

- [ ] **Step 1: Rewrite `src/app/(dashboard)/page.tsx`**

```tsx
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listProjects } from "@/db/projects";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { stageTone, toneBadgeClass } from "@/lib/status-colors";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const projects = await listProjects();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Projects</h2>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>District, State</TableHead>
                <TableHead>Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.district}, {p.state}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={toneBadgeClass(stageTone(p.stage))}>
                      {p.stage}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manually verify**

```bash
curl -s -c /tmp/c.txt -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"userId":"u-district-1"}' > /dev/null
curl -s -b /tmp/c.txt http://localhost:3000/ -o /tmp/dashboard.html
grep -o "Koraput River Bridge Project" /tmp/dashboard.html
npx tsc --noEmit
```

Expected: project name found in the table markup, `tsc` clean.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/page.tsx"
git commit -m "feat: restyle project list as a shadcn/ui table"
```

---

### Task 5: Restyle the project detail page shell, stage tracker, and actions

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`
- Modify: `src/components/project-actions.tsx`

**Interfaces:**
- Consumes: `Card` family, `Badge`, `Button`, `Separator` (Task 1); `stageTone`, `toneBadgeClass` (Task 2)

- [ ] **Step 1: Rewrite `src/components/project-actions.tsx` with toast feedback**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Action } from "@/lib/workflow";

export function ProjectActions({
  projectId,
  availableActions,
}: {
  projectId: string;
  availableActions: Action[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);

  async function perform(action: Action) {
    setPending(action);
    const res = await fetch(`/api/projects/${projectId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = (await res.json()) as { error?: string; stage?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Transition failed");
      return;
    }
    toast.success(`Moved to ${body.stage}`);
    router.refresh();
  }

  if (availableActions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No actions available for your role at this stage.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableActions.map((action) => (
        <Button
          key={action}
          type="button"
          variant="outline"
          onClick={() => perform(action)}
          disabled={pending !== null}
        >
          {pending === action ? "Working..." : action}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the detail page shell (stage tracker + Card sections)**

Open `src/app/(dashboard)/projects/[id]/page.tsx`. Add these imports alongside the existing ones:

```ts
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { stageTone, toneBadgeClass } from "@/lib/status-colors";
```

Replace the returned JSX's top section, stage section, actions section, and map section (everything from the opening `<div className="space-y-6">` through the closing of the "Map" `<div>`) with:

```tsx
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <p className="text-sm text-muted-foreground">{project.purpose}</p>
        <p className="text-sm text-muted-foreground">
          {project.district}, {project.state}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-wrap gap-2">
            {STAGES.map((stage, i) => (
              <li key={stage}>
                <Badge
                  variant="outline"
                  className={
                    i === currentIndex
                      ? toneBadgeClass(stageTone(stage))
                      : i < currentIndex
                        ? "border-muted-foreground/20 bg-muted text-muted-foreground"
                        : "border-dashed text-muted-foreground/60"
                  }
                >
                  {stage}
                </Badge>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectActions projectId={project.id} availableActions={availableActions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Map</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectMap alignment={alignment} parcels={parcelsWithImpact} />
          <p className="mt-2 text-xs text-muted-foreground">
            {parcelsWithImpact.filter((p) => p.withinImpact).length} of{" "}
            {parcelsWithImpact.length} parcels within the {IMPACT_BUFFER_METERS}m impact
            buffer of the project alignment.
          </p>
        </CardContent>
      </Card>
```

Leave the "Compensation", "History", and "Documents" sections below untouched here (Tasks 6-7 restyle those). Insert a `<Separator />` between each top-level `<Card>` only if the page's overall rhythm needs it — with `Card` providing its own border, an explicit `Separator` between cards is unnecessary; skip it (YAGNI).

- [ ] **Step 3: Manually verify**

```bash
curl -s -b /tmp/c.txt http://localhost:3000/projects/p-demo-bridge-1 -o /tmp/detail.html
grep -o "class=\"[^\"]*\" [^>]*>DRAFT" /tmp/detail.html | head -1
npx tsc --noEmit
npm run test
```

Expected: the DRAFT stage badge renders, `tsc` clean, full suite still passes (65 tests).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/projects/[id]/page.tsx" src/components/project-actions.tsx
git commit -m "feat: restyle project detail page shell, stage tracker, and actions"
```

---

### Task 6: Restyle documents section and upload form

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`
- Modify: `src/components/document-upload.tsx`

**Interfaces:**
- Consumes: `Table` family, `Select` family, `Input`, `Label`, `Button`, `Card` family (Task 1)

- [ ] **Step 1: Rewrite `src/components/document-upload.tsx`**

```tsx
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
```

- [ ] **Step 2: Rewrite the Documents section in the detail page**

Open `src/app/(dashboard)/projects/[id]/page.tsx`. Add these imports:

```ts
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
```

Replace the "Documents" `<div>` block (from `<h3 className="mb-2 text-sm font-medium">Documents</h3>` through its closing `</div>`) with:

```tsx
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canUpload ? (
            <DocumentUpload projectId={project.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Your role cannot upload documents.
            </p>
          )}
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground/70">No documents uploaded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <a
                        href={`/api/documents/${d.id}/download`}
                        className="font-medium hover:underline"
                      >
                        {d.fileName}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.category} v{d.version}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(d.sizeBytes / 1024).toFixed(1)} KB
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.uploadedBy} on {d.uploadedAt.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
```

- [ ] **Step 3: Manually verify**

```bash
curl -s -b /tmp/c.txt http://localhost:3000/projects/p-demo-bridge-1 -o /tmp/detail2.html
grep -o "koraput-bridge-dpr.txt" /tmp/detail2.html
npx tsc --noEmit
npm run test
```

Expected: the seeded DPR filename found, `tsc` clean, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/projects/[id]/page.tsx" src/components/document-upload.tsx
git commit -m "feat: restyle documents section and upload form"
```

---

### Task 7: Restyle compensation panel

**Files:**
- Modify: `src/components/compensation-panel.tsx`

**Interfaces:**
- Consumes: `Card`, `Input`, `Label`, `Button`, `Badge` (Task 1); `compensationTone`, `toneBadgeClass` (Task 2)

- [ ] **Step 1: Rewrite `src/components/compensation-panel.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { compensationTone, toneBadgeClass } from "@/lib/status-colors";

interface ParcelWithCompensation {
  id: string;
  village: string;
  areaHectares: number;
  compensation: { id: string; total: number; status: string } | null;
}

export function CompensationPanel({
  projectId,
  canManageRate,
  canAssess,
  datesResolved,
  currentRate,
  parcels,
}: {
  projectId: string;
  canManageRate: boolean;
  canAssess: boolean;
  datesResolved: boolean;
  currentRate: { ratePerHectare: number; multiplier: number } | null;
  parcels: ParcelWithCompensation[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function handleSetRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("rate");
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/compensation-rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ratePerHectare: Number(formData.get("ratePerHectare")),
        multiplier: Number(formData.get("multiplier")),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to set rate");
      return;
    }
    toast.success("Compensation rate updated");
    router.refresh();
  }

  async function handleAssess(event: FormEvent<HTMLFormElement>, parcelId: string) {
    event.preventDefault();
    setPending(parcelId);
    const formData = new FormData(event.currentTarget);
    const res = await fetch(`/api/parcels/${parcelId}/compensation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        assetsValue: Number(formData.get("assetsValue") ?? 0),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to assess compensation");
      return;
    }
    toast.success("Compensation assessed");
    router.refresh();
  }

  async function handlePay(compensationId: string) {
    setPending(compensationId);
    const res = await fetch(`/api/compensation/${compensationId}/pay`, { method: "POST" });
    const body = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      toast.error(body.error ?? "Failed to mark paid");
      return;
    }
    toast.success("Marked as paid");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManageRate && (
        <form onSubmit={handleSetRate} className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
          <div className="space-y-1">
            <Label htmlFor="ratePerHectare">Rate (Rs/hectare)</Label>
            <Input
              id="ratePerHectare"
              name="ratePerHectare"
              type="number"
              step="any"
              required
              defaultValue={currentRate?.ratePerHectare}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="multiplier">Multiplier</Label>
            <Input
              id="multiplier"
              name="multiplier"
              type="number"
              step="any"
              required
              defaultValue={currentRate?.multiplier ?? 1}
              className="w-24"
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending !== null}>
            {pending === "rate" ? "Saving..." : "Set current rate"}
          </Button>
        </form>
      )}

      {!currentRate && (
        <p className="text-sm text-muted-foreground">
          No compensation rate set for this district yet.
        </p>
      )}

      {currentRate && !datesResolved && (
        <p className="text-sm text-muted-foreground">
          Compensation can be assessed once the project reaches the AWARDED stage (needs both
          the SIA notification date and the award date from its own history).
        </p>
      )}

      {currentRate && parcels.length > 0 && (
        <div className="space-y-2">
          {parcels.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-3 text-sm">
                <p className="font-medium">
                  {p.village} &middot; {p.areaHectares} ha
                </p>
                {p.compensation ? (
                  <div className="mt-1 flex items-center gap-3">
                    <span>Total: Rs {p.compensation.total.toLocaleString("en-IN")}</span>
                    <Badge
                      variant="outline"
                      className={toneBadgeClass(compensationTone(p.compensation.status))}
                    >
                      {p.compensation.status}
                    </Badge>
                    {canAssess && p.compensation.status === "ASSESSED" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handlePay(p.compensation!.id)}
                        disabled={pending !== null}
                      >
                        {pending === p.compensation.id ? "Working..." : "Mark paid"}
                      </Button>
                    )}
                  </div>
                ) : (
                  canAssess &&
                  datesResolved && (
                    <form
                      onSubmit={(e) => handleAssess(e, p.id)}
                      className="mt-2 flex items-end gap-2"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">Assets value (Rs)</Label>
                        <Input
                          name="assetsValue"
                          type="number"
                          step="any"
                          defaultValue={0}
                          className="w-32 h-8"
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={pending !== null}
                      >
                        {pending === p.id ? "Assessing..." : "Assess compensation"}
                      </Button>
                    </form>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manually verify**

```bash
curl -s -b /tmp/c.txt http://localhost:3000/projects/p-demo-bridge-1 -o /tmp/detail3.html
grep -o "Set current rate" /tmp/detail3.html
npx tsc --noEmit
npm run test
```

Expected: button text found, `tsc` clean, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/compensation-panel.tsx
git commit -m "feat: restyle compensation panel with shadcn/ui"
```

---

### Task 8: Restyle map chrome

**Files:**
- Modify: `src/components/project-map.tsx`

**Interfaces:**
- Consumes: none new (styling only — map internals from `maplibre-gl` are untouched)

- [ ] **Step 1: Update the container className in `src/components/project-map.tsx`**

Find the returned JSX at the end of the file:

```tsx
  return (
    <div
      ref={containerRef}
      className="h-96 w-full rounded-md border border-gray-200"
    />
  );
```

Replace with:

```tsx
  return (
    <div
      ref={containerRef}
      className="h-96 w-full overflow-hidden rounded-lg border"
    />
  );
```

This is the only change in this file — the border radius now matches the app-wide `rounded-lg` scale and the border color follows the shadcn `border` token instead of a hardcoded gray, so the map frame stays consistent under dark mode without any other logic changing.

- [ ] **Step 2: Manually verify**

```bash
curl -s -b /tmp/c.txt http://localhost:3000/projects/p-demo-bridge-1 -o /tmp/detail4.html
grep -o "rounded-lg border\"" /tmp/detail4.html
npx tsc --noEmit
```

Expected: match found, `tsc` clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/project-map.tsx
git commit -m "style: align map frame with app-wide radius and border tokens"
```

---

### Task 9: Accessibility/UX audit pass

**Files:** none pre-determined — this task's changes depend on what the audit finds.

**Interfaces:** none new.

- [ ] **Step 1: Run the `web-design-guidelines` skill against the built UI**

With the dev server running (`npm run dev`) and logged in as `u-district-1` on `http://localhost:3000/projects/p-demo-bridge-1`, invoke the `web-design-guidelines` skill (via the Skill tool, `skill: "web-design-guidelines"`) to review the dashboard shell, project list, and project detail page for accessibility/UX compliance issues (contrast, focus states, labels, keyboard nav).

- [ ] **Step 2: Fix every issue the audit reports**

Apply fixes directly in the relevant files from Tasks 3-8. There is no fixed list here because the findings are not known until Step 1 runs — do not skip this step by treating "no findings expected" as the plan.

- [ ] **Step 3: Re-run verification**

```bash
npx tsc --noEmit
npm run test
```

Expected: clean and all tests pass after any fixes.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: address accessibility/UX findings from web-design-guidelines audit"
```

---

## What this plan does not cover

- Any new feature, route, schema change, or RBAC change — presentation layer only.
- The R&R Award workflow UI — that ships in the next plan, built with the components this plan installs.
- A public/login landing page — out of scope per the parent spec; `design-taste-frontend`-style guidance would apply there, not here.
