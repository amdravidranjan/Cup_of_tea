import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getProjectsWithSLA, getPortfolioStats, getStateBreakdown } from "@/db/dashboard";
import { Badge } from "@/components/ui/badge";
import { Icon } from '@iconify/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { stageTone, toneBadgeClass, slaStatusTone } from "@/lib/status-colors";
import { DashboardStats } from "@/components/dashboard-stats";
import { NewProjectForm } from "@/components/new-project-form";
import { can } from "@/lib/rbac";
import type { SLAMetric } from "@/lib/sla";
import { projectScopeFor } from "@/lib/project-scope";

const SLA_BADGE_LABELS: Record<SLAMetric["id"], string> = {
  declaration: "Section 19 Declaration",
  compensation: "Compensation Award",
  "rr-award": "R&R Award",
  infrastructure: "Infrastructure",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const scope = projectScopeFor(session);
  const showPortfolioStats = session.role === "central" || session.role === "state";

  const summaries = await getProjectsWithSLA(scope);
  const stats = showPortfolioStats ? await getPortfolioStats(scope) : null;
  const stateBreakdown = session.role === "central" ? await getStateBreakdown() : undefined;

  const activeCount = summaries.length;
  const atRiskCount = summaries.flatMap(s => s.metrics).filter(m => m.status === 'at-risk').length;
  const breachedCount = summaries.flatMap(s => s.metrics).filter(m => m.status === 'breached').length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* 1 ── WELCOME & SYSTEM STATUS ─────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#1c2b3a] flex items-center gap-2">
            Welcome, {session.name}
            <span className="ta text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded ml-2">வரவேற்பு</span>
          </h1>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
            <Icon icon="mdi:shield-account-outline" width={16} className="text-[#0b5394]" /> 
            {session.role.toUpperCase()} 
            {session.district ? ` • ${session.district} District` : ''} 
            {session.state ? ` • ${session.state}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-[#f8fafc] p-3 rounded-md border border-gray-100">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">System Online</span>
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="text-xs text-gray-500">
            Last Sync: <strong>Just now</strong>
          </div>
        </div>
      </div>

      {/* 2 ── DASHBOARD STATS ─────────────────────────────── */}
      {stats && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0b5394] px-4 py-3 flex items-center justify-between border-b border-[#0b5394]">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Icon icon="mdi:chart-box-outline" width={20} />
              Portfolio Overview
              <span className="ta text-xs text-white/70">கண்ணோட்டம்</span>
            </h2>
            <button className="text-xs text-white/90 hover:text-white flex items-center gap-1 bg-white/10 px-2 py-1 rounded">
              <Icon icon="mdi:download" width={14} /> Export PDF
            </button>
          </div>
          <DashboardStats stats={stats} stateBreakdown={stateBreakdown} />
        </div>
      )}

      {/* 3 ── BENTO GRID: QUICK ACTIONS & ALERTS ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 bg-[#f8fafc] flex justify-between items-center">
            <h3 className="font-semibold text-[#1c2b3a] flex items-center gap-2">
              <Icon icon="mdi:flash-outline" width={18} className="text-[#e56b00]" /> Quick Actions
              <span className="ta text-xs text-gray-500">விரைவான செயல்கள்</span>
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 flex-1 content-start">
            {can(session.role, "project:create") && (
              <div className="col-span-2">
                <NewProjectForm
                  lockedState={session.role === "district" ? session.state : undefined}
                  lockedDistrict={session.role === "district" ? session.district : undefined}
                />
              </div>
            )}
            {/* These were four decorative <button>s with no onClick — they
                looked actionable and did nothing. Each is now a real link to
                the screen that performs the task, and each is gated on the
                permission that task actually requires, so a role only sees
                shortcuts it can use. */}
            {([
              can(session.role, "grievance:manage")
                ? { icon: 'mdi:comment-alert-outline', label: 'Review Grievances', c: '#c0392b', href: '/app/grievances' }
                : null,
              can(session.role, "project-request:review")
                ? { icon: 'mdi:inbox-arrow-down-outline', label: 'Project Requests', c: '#0b5394', href: '/app/project-requests' }
                : null,
              can(session.role, "project:view:all")
                ? { icon: 'mdi:chart-box-outline', label: 'MIS Reports', c: '#1a7a3c', href: '/app/reports' }
                : null,
              can(session.role, "conflict:review")
                ? { icon: 'mdi:file-document-alert-outline', label: 'Title Conflicts', c: '#c9860a', href: '/app/conflicts' }
                : null,
              can(session.role, "land-bank:manage")
                ? { icon: 'mdi:warehouse', label: 'Land Bank', c: '#4b7a8f', href: '/app/land-bank' }
                : null,
              session.role === "field"
                ? { icon: 'mdi:map-marker-path', label: 'Field Verification', c: '#c9860a', href: '/app/field' }
                : null,
            ].filter(Boolean) as { icon: string; label: string; c: string; href: string }[])
              .slice(0, 4)
              .map((a) => (
              <Link key={a.href} href={a.href} className="flex flex-col items-center justify-center p-3 border border-gray-100 rounded-md hover:bg-gray-50 hover:border-gray-200 transition-colors text-center group no-underline">
                <Icon icon={a.icon} width={24} color={a.c} className="mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-gray-700">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* SLA Alerts */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 bg-[#f8fafc] flex justify-between items-center">
            <h3 className="font-semibold text-[#1c2b3a] flex items-center gap-2">
              <Icon icon="mdi:bell-alert-outline" width={18} className="text-[#c0392b]" /> Critical SLA Alerts
              <span className="ta text-xs text-gray-500">விழிப்பூட்டல்கள்</span>
            </h3>
            <div className="flex gap-2 text-xs font-semibold">
              <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-100">{breachedCount} Breached</span>
              <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md border border-yellow-100">{atRiskCount} At Risk</span>
            </div>
          </div>
          <div className="p-0 overflow-y-auto max-h-[220px]">
            {summaries.flatMap(s => s.metrics.map(m => ({ project: s.project, metric: m })))
              .filter(x => x.metric.status === 'breached' || x.metric.status === 'at-risk')
              .slice(0, 4)
              .map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <Icon 
                    icon={alert.metric.status === 'breached' ? 'mdi:close-octagon-outline' : 'mdi:alert-outline'} 
                    width={20} 
                    className={alert.metric.status === 'breached' ? 'text-red-500' : 'text-yellow-600'} 
                    style={{ marginTop: 2 }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800">
                      <Link href={`/app/projects/${alert.project.id}`} className="hover:underline text-[#0b5394]">{alert.project.name}</Link>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {SLA_BADGE_LABELS[alert.metric.id]} deadline {alert.metric.status === 'breached' ? 'missed' : 'approaching'}.
                    </div>
                  </div>
                  <Badge variant="outline" className={toneBadgeClass(slaStatusTone(alert.metric.status))}>
                    {alert.metric.status}
                  </Badge>
                </div>
            ))}
            {breachedCount + atRiskCount === 0 && (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                <Icon icon="mdi:check-circle-outline" width={32} className="text-green-500 mb-2" />
                <p className="text-sm">No critical SLA alerts at this time.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 ── ACTIVE PROJECTS LIST ────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-[#f8fafc] flex flex-wrap gap-4 justify-between items-center">
          <h2 className="text-lg font-semibold text-[#1c2b3a] flex items-center gap-2">
            <Icon icon="mdi:format-list-bulleted" width={20} className="text-[#0b5394]" />
            Active Projects List ({activeCount})
            <span className="ta text-sm text-gray-500 font-normal">செயல்படும் திட்டங்கள்</span>
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Icon icon="mdi:magnify" width={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search projects..." className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b5394]/50 w-64" />
            </div>
            <button className="flex items-center gap-1 border border-gray-200 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 bg-white">
              <Icon icon="mdi:filter-variant" width={16} /> Filter
            </button>
          </div>
        </div>
        
        {summaries.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Icon icon="mdi:folder-open-outline" width={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm">No projects found for your jurisdiction.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Project ID / Name <span className="ta text-xs font-normal text-gray-400 block">திட்டத்தின் பெயர்</span></TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Location <span className="ta text-xs font-normal text-gray-400 block">இடம்</span></TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">Current Stage <span className="ta text-xs font-normal text-gray-400 block">தற்போதைய நிலை</span></TableHead>
                  <TableHead className="font-semibold text-gray-700 whitespace-nowrap">SLA Timelines <span className="ta text-xs font-normal text-gray-400 block">காலக்கெடு</span></TableHead>
                  <TableHead className="text-right font-semibold text-gray-700 whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map(({ project, metrics }) => (
                  <TableRow key={project.id} className="hover:bg-blue-50/30 transition-colors">
                    <TableCell className="max-w-[300px]">
                      <div className="text-[10px] font-mono text-gray-400 mb-0.5">{project.id.toUpperCase()}</div>
                      <Link
                        href={`/app/projects/${project.id}`}
                        className="font-medium text-[#0b5394] hover:underline flex items-center gap-1.5"
                      >
                        {project.name}
                        <Icon icon="mdi:open-in-new" width={12} className="text-gray-400" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      <div className="flex items-center gap-1"><Icon icon="mdi:map-marker-outline" width={14} className="text-gray-400" /> {project.district}</div>
                      <div className="text-xs text-gray-400 ml-5">{project.state}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${toneBadgeClass(stageTone(project.stage))} whitespace-nowrap shadow-sm`}>
                        {project.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                        {metrics
                          .filter((m) => m.status !== "not-applicable")
                          .map((m) => (
                            <Badge
                              key={m.id}
                              variant="outline"
                              className={`${toneBadgeClass(slaStatusTone(m.status))} text-[10px] px-1.5 py-0 shadow-sm whitespace-nowrap`}
                              title={SLA_BADGE_LABELS[m.id]}
                            >
                              {m.id === 'rr-award' ? 'R&R' : SLA_BADGE_LABELS[m.id].split(' ')[0]}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/app/projects/${project.id}`} className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-[#0b5394] hover:bg-blue-50 transition-colors">
                        <Icon icon="mdi:chevron-right" width={20} />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div>Showing {summaries.length} entries</div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-50">Prev</button>
            <button className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
