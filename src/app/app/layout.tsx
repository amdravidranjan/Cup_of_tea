import Link from "next/link";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { RoleSwitcher } from "@/components/role-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-brand bg-primary px-6 py-4 text-primary-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-primary-foreground/60 uppercase">
              Department of Land Resources
            </p>
            <h1 className="font-heading text-lg font-semibold">
              National Land Acquisition &amp; Management System
            </h1>
            {session && (
              <div className="mt-1.5 flex items-center gap-2">
                <Avatar className="h-6 w-6 ring-1 ring-primary-foreground/30">
                  <AvatarFallback className="bg-primary-foreground/10 text-[10px] text-primary-foreground">
                    {initials(session.name)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm text-primary-foreground/75">
                  {session.name} &middot; {session.role}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {session && can(session.role, "parcel:update-status") && (
              <Button variant="outline" asChild>
                <Link href="/app/field">Field Verification</Link>
              </Button>
            )}
            {session && <NotificationBell />}
            <RoleSwitcher />
          </div>
        </div>
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
