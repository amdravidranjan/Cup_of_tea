import { TrackGrievance } from "@/components/track-grievance";
import { TrackProjectRequest } from "@/components/track-project-request";
import { Icon } from '@iconify/react';

export default function TrackPage() {
  return (
    <div>
      {/* ── HERO ──────────────────────────────────── */}
      <div className="stats-band" style={{ padding: '36px 0 30px' }}>
        <div className="sec-wrap" style={{ color: '#fff' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Track Status · நிலையை கண்காணிக்கவும்
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#ffc107', marginBottom: 8 }}>
            Track Your Submissions
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', maxWidth: 820, lineHeight: 1.7 }}>
            Enter your tracking number below to view the real-time status of your grievance or project request.
          </p>
        </div>
      </div>

      <div className="content-band">
        <div className="sec-wrap">
          <div className="two-col">
            {/* Left: Track Grievance */}
            <div>
              <div className="sec-head" style={{ marginBottom: 16 }}>
                <h2 className="sec-title">
                  <Icon icon="mdi:magnify" width={21} color="#e56b00" />
                  Track Grievance
                  <span className="ta">குறையைத் தேடு</span>
                </h2>
              </div>
              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 5, padding: 20 }}>
                <TrackGrievance />
              </div>
            </div>

            {/* Right: Track Project Request */}
            <div>
              <div className="sec-head" style={{ marginBottom: 16 }}>
                <h2 className="sec-title">
                  <Icon icon="mdi:office-building-marker" width={21} color="#e56b00" />
                  Track Project Request
                  <span className="ta">திட்ட கோரிக்கையை தேடு</span>
                </h2>
              </div>
              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 5, padding: 20 }}>
                <TrackProjectRequest />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
