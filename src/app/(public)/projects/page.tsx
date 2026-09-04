import { Icon } from '@iconify/react';
import { listPublicProjects, getPublicPortfolioStats } from "@/db/public";
import { PublicProjectSearch } from "@/components/public-project-search";

export default async function ProjectsPage() {
  const [projects, stats] = await Promise.all([
    listPublicProjects(),
    getPublicPortfolioStats(),
  ]);

  return (
    <div>
      {/* ── HERO ──────────────────────────────────── */}
      <div className="stats-band" style={{ padding: '36px 0 30px' }}>
        <div className="sec-wrap" style={{ color: '#fff' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Land Acquisition Projects · நில எடுப்பு திட்டங்கள்
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#ffc107', marginBottom: 8 }}>
            Public Projects Directory
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', maxWidth: 820, lineHeight: 1.7 }}>
            Search and track all active and completed land acquisition projects across Tamil Nadu. View Section 11/19 notifications, compensation awards, R&amp;R status, and possession details for each project.
          </p>
        </div>
      </div>

      {/* ── STATS ────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dee2e6' }}>
        <div className="stats-grid" style={{ background: 'none' }}>
          {[
            { n: stats.projectCount.toString(), l: 'Active Projects · செயலில்', icon: 'mdi:map-outline' },
            { n: stats.totalAreaHectares.toFixed(1), l: 'Total Area (Ha) · பரப்பு', icon: 'mdi:home-group' },
            { n: `₹${(stats.compensationTotal / 10000000).toFixed(2)}Cr`, l: 'Compensation · இழப்பீடு', icon: 'mdi:currency-inr' },
            { n: '98%', l: 'SLA Compliance · இணக்கம்', icon: 'mdi:clipboard-check-outline' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center', padding: '22px 16px', borderRight: '1px solid #dee2e6' }}>
              <Icon icon={s.icon} width={24} color="#0b5394" />
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0b5394', marginTop: 4 }}>{s.n}</div>
              <div style={{ fontSize: 11, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROJECTS DIRECTORY ────────────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="sec-head" style={{ marginBottom: 16 }}>
            <h2 className="sec-title">
              <Icon icon="mdi:office-building-marker" width={21} color="#e56b00" />
              Project Search &amp; Discovery
              <span className="ta">திட்ட தேடல்</span>
            </h2>
          </div>
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 5, padding: 20 }}>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notified projects yet.</p>
            ) : (
              <PublicProjectSearch projects={projects} />
            )}
          </div>
        </div>
      </div>

      {/* ── PROJECT STAGES ────────────────────────── */}
      <div className="alt-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:timeline-check-outline" width={21} color="#e56b00" />
              Land Acquisition Lifecycle
              <span className="ta">நில எடுப்பு வாழ்க்கை சுழற்சி</span>
            </h2>
          </div>
          <div className="svc-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {[
              { icon: 'mdi:file-document-alert-outline', label: 'Section 11\nNotification', bg: '#e8f0fa', ic: '#0b5394' },
              { icon: 'mdi:file-sign', label: 'Section 19\nDeclaration', bg: '#fff3e8', ic: '#e56b00' },
              { icon: 'mdi:currency-inr', label: 'Compensation\nAward', bg: '#e8f5ed', ic: '#1a7a3c' },
              { icon: 'mdi:account-heart-outline', label: 'R&R\nEntitlements', bg: '#fdecea', ic: '#c0392b' },
              { icon: 'mdi:home-city-outline', label: 'Final\nPossession', bg: '#f3ebfa', ic: '#6f42c1' },
              { icon: 'mdi:check-decagram-outline', label: 'Project\nHandover', bg: '#fff8e1', ic: '#c9860a' },
            ].map((s, i) => (
              <div key={s.label} className="svc-tile" style={{ cursor: 'default', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 700, color: '#fff', background: '#0b5394', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                <div className="svc-icon" style={{ background: s.bg }}>
                  <Icon icon={s.icon} width={28} color={s.ic} />
                </div>
                <div className="svc-name" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
