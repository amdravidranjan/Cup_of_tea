import { Icon } from '@iconify/react';
import Link from 'next/link';

export default function DocumentsPage() {
  return (
    <div>
      {/* ── HERO ──────────────────────────────────── */}
      <div className="stats-band" style={{ padding: '36px 0 30px' }}>
        <div className="sec-wrap" style={{ color: '#fff' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Document Repository · ஆவண களஞ்சியம்
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#ffc107', marginBottom: 8 }}>
            Official Documents &amp; Downloads
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', maxWidth: 820, lineHeight: 1.7 }}>
            Access Section 11 preliminary notifications, Section 19 final declarations, compensation award letters,
            possession certificates, DPR reports, and SIA study documents for all land acquisition projects.
          </p>
        </div>
      </div>

      {/* ── STATS ────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dee2e6' }}>
        <div className="stats-grid" style={{ background: 'none' }}>
          {[
            { n: '156', l: 'Total Documents · மொத்த ஆவணங்கள்', icon: 'mdi:file-multiple-outline' },
            { n: '42', l: 'Section 11 · பிரிவு 11', icon: 'mdi:file-document-alert-outline' },
            { n: '28', l: 'Section 19 · பிரிவு 19', icon: 'mdi:file-sign' },
            { n: '86', l: 'Awards & Others · விருதுகள்', icon: 'mdi:file-certificate-outline' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center', padding: '22px 16px', borderRight: '1px solid #dee2e6' }}>
              <Icon icon={s.icon} width={24} color="#0b5394" />
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0b5394', marginTop: 4 }}>{s.n}</div>
              <div style={{ fontSize: 11, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DOCUMENT CATEGORIES ──────────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:folder-multiple-outline" width={21} color="#e56b00" />
              Browse by Category
              <span className="ta">வகை வாரியாக</span>
            </h2>
          </div>
          <div className="svc-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {[
              { icon: 'mdi:file-document-alert-outline', label: 'Section 11\nNotifications', bg: '#e8f0fa', ic: '#0b5394' },
              { icon: 'mdi:file-sign', label: 'Section 19\nDeclarations', bg: '#fff3e8', ic: '#e56b00' },
              { icon: 'mdi:file-certificate-outline', label: 'Award\nLetters', bg: '#e8f5ed', ic: '#1a7a3c' },
              { icon: 'mdi:home-city-outline', label: 'Possession\nCertificates', bg: '#fdecea', ic: '#c0392b' },
              { icon: 'mdi:file-chart-outline', label: 'DPR\nReports', bg: '#f3ebfa', ic: '#6f42c1' },
              { icon: 'mdi:file-search-outline', label: 'SIA Study\nReports', bg: '#fff8e1', ic: '#c9860a' },
            ].map(s => (
              <div key={s.label} className="svc-tile" style={{ cursor: 'pointer' }}>
                <div className="svc-icon" style={{ background: s.bg }}>
                  <Icon icon={s.icon} width={28} color={s.ic} />
                </div>
                <div className="svc-name" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RECENT DOCUMENTS ─────────────────────── */}
      <div className="alt-band">
        <div className="sec-wrap">
          <div className="two-col">
            <div>
              <div className="sec-head" style={{ marginBottom: 16 }}>
                <h2 className="sec-title">
                  <Icon icon="mdi:clock-outline" width={21} color="#e56b00" />
                  Recent Uploads
                  <span className="ta">சமீபத்திய பதிவேற்றங்கள்</span>
                </h2>
              </div>
              <div className="notice-box">
                <div className="notice-head">
                  <Icon icon="mdi:file-multiple" width={15} />
                  Latest Documents
                </div>
                <div className="notice-scroll">
                  {[
                    { name: 'Section 11 — Chennai Metro Phase 2 Extension', type: 'PDF', date: '02 Sep 2026', cat: 'Section 11' },
                    { name: 'SIA Report — Madurai Metro Phase 1', type: 'PDF', date: '28 Aug 2026', cat: 'SIA' },
                    { name: 'Section 19 Declaration — Ennore-Kattupalli Corridor', type: 'PDF', date: '22 Aug 2026', cat: 'Section 19' },
                    { name: 'Compensation Award — Krishnagiri Expressway', type: 'PDF', date: '18 Aug 2026', cat: 'Award' },
                    { name: 'DPR — Vellore Smart City Pipeline', type: 'PDF', date: '10 Aug 2026', cat: 'DPR' },
                    { name: 'Possession Certificate — Tuticorin Rail Link', type: 'PDF', date: '05 Aug 2026', cat: 'Possession' },
                    { name: 'Section 11 — Salem Steel Plant Phase 3', type: 'PDF', date: '01 Aug 2026', cat: 'Section 11' },
                    { name: 'R&R Scheme — Cauvery-Vaigai-Gundar Canal', type: 'PDF', date: '28 Jul 2026', cat: 'R&R' },
                  ].map((d, i) => (
                    <div key={i} className="notice-item" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Icon icon="mdi:file-pdf-box" width={16} color="#c0392b" style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <div style={{ fontSize: 12.5, color: '#3a4a5c', fontWeight: 500 }}>{d.name}</div>
                          <div style={{ fontSize: 10.5, color: '#888', marginTop: 2 }}>{d.cat} · {d.date}</div>
                        </div>
                      </div>
                      <Icon icon="mdi:download" width={16} color="#0b5394" style={{ flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Right: Forms & Templates */}
            <div>
              <div className="sec-head" style={{ marginBottom: 16 }}>
                <h2 className="sec-title">
                  <Icon icon="mdi:download-outline" width={21} color="#e56b00" />
                  Forms &amp; Templates
                  <span className="ta">படிவங்கள்</span>
                </h2>
              </div>
              <div className="link-box">
                <div className="link-box-head"><Icon icon="mdi:file-download-outline" width={16} />Official Forms</div>
                <ul>
                  {[
                    'Grievance Submission Form',
                    'R&R Entitlement Claim Form',
                    'Objection Form — Section 15',
                    'Objection Form — Section 21',
                    'Land Valuation Request Form',
                    'Compensation Revision Application',
                    'Landowner Portal User Manual',
                  ].map(it => (
                    <li key={it}><a href="/documents"><Icon icon="mdi:file-pdf-box" width={14} color="#c0392b" />{it}</a></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
