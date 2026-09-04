import { Icon } from '@iconify/react';

import { TrackGrievance } from '@/components/track-grievance';

export default function GrievancesPage() {
  return (
    <div>
      {/* ── HERO ──────────────────────────────────── */}
      <div className="stats-band" style={{ padding: '36px 0 30px' }}>
        <div className="sec-wrap" style={{ color: '#fff' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Grievance Redressal · குறைதீர்ப்பு
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#ffc107', marginBottom: 8 }}>
            Public Grievance Portal
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', maxWidth: 820, lineHeight: 1.7 }}>
            Affected citizens can file grievances related to land acquisition, compensation, R&amp;R entitlements,
            and possession proceedings. Track your grievance status in real-time with your tracking number.
          </p>
        </div>
      </div>

      {/* ── STATS ────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dee2e6' }}>
        <div className="stats-grid" style={{ background: 'none' }}>
          {[
            { n: '247', l: 'Total Filed · மொத்தம்', icon: 'mdi:file-document-outline' },
            { n: '189', l: 'Resolved · தீர்க்கப்பட்டது', icon: 'mdi:check-circle-outline' },
            { n: '42', l: 'In Progress · நடைபெறுகிறது', icon: 'mdi:progress-clock' },
            { n: '14 Days', l: 'Avg Resolution · சராசரி நாட்கள்', icon: 'mdi:timer-sand' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center', padding: '22px 16px', borderRight: '1px solid #dee2e6' }}>
              <Icon icon={s.icon} width={24} color="#0b5394" />
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0b5394', marginTop: 4 }}>{s.n}</div>
              <div style={{ fontSize: 11, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FILE + TRACK ─────────────────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="two-col">
            {/* Left: File Grievance */}
            <div>
              <div className="sec-head" style={{ marginBottom: 16 }}>
                <h2 className="sec-title">
                  <Icon icon="mdi:file-document-edit-outline" width={21} color="#e56b00" />
                  File a Grievance
                  <span className="ta">குறை தாக்கல் செய்</span>
                </h2>
              </div>
              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 5, padding: 20 }}>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Icon icon="mdi:office-building-marker" width={48} color="#dee2e6" style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#3a4a5c', marginBottom: 8 }}>Select a Project First</h3>
                  <p style={{ fontSize: 13, color: '#6c757d', marginBottom: 20, lineHeight: 1.6 }}>
                    To file a grievance, please navigate to your specific project from the public directory.
                  </p>
                  <a href="/projects" style={{ background: '#0b5394', color: '#fff', padding: '8px 16px', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                    View All Projects
                  </a>
                </div>
              </div>
            </div>
            {/* Right: Track Grievance */}
            <div>
              <div className="sec-head" style={{ marginBottom: 16 }}>
                <h2 className="sec-title">
                  <Icon icon="mdi:magnify" width={21} color="#e56b00" />
                  Track Your Grievance
                  <span className="ta">குறையைத் தேடு</span>
                </h2>
              </div>
              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 5, padding: 20 }}>
                <TrackGrievance />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PROCESS STEPS ────────────────────────── */}
      <div className="alt-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:timeline-check-outline" width={21} color="#e56b00" />
              Grievance Redressal Process
              <span className="ta">குறைதீர்ப்பு செயல்முறை</span>
            </h2>
          </div>
          <div className="svc-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {[
              { icon: 'mdi:file-document-edit-outline', label: 'Submit\nGrievance', bg: '#e8f0fa', ic: '#0b5394' },
              { icon: 'mdi:account-check-outline', label: 'Acknowledged\n& Assigned', bg: '#fff3e8', ic: '#e56b00' },
              { icon: 'mdi:magnify', label: 'Investigation\n& Review', bg: '#f3ebfa', ic: '#6f42c1' },
              { icon: 'mdi:message-reply-text-outline', label: 'Response\nIssued', bg: '#e8f5ed', ic: '#1a7a3c' },
              { icon: 'mdi:check-decagram-outline', label: 'Resolution\nCompleted', bg: '#fff8e1', ic: '#c9860a' },
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

      {/* ── FAQ ───────────────────────────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:frequently-asked-questions" width={21} color="#e56b00" />
              Frequently Asked Questions
              <span className="ta">அடிக்கடி கேட்கப்படும் கேள்விகள்</span>
            </h2>
          </div>
          <div className="notice-box">
            <div className="notice-head">
              <Icon icon="mdi:help-circle-outline" width={15} />
              Grievance FAQ
            </div>
            <div className="notice-scroll" style={{ height: 'auto', maxHeight: 350 }}>
              {[
                { q: 'Who can file a grievance?', a: 'Any affected landowner, tenant, labourer, or family member impacted by a land acquisition project.' },
                { q: 'What types of grievances are accepted?', a: 'Compensation disputes, R&R entitlement delays, possession irregularities, SIA process objections, and notification errors.' },
                { q: 'How long does resolution take?', a: 'The statutory target is 30 days for initial response. Complex cases involving LAR Tribunal may take longer.' },
                { q: 'Can I file anonymously?', a: 'A name and contact is required for follow-up, but your identity is protected under the Act.' },
                { q: 'What if my grievance is not resolved?', a: 'Unresolved grievances can be escalated to the District Collector, State R&R Commissioner, or LAR Tribunal under Section 64.' },
              ].map((faq, i) => (
                <div key={i} className="notice-item" style={{ flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 700, color: '#0b5394', fontSize: 12.5 }}>
                    <Icon icon="mdi:help-circle" width={13} color="#e56b00" style={{ verticalAlign: 'middle', marginRight: 5 }} />
                    {faq.q}
                  </div>
                  <div style={{ fontSize: 12, color: '#6c757d', paddingLeft: 18, lineHeight: 1.6 }}>{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
