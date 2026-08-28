import { getSession } from "@/lib/auth";
import { RoleSwitcher } from "@/components/role-switcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen">
      <header className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-semibold">National Land Acquisition &amp; Management System</h1>
          <p className="text-sm text-gray-500">
            {session ? `${session.name} — ${session.role}` : "Not signed in"}
          </p>
        </div>
        <RoleSwitcher />
      </header>
      <main className="p-4">
        {session ? children : <p>Select a demo role above to continue.</p>}
      </main>
    </div>
  );
}
