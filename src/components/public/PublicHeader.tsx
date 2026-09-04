'use client';
import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';

export function PublicHeader() {
  const [fs, setFs] = useState(14);
  const [hc, setHc] = useState(false);

  useEffect(() => {
    document.body.style.fontSize = `${fs}px`;
    document.body.classList.toggle('high-contrast', hc);
  }, [fs, hc]);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'About Us', items: [
      { label: 'About TN-GLMS', href: '/about' },
      { label: 'Commissionerate of Land Administration', href: '/about' },
      { label: 'RFCTLARR Act 2013', href: '/about#act' },
      { label: 'Organisational Structure', href: '/about' },
      { label: 'Annual Reports', href: '/documents' },
      { label: 'Tender Notices', href: '/about' },
    ]},
    { label: 'Projects', items: [
      { label: 'View All Projects', href: '/projects' },
      { label: 'Section 11 Notifications', href: '/documents' },
      { label: 'Section 19 Declarations', href: '/documents' },
      { label: 'Award & Possession Status', href: '/projects' },
      { label: 'GIS Parcel Map', href: '/projects' },
    ]},
    { label: 'Compensation', items: [
      { label: 'Compensation Calculator', href: '/compensation' },
      { label: 'Disbursement Status', href: '/compensation' },
      { label: 'Solatium & Interest', href: '/compensation' },
      { label: 'Award Letters (Download)', href: '/documents' },
      { label: 'PFMS Payment Trail', href: '/compensation' },
    ]},
    { label: 'R&R', items: [
      { label: 'R&R Scheme Status', href: '/rr' },
      { label: 'Entitlement Tracker', href: '/rr' },
      { label: 'Second Schedule Benefits', href: '/rr' },
      { label: 'Third Schedule Infrastructure', href: '/rr' },
      { label: 'Resettlement Colonies', href: '/rr' },
    ]},
    { label: 'Grievances', href: '/grievances' },
    { label: 'Documents', items: [
      { label: 'Section 11 Notifications (PDF)', href: '/documents' },
      { label: 'Section 19 Declarations (PDF)', href: '/documents' },
      { label: 'Award Letters', href: '/documents' },
      { label: 'Possession Certificates', href: '/documents' },
      { label: 'DPR Repository', href: '/documents' },
      { label: 'SIA Reports', href: '/documents' },
    ]},
    { label: 'Resources', items: [
      { label: 'RFCTLARR Act 2013 — Full Text', href: '/about#act' },
      { label: 'Bhoomi Rashi Portal (MoRTH)', href: 'https://bhoomirashi.gov.in', external: true },
      { label: 'TN Revenue Department', href: 'https://tnrd.gov.in', external: true },
      { label: 'Dept. of Land Resources (DoLR)', href: 'https://dolr.gov.in', external: true },
      { label: 'CLA — About Us', href: '/about' },
    ]},
    { label: 'Contact Us', href: '/contact' },
  ];

  return (
    <>
      <div className="access-bar">
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
            <a href="#main">Skip to Main Content</a><span className="sep">|</span>
            <a href="/about">Screen Reader</a><span className="sep">|</span>
            <a href="/about">Sitemap</a><span className="sep">|</span>
            <a href="/about">RTI</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: '#607d8b', fontSize: 11 }}>Text Size:</span>
            {[12, 14, 16].map((size, i) => (
              <button key={size} className={`a-font-btn ${fs === size ? 'active' : ''}`} style={{ fontSize: [10, 12, 14][i] }} onClick={() => setFs(size)}>
                {['A-', 'A', 'A+'][i]}
              </button>
            ))}
            <span className="sep">|</span>
            <button className={`a-contrast-btn ${hc ? 'on' : ''}`} onClick={() => setHc(c => !c)}>High Contrast</button>
            <span className="sep">|</span>
            <span style={{ color: '#607d8b', fontSize: 11 }}>தமிழ் | English</span>
          </div>
        </div>
      </div>

      <header className="site-header">
        <div className="header-inner">
          <svg width={64} height={64 * 1.1} viewBox="0 0 64 72" fill="none">
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 2 }}>
              Government of Tamil Nadu &nbsp;|&nbsp; தமிழ்நாடு அரசு
            </div>
            <div className="portal-name-en">Tamil Nadu Government Land Management System</div>
            <div className="portal-name-ta">தமிழ்நாடு நில மேலாண்மை அமைப்பு (TN-GLMS)</div>
            <div className="portal-dept">Commissionerate of Land Administration · Revenue & Disaster Management Dept.</div>
          </div>
          <div style={{ borderLeft: '1px solid #dee2e6', paddingLeft: 16, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon icon="mdi:phone-outline" width={15} color="#0b5394" />
              <div>
                <div style={{ fontWeight: 700, color: '#0b5394', fontSize: 13.5 }}>1800-425-5500</div>
                <div style={{ fontSize: 10.5, color: '#6c757d' }}>Toll Free · Mon–Sat 9AM–6PM</div>
              </div>
            </div>
          </div>
          <form onSubmit={e => e.preventDefault()}>
            <div className="hdr-search">
              <input type="search" placeholder="Search land records…" aria-label="Search" />
              <button type="submit" aria-label="Search"><Icon icon="mdi:magnify" width={17} /></button>
            </div>
          </form>
        </div>
      </header>

      <nav className="main-nav" role="navigation" aria-label="Main navigation">
        <div className="nav-inner" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 16px' }}>
          {navLinks.map(link => (
            <div key={link.label} className={`nav-item ${link.label === 'Home' ? 'active' : ''}`} style={{ position: 'relative' }}>
              {link.href ? (
                <Link href={link.href} style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {link.label === 'Home' && <Icon icon="mdi:home-outline" width={15} />}
                  {link.label}
                </Link>
              ) : (
                <>
                  {link.label === 'Home' && <Icon icon="mdi:home-outline" width={15} />}
                  {link.label}
                  {link.items && <Icon icon="mdi:chevron-down" width={14} />}
                </>
              )}
              {link.items && (
                <div className="dropdown-panel">
                  {link.items.map(it => (
                    <a key={it.label} href={it.href} {...(it.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
                      <Icon icon={it.external ? 'mdi:open-in-new' : 'mdi:chevron-right'} width={12} color="#e56b00" />
                      {it.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link href="/login" className="nav-item nav-login">
            <Icon icon="mdi:login" width={15} />
            Login / Register
          </Link>
        </div>
      </nav>
    </>
  );
}
