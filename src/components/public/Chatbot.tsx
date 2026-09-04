'use client';
import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';

const chatReplies: Record<string, string> = {
  default: 'வணக்கம்! I am VANI, TN-GLMS virtual assistant. Ask me about project status, compensation, R&R entitlements, grievances or field verification.',
  project: 'Search active land acquisition projects under "Project Discovery". You can filter by district, stage (Section 11 / Section 19 / Award) or implementing agency without logging in.',
  compensation: 'Compensation is calculated per RFCTLARR Act Sections 26–30: market value × rural multiplier (up to 4×) + 100% solatium + 12% p.a. interest. Use the Compensation Calculator to check your entitlement.',
  rr: 'R&R entitlements (Second Schedule) include housing, subsistence grant, transport allowance and employment support. Check your household status under "R&R Entitlement Status" using your family ID.',
  grievance: 'Submit your grievance under "Grievance Submission". You will receive a tracking number. Grievances are reviewed by the District Authority and resolved within the prescribed timeline.',
  field: 'Field Verification is done by LAO officers via the mobile app — geo-tagging parcels, uploading photos and updating possession status. Offline-capable for remote areas.',
};

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from: 'bot', text: chatReplies.default }]);
  const [input, setInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [msgs]);

  const send = (q?: string) => {
    const txt = q ?? input;
    if (!txt.trim()) return;
    const lo = txt.toLowerCase();
    let reply = chatReplies.default;
    if (lo.includes('project') || lo.includes('section 11') || lo.includes('section 19')) reply = chatReplies.project;
    else if (lo.includes('compensation') || lo.includes('solatium') || lo.includes('award') || lo.includes('larr')) reply = chatReplies.compensation;
    else if (lo.includes('r&r') || lo.includes('rehabilitation') || lo.includes('resettlement') || lo.includes('entitlement')) reply = chatReplies.rr;
    else if (lo.includes('grievance') || lo.includes('complaint')) reply = chatReplies.grievance;
    else if (lo.includes('field') || lo.includes('verification') || lo.includes('geo')) reply = chatReplies.field;
    setMsgs(m => [...m, { from: 'user', text: txt }, { from: 'bot', text: reply }]);
    setInput('');
  };

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
  );
}
