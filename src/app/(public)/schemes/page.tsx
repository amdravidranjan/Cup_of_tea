import { Icon } from '@iconify/react';
import Link from 'next/link';

const schemes = [
  {
    img: 'https://images.unsplash.com/photo-1630672140970-290903ff233c?w=600&h=200&fit=crop&auto=format',
    title: 'Compensation Management',
    tamilTitle: 'இழப்பீடு மேலாண்மை',
    desc: 'Implements Sections 26–30 of RFCTLARR Act 2013: market value × rural multiplier (up to 4×) + 100% solatium + 12% p.a. interest, tracked against the 3-month statutory disbursement deadline.',
    link: '/compensation',
    icon: 'mdi:currency-inr',
  },
  {
    img: 'https://images.unsplash.com/photo-1774695474756-d1eddcd90d6e?w=600&h=200&fit=crop&auto=format',
    title: 'R&R Scheme (6-Step Workflow)',
    tamilTitle: 'மறுவாழ்வு திட்டம்',
    desc: 'End-to-end Rehabilitation & Resettlement — from Sub-Collector survey to Commissioner approval. Second Schedule entitlements (housing, grants, employment) tracked per affected household.',
    link: '/rr',
    icon: 'mdi:account-heart-outline',
  },
  {
    img: 'https://images.unsplash.com/photo-1628178693557-0269334ffbe8?w=600&h=200&fit=crop&auto=format',
    title: 'Public Transparency Portal',
    tamilTitle: 'பொது வெளிப்படைத்தன்மை',
    desc: 'No-login access to project status, Section 11/19 notifications, compensation awards, R&R progress and grievance tracking. Designed for affected citizens and civil society.',
    link: '/',
    icon: 'mdi:eye-outline',
  },
  {
    img: 'https://images.unsplash.com/photo-1649513242423-67a33a33870c?w=600&h=200&fit=crop&auto=format',
    title: 'Social Impact Assessment (SIA)',
    tamilTitle: 'சமூக தாக்க மதிப்பீடு',
    desc: 'Mandatory pre-acquisition study under Section 4(1) to assess the impact on affected families, livelihoods, environment, and community infrastructure before any notification is issued.',
    link: '/about#act',
    icon: 'mdi:account-search-outline',
  },
  {
    img: 'https://images.unsplash.com/photo-1630672140970-290903ff233c?w=600&h=200&fit=crop&auto=format',
    title: 'Gram Sabha Consent Process',
    tamilTitle: 'கிராம சபை ஒப்புதல்',
    desc: 'Section 41 mandates prior consent of Gram Sabha for PPP projects and private acquisitions. TN-GLMS tracks Gram Sabha resolutions, attendance, and consent certification.',
    link: '/about#act',
    icon: 'mdi:account-group',
  },
  {
    img: 'https://images.unsplash.com/photo-1628178693557-0269334ffbe8?w=600&h=200&fit=crop&auto=format',
    title: 'Infrastructure Development',
    tamilTitle: 'உள்கட்டமைப்பு மேம்பாடு',
    desc: 'Third Schedule infrastructure amenities — roads, drainage, schools, health centres, community halls, playgrounds — tracked per resettlement colony with completion milestones.',
    link: '/rr',
    icon: 'mdi:domain',
  },
];

export default function SchemesPage() {
  return (
    <div>
      {/* ── HERO ──────────────────────────────────── */}
      <div className="stats-band" style={{ padding: '36px 0 30px' }}>
        <div className="sec-wrap" style={{ color: '#fff' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Government Schemes &amp; Initiatives · அரசு திட்டங்கள்
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#ffc107', marginBottom: 8 }}>
            Land Acquisition Schemes &amp; Welfare Initiatives
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', maxWidth: 820, lineHeight: 1.7 }}>
            Comprehensive overview of all statutory schemes and welfare initiatives under the RFCTLARR Act 2013,
            including compensation management, rehabilitation &amp; resettlement, and infrastructure development.
          </p>
        </div>
      </div>

      {/* ── STATS ────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dee2e6' }}>
        <div className="stats-grid" style={{ background: 'none' }}>
          {[
            { n: '6', l: 'Active Schemes · திட்டங்கள்', icon: 'mdi:star-box-multiple-outline' },
            { n: '₹142Cr', l: 'Compensation Released · வெளியிடப்பட்டது', icon: 'mdi:cash-check' },
            { n: '1,240', l: 'Families Rehabilitated · குடும்பங்கள்', icon: 'mdi:home-group' },
            { n: '38', l: 'Districts Covered · மாவட்டங்கள்', icon: 'mdi:map-outline' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center', padding: '22px 16px', borderRight: '1px solid #dee2e6' }}>
              <Icon icon={s.icon} width={24} color="#0b5394" />
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0b5394', marginTop: 4 }}>{s.n}</div>
              <div style={{ fontSize: 11, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCHEME CARDS ─────────────────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:star-box-multiple-outline" width={21} color="#e56b00" />
              All Schemes &amp; Initiatives
              <span className="ta">அனைத்து திட்டங்கள்</span>
            </h2>
          </div>
          <div className="schemes-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {schemes.map(s => (
              <div key={s.title} className="scheme-card">
                <div className="scheme-img">
                  <img src={s.img} alt={s.title} />
                  <div className="scheme-img-title">
                    <Icon icon={s.icon} width={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    {s.title}
                  </div>
                </div>
                <div className="scheme-body">
                  <div style={{ fontSize: 11, color: '#e56b00', fontWeight: 600, marginBottom: 6 }}>{s.tamilTitle}</div>
                  <p>{s.desc}</p>
                  <Link href={s.link} className="know-more">
                    Learn More <Icon icon="mdi:arrow-right" width={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RELATED DOWNLOADS ────────────────────── */}
      <div className="alt-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:download-outline" width={21} color="#e56b00" />
              Related Downloads
              <span className="ta">தொடர்புடைய பதிவிறக்கங்கள்</span>
            </h2>
          </div>
          <div className="links-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="link-box">
              <div className="link-box-head"><Icon icon="mdi:file-pdf-box" width={16} />Scheme Documents</div>
              <ul>
                {[
                  'RFCTLARR Act 2013 — Full Text (PDF)',
                  'Second Schedule — R&R Entitlements',
                  'Third Schedule — Infrastructure Amenities',
                  'State R&R Policy — Tamil Nadu 2024',
                ].map(it => (
                  <li key={it}><a href="/documents"><Icon icon="mdi:file-pdf-box" width={14} color="#c0392b" />{it}</a></li>
                ))}
              </ul>
            </div>
            <div className="link-box">
              <div className="link-box-head"><Icon icon="mdi:clipboard-text-outline" width={16} />Claim Forms</div>
              <ul>
                {[
                  'R&R Entitlement Claim Form',
                  'Compensation Revision Application',
                  'Grievance Submission Form',
                  'Objection Form — Section 15/21',
                ].map(it => (
                  <li key={it}><a href="/documents"><Icon icon="mdi:file-pdf-box" width={14} color="#c0392b" />{it}</a></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
