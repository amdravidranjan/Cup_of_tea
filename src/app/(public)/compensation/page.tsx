'use client';
import { useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';

function calc(area: number, rate: number, mult: number, assets: number, months: number) {
  const mv = area * rate;
  const mmv = mv * mult;
  const sol = mv * 1.0;
  const interest = mv * 0.12 * (months / 12);
  const total = mmv + sol + interest + assets;
  return { mv, mmv, sol, interest, total };
}

export default function CompensationPage() {
  const [area, setArea] = useState(1.5);
  const [rate, setRate] = useState(2000000);
  const [mult, setMult] = useState(2);
  const [assets, setAssets] = useState(50000);
  const [months, setMonths] = useState(6);
  const r = calc(area, rate, mult, assets, months);

  return (
    <div>
      {/* ── HERO ──────────────────────────────────── */}
      <div className="stats-band" style={{ padding: '36px 0 30px' }}>
        <div className="sec-wrap" style={{ color: '#fff' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Sections 26–30, RFCTLARR Act 2013 · பிரிவுகள் 26–30
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#ffc107', marginBottom: 8 }}>
            Compensation Calculator &amp; Disbursement Status
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', maxWidth: 820, lineHeight: 1.7 }}>
            Compute your entitled compensation under the RFCTLARR Act. Market value is multiplied by the rural factor,
            plus 100% solatium, 12% p.a. interest, and assessed asset value.
          </p>
        </div>
      </div>

      {/* ── CALCULATOR ───────────────────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:calculator-variant-outline" width={21} color="#e56b00" />
              Interactive Compensation Calculator
              <span className="ta">இழப்பீடு கணிப்பான்</span>
            </h2>
          </div>
          <div className="two-col">
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Land Area (Hectares) · நிலப் பரப்பு', value: area, set: setArea, step: 0.1, min: 0.01 },
                  { label: 'Rate per Hectare (₹) · ஹெக்டேர் விலை', value: rate, set: setRate, step: 100000, min: 0 },
                  { label: 'Rural Multiplier · பெருக்கி', value: mult, set: setMult, step: 0.5, min: 1 },
                  { label: 'Asset Value (₹) · சொத்து மதிப்பு', value: assets, set: setAssets, step: 10000, min: 0 },
                  { label: 'Months Since Notification · மாதங்கள்', value: months, set: setMonths, step: 1, min: 0 },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#3a4a5c' }}>{f.label}</label>
                    <input
                      type="number" value={f.value} step={f.step} min={f.min}
                      onChange={e => f.set(Number(e.target.value))}
                      style={{ border: '1px solid #dee2e6', borderRadius: 4, padding: '8px 12px', fontSize: 14, fontWeight: 600, color: '#0b5394' }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="notice-box">
                <div className="notice-head">
                  <Icon icon="mdi:receipt-text-outline" width={15} />
                  Compensation Breakdown · இழப்பீடு விவரம்
                </div>
                <div style={{ padding: 0 }}>
                  {[
                    { l: 'Market Value (Area × Rate)', v: r.mv },
                    { l: 'Multiplied Market Value', v: r.mmv },
                    { l: 'Solatium (100% of MV)', v: r.sol },
                    { l: 'Interest (12% p.a.)', v: r.interest },
                    { l: 'Assets Value', v: assets },
                  ].map((row, i) => (
                    <div key={i} className="notice-item" style={{ justifyContent: 'space-between' }}>
                      <span>{row.l}</span>
                      <strong style={{ color: '#0b5394', whiteSpace: 'nowrap' }}>₹{row.v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#0b5394', color: '#ffc107', fontWeight: 700, fontSize: 15 }}>
                    <span>Total Compensation · மொத்த இழப்பீடு</span>
                    <span>₹{r.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────── */}
      <div className="alt-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:information-outline" width={21} color="#e56b00" />
              How Compensation is Determined
              <span className="ta">இழப்பீடு எவ்வாறு நிர்ணயிக்கப்படுகிறது</span>
            </h2>
          </div>
          <div className="schemes-grid">
            {[
              { icon: 'mdi:chart-line-variant', title: 'Market Value Assessment', desc: 'Based on registered sale deeds, stamp duty records, and collector rates for the locality. The higher of these is taken as the base market value per Section 26.' },
              { icon: 'mdi:multiplication', title: 'Rural Multiplier', desc: 'Land in rural areas receives a multiplier of 1× to 4× on market value under Section 28, based on distance from urban limits. Urban land gets 1×.' },
              { icon: 'mdi:hand-coin-outline', title: 'Solatium & Interest', desc: '100% solatium on market value (Section 30) + 12% per annum interest from the date of Section 11 notification until the date of award (Section 30(3)).' },
            ].map(s => (
              <div key={s.title} className="scheme-card">
                <div className="scheme-img" style={{ height: 80, background: '#0b5394', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon={s.icon} width={36} color="#ffc107" />
                </div>
                <div className="scheme-body">
                  <div style={{ fontWeight: 700, color: '#0b5394', fontSize: 14, marginBottom: 8 }}>{s.title}</div>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DISBURSEMENT STATUS ───────────────────── */}
      <div className="content-band">
        <div className="sec-wrap">
          <div className="sec-head">
            <h2 className="sec-title">
              <Icon icon="mdi:cash-check" width={21} color="#e56b00" />
              Disbursement Status
              <span className="ta">விநியோக நிலை</span>
            </h2>
          </div>
          <div className="svc-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { icon: 'mdi:cash-multiple', label: 'Total\nAssessed', bg: '#e8f0fa', ic: '#0b5394' },
              { icon: 'mdi:cash-check', label: 'Fully\nDisbursed', bg: '#e8f5ed', ic: '#1a7a3c' },
              { icon: 'mdi:cash-clock', label: 'Pending\nPayment', bg: '#fff3e8', ic: '#e56b00' },
              { icon: 'mdi:cash-remove', label: 'Deadline\nBreached', bg: '#fdecea', ic: '#c0392b' },
            ].map(s => (
              <div key={s.label} className="svc-tile" style={{ cursor: 'default' }}>
                <div className="svc-icon" style={{ background: s.bg }}>
                  <Icon icon={s.icon} width={28} color={s.ic} />
                </div>
                <div className="svc-name" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 13, color: '#6c757d', textAlign: 'center' }}>
            <Icon icon="mdi:information-outline" width={14} style={{ verticalAlign: 'middle' }} /> For project-specific disbursement details, please <Link href="/projects" style={{ color: '#0b5394', fontWeight: 600 }}>search for your project</Link> and view the compensation tab.
          </div>
        </div>
      </div>
    </div>
  );
}
