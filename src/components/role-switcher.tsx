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
