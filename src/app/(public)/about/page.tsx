import { Icon } from '@iconify/react';
import Link from 'next/link';
import { listPublicProjects, getPublicPortfolioStats } from '@/db/public';

export default async function AboutPage() {
  const stats = await getPublicPortfolioStats();

  return (
    <div>
      {/* ── HERO BANNER ──────────────────────────────── */}
      <div className="stats-band" style={{ padding: '40px 0 36px' }}>
        <div className="sec-wrap" style={{ color: '#fff' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            About the Portal · போர்ட்டல் பற்றி
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#ffc107', marginBottom: 8 }}>
            Tamil Nadu Government Land Management System
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', maxWidth: 820, lineHeight: 1.7 }}>
            TN-GLMS is the unified digital platform for managing the entire lifecycle of land acquisition under the RFCTLARR Act 2013
            — from preliminary notification to final possession — ensuring transparency, accountability, and timely compensation for affected families across Tamil Nadu.
          </p>
        </div>
      </div>

      {/* ── STATS ────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dee2e6' }}>
        <div className="stats-grid" style={{ background: 'none' }}>
          {[
            { n: '2013', l: 'Act Enacted', icon: 'mdi:gavel' },
            { n: '38', l: 'Districts Covered', icon: 'mdi:map-outline' },
            { n: stats.projectCount.toString(), l: 'Active Projects', icon: 'mdi:folder-open-outline' },
            { n: '5', l: 'Officer Tiers', icon: 'mdi:account-group-outline' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center', padding: '22px 16px', borderRight: '1px solid #dee2e6' }}>
              <Icon icon={s.icon} width={24} color="#0b5394" />
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0b5394', marginTop: 4 }}>{s.n}</div>
              <div style={{ fontSize: 11, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MISSION ──────────────────────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:target" width={21} color="#e56b00" />
              Mission &amp; Objectives
              <span className="ta">நோக்கம் &amp; குறிக்கோள்கள்</span>
            </h2>
          </div>
          <div className="two-col">
            <div>
              <div style={{ fontSize: 13.5, color: '#3a4a5c', lineHeight: 1.85 }}>
                <p style={{ marginBottom: 14 }}>
                  The Commissionerate of Land Administration (CLA), under the Revenue &amp; Disaster Management Department,
                  Government of Tamil Nadu, is the nodal authority for all land acquisition proceedings in the state.
                  TN-GLMS digitises every step mandated by the <strong>Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013</strong> (RFCTLARR Act).
                </p>
                <p style={{ marginBottom: 14 }}>
                  The platform ensures that <strong>Section 11 preliminary notifications</strong> are published transparently,
                  <strong> Section 19 declarations</strong> are tracked against the statutory 12-month deadline,
                  <strong> compensation awards</strong> are computed per Sections 26–30 with the correct multiplier and solatium,
                  and <strong>R&amp;R entitlements</strong> under the Second and Third Schedules are granted to every affected family.
                </p>
              </div>
            </div>
            <div>
              <div className="notice-box">
                <div className="notice-head">
                  <Icon icon="mdi:shield-check-outline" width={15} />
                  Key Guarantees
                </div>
                <div className="notice-scroll" style={{ height: 'auto', maxHeight: 280 }}>
                  {[
                    'Market value × rural multiplier (up to 4×)',
                    '100% solatium on market value',
                    '12% p.a. interest from notification to award',
                    'Mandatory Social Impact Assessment',
                    'Gram Sabha consent for PPP / private projects',
                    'R&R entitlements before possession',
                    '3-month compensation disbursement deadline',
                    '12-month declaration deadline (Section 19)',
                  ].map((g, i) => (
                    <div key={i} className="notice-item">
                      <Icon icon="mdi:check-circle" width={14} color="#1a7a3c" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RFCTLARR ACT 2013 ────────────────────── */}
      <div className="alt-band" id="act">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:book-open-page-variant-outline" width={21} color="#e56b00" />
              RFCTLARR Act 2013 — Key Sections
              <span className="ta">சட்டத்தின் முக்கிய பிரிவுகள்</span>
            </h2>
          </div>
          <div className="svc-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { icon: 'mdi:file-document-alert-outline', label: 'Section 11\nPreliminary\nNotification', bg: '#e8f0fa', ic: '#0b5394' },
              { icon: 'mdi:file-sign', label: 'Section 19\nFinal\nDeclaration', bg: '#fff3e8', ic: '#e56b00' },
              { icon: 'mdi:calculator-variant-outline', label: 'Sections 26–30\nCompensation\nDetermination', bg: '#e8f5ed', ic: '#1a7a3c' },
              { icon: 'mdi:account-heart-outline', label: 'Second Schedule\nR&R\nEntitlements', bg: '#fdecea', ic: '#c0392b' },
              { icon: 'mdi:domain', label: 'Third Schedule\nInfrastructure\nAmenities', bg: '#f3ebfa', ic: '#6f42c1' },
              { icon: 'mdi:account-voice', label: 'Section 4(1)\nSocial Impact\nAssessment', bg: '#fff8e1', ic: '#c9860a' },
              { icon: 'mdi:account-group', label: 'Section 41\nGram Sabha\nConsent', bg: '#e0f5f1', ic: '#00796b' },
              { icon: 'mdi:gavel', label: 'Section 64\nLAR Tribunal\n& Disputes', bg: '#e3ecfa', ic: '#1565c0' },
            ].map(s => (
              <div key={s.label} className="svc-tile" style={{ cursor: 'default' }}>
                <div className="svc-icon" style={{ background: s.bg }}>
                  <Icon icon={s.icon} width={28} color={s.ic} />
                </div>
                <div className="svc-name" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ORGANISATIONAL STRUCTURE ──────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:sitemap-outline" width={21} color="#e56b00" />
              Organisational Hierarchy
              <span className="ta">அமைப்பு கட்டமைப்பு</span>
            </h2>
          </div>
          <div className="links-grid">
            {[
              {
                head: 'Central Government',
                icon: 'mdi:bank-outline',
                items: ['Ministry of Rural Development', 'Dept. of Land Resources (DoLR)', 'RFCTLARR Act 2013 Administrator', 'National Monitoring Committee'],
              },
              {
                head: 'State Government (Tamil Nadu)',
                icon: 'mdi:office-building-outline',
                items: ['Commissioner of Land Administration', 'Revenue & Disaster Mgmt Dept.', 'State R&R Commissioner', 'State Expert Appraisal Committee'],
              },
              {
                head: 'District Administration',
                icon: 'mdi:badge-account-horizontal-outline',
                items: ['District Collector (LAO)', 'Sub-Collector (Additional LAO)', 'Tahsildar (Field Officer)', 'Village Administrative Officer'],
              },
            ].map(col => (
              <div key={col.head} className="link-box">
                <div className="link-box-head"><Icon icon={col.icon} width={16} />{col.head}</div>
                <ul>
                  {col.items.map(it => (
                    <li key={it}><span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', fontSize: 12.5, color: '#3a4a5c' }}>
                      <Icon icon="mdi:chevron-right" width={12} color="#e56b00" />{it}
                    </span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ANNUAL REPORTS & TENDERS ─────────────── */}
      <div className="alt-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:file-chart-outline" width={21} color="#e56b00" />
              Annual Reports &amp; Tender Notices
              <span className="ta">ஆண்டு அறிக்கைகள்</span>
            </h2>
          </div>
          <div className="links-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="link-box">
              <div className="link-box-head"><Icon icon="mdi:file-pdf-box" width={16} />Annual Reports</div>
              <ul>
                {['CLA Annual Report 2025-26', 'CLA Annual Report 2024-25', 'CLA Annual Report 2023-24', 'Land Acquisition Statistics — 5-Year Summary'].map(it => (
                  <li key={it}><a href="/documents"><Icon icon="mdi:file-pdf-box" width={14} color="#c0392b" />{it}</a></li>
                ))}
              </ul>
            </div>
            <div className="link-box">
              <div className="link-box-head"><Icon icon="mdi:clipboard-text-clock-outline" width={16} />Tender Notices</div>
              <ul>
                {[
                  'Tender: GIS Survey — Krishnagiri District (Closes 15 Oct 2026)',
                  'Tender: SIA Consultant — Madurai Metro Phase 1',
                  'Tender: R&R Colony Construction — Sivaganga',
                  'Tender: DGPS Equipment Supply — CLA HQ Chennai',
                ].map(it => (
                  <li key={it}><a href="/documents"><Icon icon="mdi:clipboard-text-clock-outline" width={14} color="#e56b00" />{it}</a></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
