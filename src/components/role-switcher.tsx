"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_USERS = [
  { id: "u-central-1", label: "Central (DoLR)" },
  { id: "u-state-1", label: "State Govt (Odisha)" },
  { id: "u-district-1", label: "District (Koraput)" },
  { id: "u-agency-1", label: "Project Agency (NHAI)" },
  { id: "u-field-1", label: "Field Officer" },
] as const;

export function RoleSwitcher() {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function switchTo(userId: string) {
    setPendingId(userId);
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setPendingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {DEMO_USERS.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => switchTo(u.id)}
          disabled={pendingId !== null}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          {pendingId === u.id ? "Switching..." : u.label}
        </button>
      ))}
    </div>
  );
}
