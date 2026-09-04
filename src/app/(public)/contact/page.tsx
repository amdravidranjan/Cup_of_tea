'use client';
import { Icon } from '@iconify/react';

export default function ContactPage() {
  return (
    <div>
      {/* ── HERO ──────────────────────────────────── */}
      <div className="stats-band" style={{ padding: '36px 0 30px' }}>
        <div className="sec-wrap" style={{ color: '#fff' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Contact Us · தொடர்பு கொள்ளவும்
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#ffc107', marginBottom: 8 }}>
            Get in Touch with CLA
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', maxWidth: 820, lineHeight: 1.7 }}>
            Reach the Commissionerate of Land Administration for queries related to land acquisition projects,
            compensation status, R&amp;R entitlements, or any other assistance.
          </p>
        </div>
      </div>

      {/* ── CONTACT CARDS ────────────────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="two-col">
            {/* Left: Contact Details */}
            <div>
              <div className="sec-head" style={{ marginBottom: 16 }}>
                <h2 className="sec-title">
                  <Icon icon="mdi:office-building-marker-outline" width={21} color="#e56b00" />
                  Office Details
                  <span className="ta">அலுவலக விவரங்கள்</span>
                </h2>
              </div>
              <div className="links-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="link-box">
                  <div className="link-box-head"><Icon icon="mdi:phone-outline" width={16} />Helpline Numbers</div>
                  <ul>
                    {[
                      { icon: 'mdi:phone', c: '#0b5394', t: '1800-425-5500 (Toll Free)' },
                      { icon: 'mdi:whatsapp', c: '#25d366', t: '94440-00001 (WhatsApp)' },
                      { icon: 'mdi:phone-classic', c: '#0b5394', t: '044-2854-3800 (Landline)' },
                      { icon: 'mdi:fax', c: '#6c757d', t: '044-2854-3801 (Fax)' },
                    ].map(h => (
                      <li key={h.t}><span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', fontSize: 12.5, color: '#3a4a5c' }}>
                        <Icon icon={h.icon} width={14} color={h.c} /><strong>{h.t}</strong>
                      </span></li>
                    ))}
                  </ul>
                </div>
                <div className="link-box">
                  <div className="link-box-head"><Icon icon="mdi:email-outline" width={16} />Email &amp; Address</div>
                  <ul>
                    <li><span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', fontSize: 12.5, color: '#3a4a5c' }}>
                      <Icon icon="mdi:email-outline" width={14} color="#0b5394" />helpdesk@tnglms.gov.in
                    </span></li>
                    <li><span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', fontSize: 12.5, color: '#3a4a5c' }}>
                      <Icon icon="mdi:email-fast-outline" width={14} color="#0b5394" />cla@tn.gov.in
                    </span></li>
                    <li><span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 14px', fontSize: 12.5, color: '#3a4a5c', lineHeight: 1.6 }}>
                      <Icon icon="mdi:map-marker-outline" width={14} color="#0b5394" style={{ marginTop: 3, flexShrink: 0 }} />
                      Commissionerate of Land Administration,<br/>Ezhilagam, Chepauk, Chennai — 600 005,<br/>Tamil Nadu, India
                    </span></li>
                  </ul>
                </div>
              </div>
              <div style={{ marginTop: 16, fontSize: 11.5, color: '#6c757d' }}>
                <Icon icon="mdi:clock-outline" width={13} style={{ verticalAlign: 'middle' }} /> Office Hours: Monday to Saturday, 9:00 AM — 6:00 PM (IST). Closed on public holidays.
              </div>
            </div>

            {/* Right: Feedback Form */}
            <div>
              <div className="sec-head" style={{ marginBottom: 16 }}>
                <h2 className="sec-title">
                  <Icon icon="mdi:message-text-outline" width={21} color="#e56b00" />
                  Send Feedback
                  <span className="ta">கருத்து தெரிவிக்கவும்</span>
                </h2>
              </div>
              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 5, padding: 20 }}>
                <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Full Name · முழு பெயர்', type: 'text', placeholder: 'Enter your full name' },
                    { label: 'Email Address · மின்னஞ்சல்', type: 'email', placeholder: 'your@email.com' },
                    { label: 'Mobile Number · கைபேசி', type: 'tel', placeholder: '+91 XXXXX XXXXX' },
                    { label: 'Subject · தலைப்பு', type: 'text', placeholder: 'Brief subject of your query' },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: '#3a4a5c', display: 'block', marginBottom: 4 }}>{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} style={{ width: '100%', border: '1px solid #dee2e6', borderRadius: 4, padding: '8px 12px', fontSize: 13 }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#3a4a5c', display: 'block', marginBottom: 4 }}>Message · செய்தி</label>
                    <textarea rows={4} placeholder="Describe your query or feedback..." style={{ width: '100%', border: '1px solid #dee2e6', borderRadius: 4, padding: '8px 12px', fontSize: 13, resize: 'vertical' }} />
                  </div>
                  <button type="submit" style={{ background: '#0b5394', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <Icon icon="mdi:send" width={16} /> Submit Feedback · சமர்ப்பி
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DISTRICT CONTACTS ────────────────────── */}
      <div className="alt-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:account-group-outline" width={21} color="#e56b00" />
              District-Wise LAO Contacts
              <span className="ta">மாவட்ட வாரியான LAO தொடர்புகள்</span>
            </h2>
          </div>
          <div className="links-grid">
            {[
              { head: 'Chennai Region', districts: ['Chennai', 'Tiruvallur', 'Kancheepuram', 'Chengalpattu'] },
              { head: 'Central Region', districts: ['Tiruchirappalli', 'Madurai', 'Salem', 'Coimbatore', 'Erode'] },
              { head: 'Southern Region', districts: ['Thoothukudi', 'Sivaganga', 'Krishnagiri', 'Perambalur', 'Vellore'] },
            ].map(region => (
              <div key={region.head} className="link-box">
                <div className="link-box-head"><Icon icon="mdi:map-outline" width={16} />{region.head}</div>
                <ul>
                  {region.districts.map(d => (
                    <li key={d}><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', fontSize: 12.5, color: '#3a4a5c' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon icon="mdi:map-marker" width={13} color="#e56b00" />{d} District
                      </span>
                      <span style={{ fontSize: 11, color: '#0b5394', fontWeight: 600 }}>LAO Office</span>
                    </span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
