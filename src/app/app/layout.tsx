import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { GlobalSearch } from "@/components/global-search";
import { AppNav, type AppNavItem } from "@/components/app-nav";
import { GovEmblem } from "@/components/gov-emblem";
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
  if (!session) {
    redirect("/login");
  }

  // Primary destinations sit directly on the nav bar; lower-frequency
  // oversight tools are grouped under "More" so the bar stays scannable.
  const primary: AppNavItem[] = [
    { href: "/app", label: "Dashboard", icon: "mdi:view-dashboard-outline" },
    can(session.role, "grievance:manage")
      ? { href: "/app/grievances", label: "Grievances", icon: "mdi:comment-alert-outline" }
      : null,
    // Field Verification is the on-site, mobile parcel-marking tool — only the
    // field role actually walks the alignment, so it is not advertised to a
    // Collector, who approves rather than surveys.
    session.role === "field"
      ? { href: "/app/field", label: "Field Verification", icon: "mdi:map-marker-path" }
      : null,
  ].filter((x): x is AppNavItem => x !== null);

  const moreItems: AppNavItem[] = [
    can(session.role, "project-request:review")
      ? { href: "/app/project-requests", label: "Project Requests", icon: "mdi:inbox-arrow-down-outline" }
      : null,
    can(session.role, "tender:manage")
      ? { href: "/app/contractors", label: "Contractors", icon: "mdi:account-hard-hat-outline" }
      : null,
    can(session.role, "project:view:all")
      ? { href: "/app/reports", label: "MIS Reports", icon: "mdi:chart-box-outline" }
      : null,
    can(session.role, "project:view:all")
      ? { href: "/app/workload", label: "District Workload", icon: "mdi:scale-balance" }
      : null,
    can(session.role, "conflict:review")
      ? { href: "/app/conflicts", label: "Title-Chain Conflicts", icon: "mdi:file-document-alert-outline" }
      : null,
    can(session.role, "encroachment:review")
      ? { href: "/app/encroachment", label: "Encroachment Monitoring", icon: "mdi:satellite-variant" }
      : null,
    can(session.role, "land-bank:manage")
      ? { href: "/app/land-bank", label: "Land Bank", icon: "mdi:warehouse" }
      : null,
    { href: "/app/interoperability", label: "Interoperability", icon: "mdi:api" },
    // "Developer API" deliberately omitted — it is the public, unauthenticated
    // open-data documentation page and belongs on the public site's footer,
    // not inside an officer's console.
  ].filter((x): x is AppNavItem => x !== null);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--ux-bg)]">
      {/* The console reuses the public portal's own header/nav chrome and CSS
          classes (.site-header, .main-nav, …) so the signed-in side is visibly
          the same product as the landing page rather than a separate admin
          panel that merely borrowed its colours. */}
      <header className="site-header">
        <div className="header-inner">
          <GovEmblem size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 2 }}>
              Government of Tamil Nadu &nbsp;|&nbsp; தமிழ்நாடு அரசு
            </div>
            <Link href="/app" className="portal-name-en" style={{ textDecoration: "none" }}>
              Tamil Nadu Government Land Management System
            </Link>
            <div className="portal-name-ta">தமிழ்நாடு நில மேலாண்மை அமைப்பு (TN-GLMS)</div>
            <div className="portal-dept">
              Commissionerate of Land Administration · Revenue &amp; Disaster Management Dept.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GlobalSearch />
            <div
              className="flex items-center gap-2"
              style={{ borderLeft: "1px solid #dee2e6", paddingLeft: 14 }}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[var(--ux-primary-xlt)] text-[11px] font-semibold text-[var(--ux-primary)]">
                  {initials(session.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <div className="text-[12.5px] font-semibold text-[var(--ux-text)]">
                  {session.name}
                </div>
                <div className="text-[10.5px] uppercase tracking-wide text-[var(--ux-text-muted)]">
                  {session.role}
                  {session.district ? ` · ${session.district}` : ""}
                </div>
              </div>
              <NotificationBell />
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <AppNav primary={primary} moreItems={moreItems} />

      <main id="main" className="flex-1">
        {/* px-6/py-6 specifically: the project workspace uses `-m-6` to break
            its stage header out to the full container width, and that only
            cancels cleanly against 24px padding. */}
        <div className="mx-auto w-full max-w-[1240px] px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
