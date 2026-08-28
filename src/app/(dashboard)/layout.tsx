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
