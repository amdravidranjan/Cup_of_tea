import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'

/* ─── Ashoka Emblem ─────────────────────────────────────────── */
function Emblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 64 72" fill="none">
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
  )
}

/* ─── Data ──────────────────────────────────────────────────── */
const tickers = [
  { text: 'Section 11 Preliminary Notification for Project #TN-2026-089 published — Objection window open until 20 Oct 2026', href: '#' },
  { text: 'Compensation disbursement deadline alert: Project #TN-2026-042 award passed — 3-month payment window in effect', href: '#' },
  { text: 'RFCTLARR Act 2013 — Section 19 Final Declaration must follow Section 11 within 12 months or the notification lapses', href: '#' },
  { text: 'R&R Scheme for Project #TN-2026-031 approved by Commissioner R&R — Entitlement disbursement begins 15 Oct 2026', href: '#' },
  { text: 'Field Verification drive: 3 Land Acquisition Officers deployed for geo-tagged parcel survey in 4 districts', href: '#' },
  { text: 'Helpline 1800-425-5500 | Mon–Sat 9AM–6PM | Grievance Tracking available online', href: '#' },
]

const slides = [
  {
    img: 'https://images.unsplash.com/photo-1630672140970-290903ff233c?w=1440&h=500&fit=crop&auto=format',
    tag: 'Transparency Portal',
    h1: 'Track Land Acquisition Projects in Real Time',
    sub: 'Citizens can view project status, compensation awards, R&R entitlements and Section 11/19 notifications without logging in.',
    cta: 'View Projects', cta2: 'Know More',
  },
  {
    img: 'https://images.unsplash.com/photo-1774695474756-d1eddcd90d6e?w=1440&h=500&fit=crop&auto=format',
    tag: 'RFCTLARR Act 2013',
    h1: 'Compensation Calculated as per Sections 26–30',
    sub: 'Market value × rural multiplier (up to 4×) + Solatium (100%) + 12% p.a. interest. Every rupee disbursed is tracked against the 3-month statutory deadline.',
    cta: 'Check Status', cta2: 'Learn More',
  },
  {
    img: 'https://images.unsplash.com/photo-1649513242423-67a33a33870c?w=1440&h=500&fit=crop&auto=format',
    tag: 'Rehabilitation & Resettlement',
    h1: 'R&R Entitlements for Every Affected Family',
    sub: 'Housing, subsistence grant, transport allowance, employment support and full Second Schedule entitlements tracked per household.',
    cta: 'R&R Status', cta2: 'View Schemes',
  },
]

const services = [
  { icon: 'mdi:map-marker-radius-outline',  label: 'Project\nDiscovery',         bg: '#e8f0fa', ic: '#0b5394' },
  { icon: 'mdi:currency-inr',               label: 'Compensation\nCalculator',    bg: '#e8f5ed', ic: '#1a7a3c' },
  { icon: 'mdi:home-group',                 label: 'R&R\nEntitlement Status',    bg: '#fff3e8', ic: '#e56b00' },
  { icon: 'mdi:account-voice',              label: 'Grievance\nSubmission',       bg: '#fdecea', ic: '#c0392b' },
  { icon: 'mdi:file-document-multiple-outline', label: 'Document\nRepository',   bg: '#f3ebfa', ic: '#6f42c1' },
  { icon: 'mdi:map-search-outline',         label: 'GIS Parcel\nMap',            bg: '#fff8e1', ic: '#c9860a' },
  { icon: 'mdi:cellphone-check',            label: 'Field\nVerification',        bg: '#e0f5f1', ic: '#00796b' },
  { icon: 'mdi:clipboard-list-outline',     label: 'SLA / Stage\nTracker',       bg: '#e3ecfa', ic: '#1565c0' },
]

const news = [
  { date: '02 Sep 2026', text: 'Section 19 Final Declaration issued for Project #TN-2026-019 (Ring Road Extension) — Possession to follow after full compensation', isNew: true },
  { date: '28 Aug 2026', text: 'R&R Award passed for Project #TN-2026-031: 847 affected families eligible for Second Schedule entitlements', isNew: true },
  { date: '20 Aug 2026', text: 'SIA Expert Group review completed for Project #TN-2026-051 — report submitted to District Authority for approval', isNew: false },
  { date: '12 Aug 2026', text: 'Compensation disbursement for Project #TN-2026-009: ₹93.4 Cr released to 1,240 landowners via direct bank transfer', isNew: false },
  { date: '05 Aug 2026', text: 'Third Schedule infrastructure checklist updated — R&R colonies for Project #TN-2026-003 now include PHC and Anganwadi centre', isNew: false },
  { date: '28 Jul 2026', text: 'Field Verification module upgraded — LAO officers can now geo-tag parcels and upload photos from mobile (offline-capable)', isNew: false },
]

const notices = [
  { text: 'Section 11 Notification: Project #TN-2026-089 — Public objection window closes 20 Oct 2026', isNew: true },
  { text: 'Public Hearing scheduled for Project #TN-2026-076 — 18 Sep 2026, District Collectorate', isNew: true },
  { text: 'Landowner Self-Service Portal launched — Submit objections and upload documents online', isNew: true },
  { text: 'RFCTLARR Act 2013: Versioned entitlement-rate table updated with 2026-27 biennial revision', isNew: false },
  { text: 'Auto-generated possession certificates now available for download (PDF) post-disbursement', isNew: false },
  { text: 'SLA Health Dashboard: 3 projects in amber status — awards pending beyond 60% of 12-month window', isNew: false },
  { text: 'Annual Report 2025-26 of the Commissionerate of Land Administration published', isNew: false },
]

const schemes = [
  {
    img: 'https://images.unsplash.com/photo-1630672140970-290903ff233c?w=600&h=200&fit=crop&auto=format',
    title: 'Compensation Management',
    desc: 'Implements Sections 26–30 of RFCTLARR Act 2013: market value × rural multiplier (up to 4×) + 100% solatium + 12% p.a. interest, tracked against the 3-month disbursement deadline.',
  },
  {
    img: 'https://images.unsplash.com/photo-1774695474756-d1eddcd90d6e?w=600&h=200&fit=crop&auto=format',
    title: 'R&R Scheme (6-Step Workflow)',
    desc: 'End-to-end Rehabilitation & Resettlement — from Sub-Collector survey to Commissioner approval. Second Schedule entitlements (housing, grants, employment) tracked per affected household.',
  },
  {
    img: 'https://images.unsplash.com/photo-1628178693557-0269334ffbe8?w=600&h=200&fit=crop&auto=format',
    title: 'Public Transparency Portal',
    desc: 'No-login access to project status, Section 11/19 notifications, compensation awards, R&R progress and grievance tracking. Designed for affected citizens and civil society.',
  },
]

const gallery = [
  'https://images.unsplash.com/photo-1630672140970-290903ff233c?w=340&h=220&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1774695475379-88e1351e4922?w=340&h=220&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1649513242423-67a33a33870c?w=340&h=220&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1628178693557-0269334ffbe8?w=340&h=220&fit=crop&auto=format',
]

const chatReplies: Record<string, string> = {
  default: 'வணக்கம்! I am VANI, TN-GLMS virtual assistant. Ask me about project status, compensation, R&R entitlements, grievances or field verification.',
  project: 'Search active land acquisition projects under "Project Discovery". You can filter by district, stage (Section 11 / Section 19 / Award) or implementing agency without logging in.',
  compensation: 'Compensation is calculated per RFCTLARR Act Sections 26–30: market value × rural multiplier (up to 4×) + 100% solatium + 12% p.a. interest. Use the Compensation Calculator to check your entitlement.',
  rr: 'R&R entitlements (Second Schedule) include housing, subsistence grant, transport allowance and employment support. Check your household status under "R&R Entitlement Status" using your family ID.',
  grievance: 'Submit your grievance under "Grievance Submission". You will receive a tracking number. Grievances are reviewed by the District Authority and resolved within the prescribed timeline.',
  field: 'Field Verification is done by LAO officers via the mobile app — geo-tagging parcels, uploading photos and updating possession status. Offline-capable for remote areas.',
}

/* ─── Chatbot ───────────────────────────────────────────────── */
function Chatbot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([{ from: 'bot', text: chatReplies.default }])
  const [input, setInput] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [msgs])

  const send = (q?: string) => {
    const txt = q ?? input
    if (!txt.trim()) return
    const lo = txt.toLowerCase()
    let reply = chatReplies.default
    if (lo.includes('project') || lo.includes('section 11') || lo.includes('section 19')) reply = chatReplies.project
    else if (lo.includes('compensation') || lo.includes('solatium') || lo.includes('award') || lo.includes('larr')) reply = chatReplies.compensation
    else if (lo.includes('r&r') || lo.includes('rehabilitation') || lo.includes('resettlement') || lo.includes('entitlement')) reply = chatReplies.rr
    else if (lo.includes('grievance') || lo.includes('complaint')) reply = chatReplies.grievance
    else if (lo.includes('field') || lo.includes('verification') || lo.includes('geo')) reply = chatReplies.field
    setMsgs(m => [...m, { from: 'user', text: txt }, { from: 'bot', text: reply }])
    setInput('')
  }

  return (
    <div className="chat-fab">
      {open && (
        <div className="chat-window">
          <div className="chat-head">
            <div className="chat-avatar"><Icon icon="mdi:robot-happy-outline" width={20} color="#fff" /></div>
            <div>
              <div className="chat-title">VANI — Virtual Assistant</div>
              <div className="chat-online">TN-GLMS Help Desk • Online</div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chat-msgs" ref={ref}>
            {msgs.map((m, i) => <div key={i} className={`chat-bubble ${m.from}`}>{m.text}</div>)}
          </div>
          <div className="chat-chips">
            {['Project Status', 'Compensation', 'R&R', 'Grievance', 'Field Verification'].map(c => (
              <button key={c} className="chip" onClick={() => send(c)}>{c}</button>
            ))}
          </div>
          <div className="chat-input-row">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type your question…" />
            <button onClick={() => send()}>Send</button>
          </div>
        </div>
      )}
      <button className="chat-toggle" onClick={() => setOpen(o => !o)} title="Chat with VANI — Virtual Assistant">
        <Icon icon={open ? 'mdi:close' : 'mdi:chat-processing-outline'} width={26} color="#fff" />
      </button>
    </div>
  )
}

/* ─── Hero Carousel ─────────────────────────────────────────── */
function HeroCarousel() {
  const [idx, setIdx] = useState(0)
  const n = slides.length
  useEffect(() => { const t = setInterval(() => setIdx(i => (i + 1) % n), 5500); return () => clearInterval(t) }, [n])
  return (
    <div className="hero">
      {slides.map((s, i) => (
        <div key={i} className={`hero-slide ${i === idx ? 'active' : ''}`}>
          <img src={s.img} alt={s.h1} />
          <div className="hero-grad">
            <div className="hero-body">
              <div className="hero-eyebrow"><Icon icon="mdi:star-four-points" width={11} />{s.tag}</div>
              <h1 className="hero-h1">{s.h1}</h1>
              <p className="hero-sub">{s.sub}</p>
              <a href="#" className="hero-cta">{s.cta}</a>
              <a href="#" className="hero-cta ghost">{s.cta2}</a>
            </div>
          </div>
        </div>
      ))}
      <button className="hero-arrow prev" onClick={() => setIdx(i => (i - 1 + n) % n)}><Icon icon="mdi:chevron-left" width={22} /></button>
      <button className="hero-arrow next" onClick={() => setIdx(i => (i + 1) % n)}><Icon icon="mdi:chevron-right" width={22} /></button>
      <div className="hero-dots">
        {slides.map((_, i) => <button key={i} className={`hero-dot ${i === idx ? 'on' : ''}`} onClick={() => setIdx(i)} />)}
      </div>
    </div>
  )
}

/* ─── Main App ──────────────────────────────────────────────── */
export default function App() {
  const [fs, setFs] = useState(14)
  const [hc, setHc] = useState(false)
  const [tab, setTab] = useState<'photos' | 'videos'>('photos')

  useEffect(() => {
    document.body.style.fontSize = `${fs}px`
    document.body.classList.toggle('high-contrast', hc)
  }, [fs, hc])

  const navLinks: { label: string; items?: string[] }[] = [
    { label: 'Home' },
    { label: 'About Us', items: ['About TN-GLMS', 'Commissionerate of Land Administration', 'RFCTLARR Act 2013', 'Organisational Structure', 'Annual Reports', 'Tender Notices'] },
    { label: 'Projects', items: ['View All Projects', 'Section 11 Notifications', 'Section 19 Declarations', 'Award & Possession Status', 'GIS Parcel Map'] },
    { label: 'Compensation', items: ['Compensation Calculator', 'Disbursement Status', 'Solatium & Interest', 'Award Letters (Download)', 'PFMS Payment Trail'] },
    { label: 'R&R', items: ['R&R Scheme Status', 'Entitlement Tracker', 'Second Schedule Benefits', 'Third Schedule Infrastructure', 'Resettlement Colonies'] },
    { label: 'Grievances' },
    { label: 'Documents', items: ['Section 11 Notifications (PDF)', 'Section 19 Declarations (PDF)', 'Award Letters', 'Possession Certificates', 'DPR Repository', 'SIA Reports'] },
    { label: 'Imp. Links', items: ['RFCTLARR Act 2013 — Full Text', 'Bhoomi Rashi Portal (MoRTH)', 'Open Govt Data (OGD)', 'Ministry of Rural Development', 'India.gov.in'] },
    { label: 'Contact Us' },
  ]

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* 1 ── ACCESSIBILITY BAR ─────────────────────────────── */}
      <div className="access-bar">
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
            <a href="#main">Skip to Main Content</a><span className="sep">|</span>
            <a href="#">Screen Reader</a><span className="sep">|</span>
            <a href="#">Sitemap</a><span className="sep">|</span>
            <a href="#">RTI</a><span className="sep">|</span>
            <a href="#" target="_blank" rel="noreferrer">india.gov.in</a>
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

      {/* 2 ── HEADER ────────────────────────────────────────── */}
      <header className="site-header">
        <div className="header-inner">
          <Emblem size={64} />
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

      {/* 3 ── NAVIGATION ────────────────────────────────────── */}
      <nav className="main-nav" role="navigation" aria-label="Main navigation">
        <div className="nav-inner" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 16px' }}>
          {navLinks.map(link => (
            <div key={link.label} className={`nav-item ${link.label === 'Home' ? 'active' : ''}`} style={{ position: 'relative' }}>
              {link.label === 'Home' && <Icon icon="mdi:home-outline" width={15} />}
              {link.label}
              {link.items && <Icon icon="mdi:chevron-down" width={14} />}
              {link.items && (
                <div className="dropdown-panel">
                  {link.items.map(it => (
                    <a key={it} href="#">
                      <Icon icon="mdi:chevron-right" width={12} color="#e56b00" />
                      {it}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          <a href="#" className="nav-item nav-login">
            <Icon icon="mdi:login" width={15} />
            Login / Register
          </a>
        </div>
      </nav>

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
      <main id="main">
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
              <a href="#" className="view-all-link">
                View All Services <Icon icon="mdi:arrow-right" width={14} />
              </a>
            </div>
            <div className="svc-grid">
              {services.map(s => (
                <a key={s.label} href="#" className="svc-tile">
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
              { n: '112',     l: 'Active Projects',         icon: 'mdi:map-outline' },
              { n: '48,300+', l: 'Affected Families',       icon: 'mdi:home-group' },
              { n: '₹2,840Cr', l: 'Compensation Disbursed', icon: 'mdi:currency-inr' },
              { n: '94.2%',   l: 'SLA Compliance Rate',    icon: 'mdi:clipboard-check-outline' },
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
              {/* News */}
              <div>
                <div className="sec-head" style={{ marginBottom: 16 }}>
                  <h2 className="sec-title">
                    <Icon icon="mdi:newspaper-variant-outline" width={21} color="#e56b00" />
                    Latest News & Events
                    <span className="ta">செய்திகள்</span>
                  </h2>
                  <a href="#" className="view-all-link">View All <Icon icon="mdi:arrow-right" width={14} /></a>
                </div>
                <ul className="news-list">
                  {news.map((n, i) => (
                    <li key={i} className="news-row">
                      <span className="news-date-pill">{n.date}</span>
                      <span className="news-copy">
                        <a href="#">{n.text}</a>
                        {n.isNew && <span className="badge-new">New</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Notice board */}
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
                    {notices.map((n, i) => (
                      <div key={i} className="notice-item">
                        <Icon icon="mdi:chevron-right-circle" width={14} color="#e56b00" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>
                          <a href="#">{n.text}</a>
                          {n.isNew && <span className="badge-new">New</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '8px 14px', borderTop: '1px solid #dee2e6' }}>
                    <a href="#" className="view-all-link">View All Notices <Icon icon="mdi:arrow-right" width={13} /></a>
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
              <a href="#" className="view-all-link">View All <Icon icon="mdi:arrow-right" width={14} /></a>
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
                    <a href="#" className="know-more">Know More <Icon icon="mdi:arrow-right" width={13} /></a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 10 ── GALLERY ──────────────────────────────────── */}
        <div className="content-band" style={{ borderTop: '1px solid #dee2e6' }}>
          <div className="sec-wrap">
            <h2 className="sec-title" style={{ marginBottom: 16 }}>
              <Icon icon="mdi:image-multiple-outline" width={21} color="#e56b00" />
              Media Gallery
              <span className="ta">ஊடக தொகுப்பு</span>
            </h2>
            <div className="tab-row">
              <button className={`tab-btn ${tab === 'photos' ? 'on' : ''}`} onClick={() => setTab('photos')}>
                <Icon icon="mdi:camera-outline" width={15} /> Photos
              </button>
              <button className={`tab-btn ${tab === 'videos' ? 'on' : ''}`} onClick={() => setTab('videos')}>
                <Icon icon="mdi:video-outline" width={15} /> Videos
              </button>
            </div>
            {tab === 'photos' ? (
              <div className="gallery-grid">
                {gallery.map((src, i) => (
                  <div key={i} className="gallery-cell">
                    <img src={src} alt={`Gallery ${i + 1}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '36px', textAlign: 'center', background: '#f4f6f9', borderRadius: 4, color: '#6c757d' }}>
                <Icon icon="mdi:video-outline" width={40} color="#ced4da" />
                <div style={{ marginTop: 10, fontSize: 13 }}>Video gallery coming soon.</div>
              </div>
            )}
          </div>
        </div>

        {/* 11 ── IMPORTANT LINKS ──────────────────────────── */}
        <div className="alt-band">
          <div className="sec-wrap">
            <h2 className="sec-title" style={{ marginBottom: 20 }}>
              <Icon icon="mdi:link-variant" width={21} color="#e56b00" />
              Important Links & Downloads
            </h2>
            <div className="links-grid">
              <div className="link-box">
                <div className="link-box-head"><Icon icon="mdi:download-outline" width={16} />Downloads / Official Documents</div>
                <ul>
                  {[
                    ['mdi:file-pdf-box', '#c0392b', 'RFCTLARR Act 2013 — Full Text (PDF)'],
                    ['mdi:file-pdf-box', '#c0392b', 'Grievance Submission Form'],
                    ['mdi:file-pdf-box', '#c0392b', 'R&R Entitlement Claim Form'],
                    ['mdi:file-pdf-box', '#c0392b', 'Objection Form — Section 15/21'],
                    ['mdi:file-pdf-box', '#c0392b', 'Landowner Portal User Manual'],
                    ['mdi:file-pdf-box', '#c0392b', 'CLA Annual Report 2025-26'],
                  ].map(([icon, ic, label]) => (
                    <li key={label}><a href="#"><Icon icon={icon} width={14} color={ic} />{label}</a></li>
                  ))}
                </ul>
              </div>
              <div className="link-box">
                <div className="link-box-head"><Icon icon="mdi:web" width={16} />Useful External Links</div>
                <ul>
                  {[
                    ['mdi:open-in-new', 'Bhoomi Rashi Portal — MoRTH'],
                    ['mdi:open-in-new', 'Ministry of Rural Development (DoLR)'],
                    ['mdi:open-in-new', 'Open Government Data (OGD)'],
                    ['mdi:open-in-new', 'National Informatics Centre (NIC)'],
                    ['mdi:open-in-new', 'Revenue Dept. — Govt. of Tamil Nadu'],
                    ['mdi:open-in-new', 'india.gov.in — National Portal'],
                  ].map(([icon, label]) => (
                    <li key={label}><a href="#"><Icon icon={icon} width={14} color="#0b5394" />{label}</a></li>
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
                      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0b5394', color: '#fff', padding: '7px 12px', borderRadius: 3, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                        <Icon icon="mdi:google-play" width={15} />Play Store
                      </a>
                      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1c2b3a', color: '#fff', padding: '7px 12px', borderRadius: 3, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
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
      </main>

      {/* 12 ── FOOTER ────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-main">
          {/* About */}
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <Emblem size={52} />
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
                <a key={s.label} href="#" className="social-btn" title={s.label}>
                  <Icon icon={s.icon} width={15} />
                </a>
              ))}
            </div>
          </div>
          {/* Services */}
          <div className="footer-col">
            <div className="footer-head">Quick Services</div>
            <ul>
              {['Project Discovery', 'Compensation Calculator', 'R&R Entitlement Status', 'Grievance Submission', 'Document Repository', 'GIS Parcel Map'].map(l => (
                <li key={l}><a href="#"><Icon icon="mdi:chevron-right" width={12} color="#e56b00" />{l}</a></li>
              ))}
            </ul>
          </div>
          {/* Help */}
          <div className="footer-col">
            <div className="footer-head">Help & Support</div>
            <ul>
              {['About the Portal', 'RFCTLARR Act 2013 Guide', 'FAQ', 'Contact Us', 'Grievance Portal', 'RTI Application', 'Landowner User Guide', 'Accessibility'].map(l => (
                <li key={l}><a href="#"><Icon icon="mdi:chevron-right" width={12} color="#e56b00" />{l}</a></li>
              ))}
            </ul>
          </div>
          {/* Links */}
          <div className="footer-col">
            <div className="footer-head">Related Links</div>
            <ul>
              {['india.gov.in', 'tn.gov.in', 'Bhoomi Rashi Portal', 'Ministry of Rural Dev.', 'Open Govt. Data (OGD)', 'NIC India', 'Revenue Dept GoTN', 'DoLR — Dept. of Land Resources'].map(l => (
                <li key={l}><a href="#"><Icon icon="mdi:open-in-new" width={11} color="#e56b00" />{l}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-inner">
            <div className="footer-copy">
              © 2026 Commissionerate of Land Administration, Govt. of Tamil Nadu. All rights reserved. &nbsp;|&nbsp;
              Last Updated: 04 Sep 2026 &nbsp;|&nbsp;
              <a href="#">Policies</a> <a href="#">Disclaimer</a> <a href="#">Privacy</a>
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

      <Chatbot />
    </div>
  )
}
