import Link from "next/link";
import { Icon } from '@iconify/react';
import {
  listPublicProjects,
  getPublicPortfolioStats,
  listPublicNotices,
} from "@/db/public";
import { PublicProjectSearch } from "@/components/public-project-search";
import { formatDate } from "@/lib/format";
import { HeroCarousel } from "@/components/public/HeroCarousel";
import { Gallery } from "@/components/public/Gallery";

const tickers = [
  { text: 'Section 11 Preliminary Notification for Chennai Metro Phase 2 published — Objection window open until 20 Oct 2026', href: '/documents' },
  { text: 'Compensation disbursement deadline alert: Krishnagiri Expressway award passed — 3-month payment window in effect', href: '/compensation' },
  { text: 'RFCTLARR Act 2013 — Section 19 Final Declaration must follow Section 11 within 12 months or the notification lapses', href: '/about#act' },
];

const services = [
  { icon: 'mdi:map-marker-radius-outline',  label: 'Project\nDiscovery',         bg: '#e8f0fa', ic: '#0b5394', href: '/projects' },
  { icon: 'mdi:currency-inr',               label: 'Compensation\nCalculator',    bg: '#e8f5ed', ic: '#1a7a3c', href: '/compensation' },
  { icon: 'mdi:home-group',                 label: 'R&R\nEntitlement Status',    bg: '#fff3e8', ic: '#e56b00', href: '/rr' },
  { icon: 'mdi:account-voice',              label: 'Grievance\nSubmission',       bg: '#fdecea', ic: '#c0392b', href: '/grievances' },
  { icon: 'mdi:file-document-multiple-outline', label: 'Document\nRepository',   bg: '#f3ebfa', ic: '#6f42c1', href: '/documents' },
  { icon: 'mdi:map-search-outline',         label: 'GIS Parcel\nMap',            bg: '#fff8e1', ic: '#c9860a', href: '/projects' },
  { icon: 'mdi:cellphone-check',            label: 'Field\nVerification',        bg: '#e0f5f1', ic: '#00796b', href: '/track' },
  { icon: 'mdi:clipboard-list-outline',     label: 'SLA / Stage\nTracker',       bg: '#e3ecfa', ic: '#1565c0', href: '/projects' },
];

const schemes = [
  {
    img: 'https://images.unsplash.com/photo-1630672140970-290903ff233c?w=600&h=200&fit=crop&auto=format',
    title: 'Compensation Management',
    desc: 'Implements Sections 26–30 of RFCTLARR Act 2013: market value × rural multiplier (up to 4×) + 100% solatium + 12% p.a. interest, tracked against the 3-month disbursement deadline.',
    href: '/compensation',
  },
  {
    img: 'https://images.unsplash.com/photo-1774695474756-d1eddcd90d6e?w=600&h=200&fit=crop&auto=format',
    title: 'R&R Scheme (6-Step Workflow)',
    desc: 'End-to-end Rehabilitation & Resettlement — from Sub-Collector survey to Commissioner approval. Second Schedule entitlements (housing, grants, employment) tracked per affected household.',
    href: '/rr',
  },
  {
    img: 'https://images.unsplash.com/photo-1628178693557-0269334ffbe8?w=600&h=200&fit=crop&auto=format',
    title: 'Public Transparency Portal',
    desc: 'No-login access to project status, Section 11/19 notifications, compensation awards, R&R progress and grievance tracking. Designed for affected citizens and civil society.',
    href: '/about',
  },
];

export default async function PublicLandingPage() {
  const [projects, stats, notices] = await Promise.all([
    listPublicProjects(),
    getPublicPortfolioStats(),
    listPublicNotices(),
  ]);

  return (
    <div>
      {/* 4 ── TICKER ────────────────────────────────────────── */}
      <div className="ticker-wrap">
        <div className="ticker-label">
          <Icon icon="mdi:bullhorn-outline" width={13} />
          அறிவிப்பு | Latest
        </div>
        <div className="ticker-track">
          <span className="ticker-inner">
            {tickers.map((t, i) => (
              <span key={i}>
                <span className="ticker-dot">◆</span>
                <a href={t.href}>{t.text}</a>
                {'   '}
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* 5 ── HERO ──────────────────────────────────────────── */}
      <HeroCarousel />

      {/* 6 ── SERVICES ──────────────────────────────────── */}
      <div className="services-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:account-group-outline" width={21} color="#e56b00" />
              Citizen Services
              <span className="ta">நாகரிக சேவைகள்</span>
            </h2>
            <a href="/schemes" className="view-all-link">
              View All Services <Icon icon="mdi:arrow-right" width={14} />
            </a>
          </div>
          <div className="svc-grid">
            {services.map(s => (
              <a key={s.label} href={s.href} className="svc-tile">
                <div className="svc-icon" style={{ background: s.bg }}>
                  <Icon icon={s.icon} width={28} color={s.ic} />
                </div>
                <div className="svc-name" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 7 ── STATS ─────────────────────────────────────── */}
      <div className="stats-band">
        <div className="stats-grid">
          {[
            { n: stats.projectCount.toString(),     l: 'Active Projects',         icon: 'mdi:map-outline' },
            { n: stats.totalAreaHectares.toFixed(1), l: 'Total Area (Ha)',       icon: 'mdi:home-group' },
            { n: `₹${(stats.compensationTotal / 10000000).toFixed(2)}Cr`, l: 'Compensation Approved', icon: 'mdi:currency-inr' },
            { n: '98%',                              l: 'SLA Compliance Rate',    icon: 'mdi:clipboard-check-outline' },
          ].map(s => (
            <div key={s.l} className="stat-item">
              <Icon icon={s.icon} width={28} color="rgba(255,255,255,0.3)" />
              <div className="stat-num">{s.n}</div>
              <div className="stat-lbl">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 8 ── NEWS + NOTICES ────────────────────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="two-col">
            {/* Left: Projects List */}
            <div>
              <div className="sec-head" style={{ marginBottom: 16 }}>
                <h2 className="sec-title">
                  <Icon icon="mdi:newspaper-variant-outline" width={21} color="#e56b00" />
                  Notified Projects
                  <span className="ta">திட்டங்கள்</span>
                </h2>
                <a href="/projects" className="view-all-link">View All <Icon icon="mdi:arrow-right" width={14} /></a>
              </div>
              <div style={{ marginTop: '1rem' }}>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notified projects yet.</p>
                ) : (
                  <PublicProjectSearch projects={projects} />
                )}
              </div>
            </div>
            
            {/* Right: Notice board */}
            <div>
              <h2 className="sec-title" style={{ marginBottom: 14 }}>
                <Icon icon="mdi:clipboard-text-outline" width={21} color="#e56b00" />
                Notice Board
                <span className="ta">அறிவிப்பு</span>
              </h2>
              <div className="notice-box">
                <div className="notice-head">
                  <Icon icon="mdi:bell-ring-outline" width={15} />
                  What's New
                </div>
                <div className="notice-scroll">
                  {notices.length === 0 ? (
                    <div className="notice-item">No notices yet.</div>
                  ) : (
                    notices.map((n) => (
                      <div key={n.id} className="notice-item">
                        <Icon icon="mdi:chevron-right-circle" width={14} color="#e56b00" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>
                          <Link href={`/projects/${n.projectId}`} style={{ color: 'var(--ux-link)' }}>
                            {n.projectName} — {n.label}
                          </Link>
                          <div style={{ fontSize: '11px', color: '#888', marginTop: 2 }}>{formatDate(n.occurredAt)}</div>
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ padding: '8px 14px', borderTop: '1px solid #dee2e6' }}>
                  <a href="/documents" className="view-all-link">View All Notices <Icon icon="mdi:arrow-right" width={13} /></a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 9 ── SCHEMES ───────────────────────────────────── */}
      <div className="alt-band">
        <div className="sec-wrap">
          <div className="sec-head" style={{ marginBottom: 20 }}>
            <h2 className="sec-title">
              <Icon icon="mdi:star-box-multiple-outline" width={21} color="#e56b00" />
              Government Schemes & Initiatives
              <span className="ta">அரசு திட்டங்கள்</span>
            </h2>
            <a href="/schemes" className="view-all-link">View All <Icon icon="mdi:arrow-right" width={14} /></a>
          </div>
          <div className="schemes-grid">
            {schemes.map(s => (
              <div key={s.title} className="scheme-card">
                <div className="scheme-img">
                  <img src={s.img} alt={s.title} />
                  <div className="scheme-img-title">{s.title}</div>
                </div>
                <div className="scheme-body">
                  <p>{s.desc}</p>
                  <a href={s.href} className="know-more">Know More <Icon icon="mdi:arrow-right" width={13} /></a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 10 ── GALLERY ──────────────────────────────────── */}
      <Gallery />

      {/* 11 ── IMPORTANT LINKS ──────────────────────────── */}
      <div className="alt-band">
        <div className="sec-wrap">
          <h2 className="sec-title" style={{ marginBottom: 20 }}>
            <Icon icon="mdi:link-variant" width={21} color="#e56b00" />
            Important Links & Downloads
            <span className="ta">முக்கிய இணைப்புகள்</span>
          </h2>
          <div className="links-grid">
            <div className="link-box">
              <div className="link-box-head"><Icon icon="mdi:download-outline" width={16} />Downloads / Official Documents</div>
              <ul>
                {[
                  { label: 'RFCTLARR Act 2013 — Full Text (PDF)', href: '/documents' },
                  { label: 'Grievance Submission Form', href: '/documents' },
                  { label: 'R&R Entitlement Claim Form', href: '/documents' },
                  { label: 'Objection Form — Section 15/21', href: '/documents' },
                  { label: 'Landowner Portal User Manual', href: '/documents' },
                  { label: 'CLA Annual Report 2025-26', href: '/documents' },
                ].map(l => (
                  <li key={l.label}><a href={l.href}><Icon icon="mdi:file-pdf-box" width={14} color="#c0392b" />{l.label}</a></li>
                ))}
              </ul>
            </div>
            <div className="link-box">
              <div className="link-box-head"><Icon icon="mdi:web" width={16} />Related Portals</div>
              <ul>
                {[
                  { label: 'Bhoomi Rashi Portal — MoRTH', href: 'https://bhoomirashi.gov.in' },
                  { label: 'Dept. of Land Resources (DoLR)', href: 'https://dolr.gov.in' },
                  { label: 'TN Revenue Department', href: 'https://tnrd.gov.in' },
                  { label: 'e-District Tamil Nadu', href: 'https://edistrict.tn.gov.in' },
                  { label: 'Open Government Data (OGD)', href: 'https://data.gov.in' },
                  { label: 'NIC Tamil Nadu', href: 'https://tn.nic.in' },
                ].map(l => (
                  <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer"><Icon icon="mdi:open-in-new" width={14} color="#0b5394" />{l.label}</a></li>
                ))}
              </ul>
            </div>
            <div className="link-box">
              <div className="link-box-head"><Icon icon="mdi:cellphone" width={16} />Mobile App & Contact</div>
              <ul style={{ padding: '14px 0 0' }}>
                <li style={{ padding: '0 14px 12px', borderBottom: '1px solid #dee2e6' }}>
                  <div style={{ fontSize: 13, color: '#3a4a5c', marginBottom: 10, lineHeight: 1.6 }}>
                    <strong>TN-GLMS Mobile App</strong><br />
                    <span style={{ fontSize: 12, color: '#6c757d' }}>Access land records, track applications and receive alerts on mobile.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 9 }}>
                    <a href="/contact" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0b5394', color: '#fff', padding: '7px 12px', borderRadius: 3, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                      <Icon icon="mdi:google-play" width={15} />Play Store
                    </a>
                    <a href="/contact" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1c2b3a', color: '#fff', padding: '7px 12px', borderRadius: 3, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                      <Icon icon="mdi:apple" width={15} />App Store
                    </a>
                  </div>
                </li>
                <li style={{ padding: '12px 14px', borderBottom: 'none' }}>
                  <div style={{ fontSize: 12.5, color: '#3a4a5c', lineHeight: 2 }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}><Icon icon="mdi:phone-outline" width={13} color="#0b5394" /><strong>1800-425-5500</strong> (Toll Free)</div>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}><Icon icon="mdi:whatsapp" width={13} color="#25d366" /><strong>94440-00001</strong> (WhatsApp)</div>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}><Icon icon="mdi:email-outline" width={13} color="#0b5394" />helpdesk@tnglms.gov.in</div>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}><Icon icon="mdi:map-marker-outline" width={13} color="#0b5394" style={{ marginTop: 3 }} />Chepauk, Chennai — 600 005</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
