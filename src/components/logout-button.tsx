"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    const res = await fetch("/api/auth/logout", { method: "POST" });
    setPending(false);
    if (!res.ok) {
      toast.error("Failed to sign out");
      return;
    }
    toast.success("Signed out");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={logout} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
