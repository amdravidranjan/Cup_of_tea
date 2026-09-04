import { Icon } from '@iconify/react';
import Link from 'next/link';

const rrSteps = [
  { icon: 'mdi:clipboard-search-outline', label: 'Survey &\nCensus', bg: '#e8f0fa', ic: '#0b5394', desc: 'Sub-Collector conducts door-to-door survey of affected families, records livelihood, assets, and dependents.' },
  { icon: 'mdi:file-document-edit-outline', label: 'Scheme\nDrafting', bg: '#fff3e8', ic: '#e56b00', desc: 'District prepares R&R scheme per Second Schedule entitlements: housing, subsistence, transport, employment.' },
  { icon: 'mdi:account-voice', label: 'Public\nHearing', bg: '#fdecea', ic: '#c0392b', desc: 'Mandatory public hearing for affected families to raise objections and suggest modifications to the scheme.' },
  { icon: 'mdi:send-check-outline', label: 'Submit to\nCollector', bg: '#f3ebfa', ic: '#6f42c1', desc: 'Finalised scheme submitted to District Collector for review, verification, and forwarding to Commissioner.' },
  { icon: 'mdi:check-decagram-outline', label: 'Commissioner\nApproval', bg: '#e8f5ed', ic: '#1a7a3c', desc: 'State R&R Commissioner reviews and approves the scheme. May request modifications before final approval.' },
  { icon: 'mdi:trophy-award', label: 'R&R Award\nPassed', bg: '#fff8e1', ic: '#c9860a', desc: 'Individual R&R awards issued to each affected family. Entitlements must be granted before possession.' },
];

const secondSchedule = [
  { icon: 'mdi:home-outline', label: 'Constructed House', desc: 'Minimum 50 sq.m. plinth area in resettlement colony or equivalent housing grant' },
  { icon: 'mdi:currency-inr', label: 'Subsistence Grant', desc: '₹36,000 annual allowance for 1 year for each affected family' },
  { icon: 'mdi:truck-outline', label: 'Transport Allowance', desc: '₹50,000 one-time transportation cost for shifting to resettlement colony' },
  { icon: 'mdi:briefcase-outline', label: 'Employment', desc: 'One member per family offered employment in project or ₹5 lakh one-time payment' },
  { icon: 'mdi:school-outline', label: 'Education', desc: 'Annuity for higher education of children; continuation of education facilities' },
  { icon: 'mdi:medical-bag', label: 'Healthcare', desc: 'Medical facilities and health insurance for displaced families' },
];

export default function RRPage() {
  return (
    <div>
      {/* ── HERO ──────────────────────────────────── */}
      <div className="stats-band" style={{ padding: '36px 0 30px' }}>
        <div className="sec-wrap" style={{ color: '#fff' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Rehabilitation &amp; Resettlement · மறுவாழ்வு &amp; மீள்குடியேற்றம்
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#ffc107', marginBottom: 8 }}>
            R&amp;R Scheme Status &amp; Entitlement Tracker
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', maxWidth: 820, lineHeight: 1.7 }}>
            Track the 6-step R&amp;R workflow for each land acquisition project, view Second Schedule entitlements,
            and monitor Third Schedule infrastructure amenities for resettlement colonies across Tamil Nadu.
          </p>
        </div>
      </div>

      {/* ── 6-STEP WORKFLOW ──────────────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:timeline-check-outline" width={21} color="#e56b00" />
              R&amp;R 6-Step Workflow
              <span className="ta">6 படி செயல்முறை</span>
            </h2>
          </div>
          <div className="svc-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {rrSteps.map((s, i) => (
              <div key={s.label} className="svc-tile" style={{ cursor: 'default', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 700, color: '#fff', background: '#0b5394', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                <div className="svc-icon" style={{ background: s.bg }}>
                  <Icon icon={s.icon} width={28} color={s.ic} />
                </div>
                <div className="svc-name" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
              </div>
            ))}
          </div>
          {/* Step descriptions */}
          <div style={{ marginTop: 20 }}>
            {rrSteps.map((s, i) => (
              <div key={i} className="notice-item" style={{ borderBottom: '1px solid #dee2e6' }}>
                <span style={{ fontWeight: 700, color: '#0b5394', fontSize: 12, minWidth: 18 }}>#{i + 1}</span>
                <span style={{ fontSize: 12.5, color: '#3a4a5c', lineHeight: 1.6 }}>
                  <strong>{s.label.replace('\n', ' ')}</strong> — {s.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECOND SCHEDULE ENTITLEMENTS ──────────── */}
      <div className="alt-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:format-list-checks" width={21} color="#e56b00" />
              Second Schedule — R&amp;R Entitlements
              <span className="ta">இரண்டாம் அட்டவணை — உரிமைகள்</span>
            </h2>
          </div>
          <div className="schemes-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {secondSchedule.map(s => (
              <div key={s.label} className="scheme-card">
                <div className="scheme-img" style={{ height: 70, background: 'linear-gradient(135deg, #0b5394, #1c2b3a)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Icon icon={s.icon} width={28} color="#ffc107" />
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{s.label}</span>
                </div>
                <div className="scheme-body">
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── THIRD SCHEDULE INFRASTRUCTURE ─────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:domain" width={21} color="#e56b00" />
              Third Schedule — Infrastructure Amenities
              <span className="ta">மூன்றாவது அட்டவணை — உள்கட்டமைப்பு</span>
            </h2>
          </div>
          <div className="links-grid">
            <div className="link-box">
              <div className="link-box-head"><Icon icon="mdi:road-variant" width={16} />Basic Infrastructure</div>
              <ul>
                {['Roads & Connectivity', 'Drainage & Sewerage', 'Drinking Water Supply', 'Electricity Supply', 'Street Lighting'].map(it => (
                  <li key={it}><span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', fontSize: 12.5, color: '#3a4a5c' }}>
                    <Icon icon="mdi:check-circle" width={14} color="#1a7a3c" />{it}
                  </span></li>
                ))}
              </ul>
            </div>
            <div className="link-box">
              <div className="link-box-head"><Icon icon="mdi:town-hall" width={16} />Social Infrastructure</div>
              <ul>
                {['Primary School', 'Primary Health Centre', 'Anganwadi / ICDS Centre', 'Community Centre / Hall', 'Fair Price Shop (PDS)'].map(it => (
                  <li key={it}><span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', fontSize: 12.5, color: '#3a4a5c' }}>
                    <Icon icon="mdi:check-circle" width={14} color="#1a7a3c" />{it}
                  </span></li>
                ))}
              </ul>
            </div>
            <div className="link-box">
              <div className="link-box-head"><Icon icon="mdi:tree-outline" width={16} />Amenities</div>
              <ul>
                {['Playground / Park', 'Place of Worship', 'Post Office', 'Burial / Cremation Ground', 'Grazing Land'].map(it => (
                  <li key={it}><span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', fontSize: 12.5, color: '#3a4a5c' }}>
                    <Icon icon="mdi:check-circle" width={14} color="#1a7a3c" />{it}
                  </span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
