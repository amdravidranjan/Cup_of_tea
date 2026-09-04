'use client';
import { useState } from 'react';
import { Icon } from '@iconify/react';

const gallery = [
  'https://images.unsplash.com/photo-1630672140970-290903ff233c?w=340&h=220&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1774695475379-88e1351e4922?w=340&h=220&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1649513242423-67a33a33870c?w=340&h=220&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1628178693557-0269334ffbe8?w=340&h=220&fit=crop&auto=format',
];

export function Gallery() {
  const [tab, setTab] = useState<'photos' | 'videos'>('photos');
  return (
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
  );
}
