'use client';
import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

const slides = [
  {
    img: 'https://images.unsplash.com/photo-1630672140970-290903ff233c?w=1440&h=500&fit=crop&auto=format',
    tag: 'Transparency Portal',
    h1: 'Track Land Acquisition Projects in Real Time',
    sub: 'Citizens can view project status, compensation awards, R&R entitlements and Section 11/19 notifications without logging in.',
    cta: 'View Projects', cta2: 'Know More',
    ctaHref: '/projects', cta2Href: '/about',
  },
  {
    img: 'https://images.unsplash.com/photo-1774695474756-d1eddcd90d6e?w=1440&h=500&fit=crop&auto=format',
    tag: 'RFCTLARR Act 2013',
    h1: 'Compensation Calculated as per Sections 26–30',
    sub: 'Market value × rural multiplier (up to 4×) + Solatium (100%) + 12% p.a. interest. Every rupee disbursed is tracked against the 3-month statutory deadline.',
    cta: 'Check Status', cta2: 'Calculate Now',
    ctaHref: '/projects', cta2Href: '/compensation',
  },
  {
    img: 'https://images.unsplash.com/photo-1649513242423-67a33a33870c?w=1440&h=500&fit=crop&auto=format',
    tag: 'Rehabilitation & Resettlement',
    h1: 'R&R Entitlements for Every Affected Family',
    sub: 'Housing, subsistence grant, transport allowance, employment support and full Second Schedule entitlements tracked per household.',
    cta: 'R&R Status', cta2: 'View Schemes',
    ctaHref: '/rr', cta2Href: '/schemes',
  },
];

export function HeroCarousel() {
  const [idx, setIdx] = useState(0);
  const n = slides.length;
  
  useEffect(() => { 
    const t = setInterval(() => setIdx(i => (i + 1) % n), 5500); 
    return () => clearInterval(t); 
  }, [n]);
  
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
              <a href={s.ctaHref} className="hero-cta">{s.cta}</a>
              <a href={s.cta2Href} className="hero-cta ghost">{s.cta2}</a>
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
  );
}
