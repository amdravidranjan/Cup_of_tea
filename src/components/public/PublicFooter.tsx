import { Icon } from '@iconify/react';

export function PublicFooter() {
  return (
    <footer className="footer">
      <div className="footer-main">
        {/* About */}
        <div className="footer-col">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <svg width={52} height={52 * 1.1} viewBox="0 0 64 72" fill="none">
              <circle cx="32" cy="28" r="26" fill="#0b5394"/>
              <circle cx="32" cy="28" r="23.5" fill="none" stroke="#ffc107" strokeWidth="1.2"/>
              <circle cx="32" cy="28" r="17" fill="none" stroke="#ffc107" strokeWidth="0.8" strokeDasharray="3 2.5"/>
              <path d="M32 10 L34 17.5H41.5L35.5 21.8L37.5 29.3L32 25L26.5 29.3L28.5 21.8L22.5 17.5H30Z" fill="#ffc107"/>
              <circle cx="32" cy="28" r="4" fill="none" stroke="#ffc107" strokeWidth="1.2"/>
              <line x1="32" y1="24" x2="32" y2="11" stroke="#ffc107" strokeWidth="0.7" opacity="0.45"/>
              <text x="32" y="42" textAnchor="middle" fontSize="4.8" fill="#ffc107" fontFamily="serif" letterSpacing="0.3">सत्यमेव जयते</text>
              <rect x="10" y="47" width="44" height="1.8" fill="#138808"/>
              <rect x="10" y="49" width="44" height="15" fill="white"/>
              <rect x="10" y="64" width="44" height="1.8" fill="#FF9933"/>
              <text x="32" y="59" textAnchor="middle" fontSize="6.5" fill="#0b5394" fontFamily="Arial" fontWeight="700">TN-GLMS</text>
            </svg>
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>TN-GLMS</div>
              <div style={{ color: '#7b96b2', fontSize: 11 }}>Govt. of Tamil Nadu</div>
            </div>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.85, color: '#7b96b2', marginBottom: 12 }}>
            Content owned and maintained by the Commissionerate of Land Administration,
            Revenue & Disaster Management Dept., Government of Tamil Nadu.
            Designed, Developed & Hosted by NIC Tamil Nadu State Centre.
          </p>
          <div className="social-row">
            {[
              { icon: 'mdi:facebook', label: 'Facebook' },
              { icon: 'mdi:twitter', label: 'Twitter' },
              { icon: 'mdi:youtube', label: 'YouTube' },
              { icon: 'mdi:instagram', label: 'Instagram' },
            ].map(s => (
              <a key={s.label} href="/contact" className="social-btn" title={s.label}>
                <Icon icon={s.icon} width={15} />
              </a>
            ))}
          </div>
        </div>
        {/* Services */}
        <div className="footer-col">
          <div className="footer-head">Quick Services · சேவைகள்</div>
          <ul>
            {[
              { label: 'Project Discovery', href: '/projects' },
              { label: 'Compensation Calculator', href: '/compensation' },
              { label: 'R&R Entitlement Status', href: '/rr' },
              { label: 'Grievance Submission', href: '/grievances' },
              { label: 'Document Repository', href: '/documents' },
              { label: 'GIS Parcel Map', href: '/projects' },
            ].map(l => (
              <li key={l.label}><a href={l.href}><Icon icon="mdi:chevron-right" width={12} color="#e56b00" />{l.label}</a></li>
            ))}
          </ul>
        </div>
        {/* Help */}
        <div className="footer-col">
          <div className="footer-head">Help & Support · உதவி</div>
          <ul>
            {[
              { label: 'About the Portal', href: '/about' },
              { label: 'RFCTLARR Act 2013 Guide', href: '/about#act' },
              { label: 'FAQ', href: '/grievances' },
              { label: 'Contact Us', href: '/contact' },
              { label: 'Grievance Portal', href: '/grievances' },
              { label: 'Government Schemes', href: '/schemes' },
              { label: 'Landowner User Guide', href: '/documents' },
              { label: 'Accessibility', href: '/about' },
            ].map(l => (
              <li key={l.label}><a href={l.href}><Icon icon="mdi:chevron-right" width={12} color="#e56b00" />{l.label}</a></li>
            ))}
          </ul>
        </div>
        {/* Links */}
        <div className="footer-col">
          <div className="footer-head">Related Links · இணைப்புகள்</div>
          <ul>
            {[
              { label: 'TN Revenue Department', href: 'https://tnrd.gov.in' },
              { label: 'Bhoomi Rashi Portal', href: 'https://bhoomirashi.gov.in' },
              { label: 'Dept. of Land Resources', href: 'https://dolr.gov.in' },
              { label: 'e-District Tamil Nadu', href: 'https://edistrict.tn.gov.in' },
              { label: 'Open Govt. Data (OGD)', href: 'https://data.gov.in' },
              { label: 'NIC Tamil Nadu', href: 'https://tn.nic.in' },
              { label: 'TN State Portal', href: 'https://tn.gov.in' },
              { label: 'CLA — About Us', href: '/about' },
            ].map(l => (
              <li key={l.label}><a href={l.href} {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}><Icon icon={l.href.startsWith('http') ? 'mdi:open-in-new' : 'mdi:chevron-right'} width={11} color="#e56b00" />{l.label}</a></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <div className="footer-copy">
            © 2026 Commissionerate of Land Administration, Govt. of Tamil Nadu. All rights reserved. &nbsp;|&nbsp;
            Last Updated: 04 Sep 2026 &nbsp;|&nbsp;
            <a href="/about">Policies</a> <a href="/about">Disclaimer</a> <a href="/about">Privacy</a>
          </div>
          <div className="badge-row">
            <div className="visitor-stat">
              <span>Today: <strong>1,247</strong></span>
              <span>Total: <strong>48,32,119</strong></span>
            </div>
            {['GIGW 3.0', 'W3C HTML', 'NIC', 'UX4G'].map(b => (
              <span key={b} className="compliance-pill">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
