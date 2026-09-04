'use client';
import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import {
  answerQuery,
  getSpeechRecognition,
  speak,
  stopSpeaking,
  type PublicProject,
  type SpeechRecognitionLike,
} from '@/lib/voice-assistant';

const GREETING =
  'வணக்கம்! I am VANI, the TN-GLMS virtual assistant. Ask me about a project’s status, compensation, R&R entitlements, grievances or documents — by typing, or press the mic and speak.';

/**
 * VANI — the public assistant widget.
 *
 * Visual design is unchanged (the .chat-fab / .chat-window / .chat-bubble
 * classes from the portal stylesheet). What changed is what it can do: it now
 * answers from the *real* project list via /api/public/projects instead of five
 * canned strings, and it supports speech in and out through the browser's Web
 * Speech API — the voice assistant that was in the feature list but had been
 * built in an orphaned component that was never mounted.
 */
export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from: 'bot', text: GREETING }]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const projectsPromiseRef = useRef<Promise<PublicProject[]> | null>(null);

  // Checked in an effect, not during render: the Web Speech API is
  // browser-only and probing it while rendering causes a hydration mismatch.
  useEffect(() => {
    setVoiceSupported(getSpeechRecognition() !== null);
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [msgs]);

  // The project list is fetched lazily on first open, so the widget costs
  // nothing to the page load of every public page it now sits on. The in-flight
  // promise is kept in a ref because a question asked in the second before the
  // fetch resolves must wait for it — otherwise the assistant confidently
  // answers "I couldn't find a project matching that" against an empty list.
  function loadProjects(): Promise<PublicProject[]> {
    if (!projectsPromiseRef.current) {
      projectsPromiseRef.current = fetch('/api/public/projects')
        .then((res) => res.json())
        .then((data: { projects?: PublicProject[] }) => data.projects ?? [])
        .catch(() => [] as PublicProject[]);
    }
    return projectsPromiseRef.current;
  }

  useEffect(() => {
    if (!open) return;
    loadProjects().then(setProjects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  async function send(q?: string, spoken = false) {
    const txt = (q ?? input).trim();
    if (!txt) return;
    setMsgs((m) => [...m, { from: 'user', text: txt }]);
    setInput('');
    const list = projects.length > 0 ? projects : await loadProjects();
    if (projects.length === 0 && list.length > 0) setProjects(list);
    const reply = answerQuery(txt, list);
    setMsgs((m) => [...m, { from: 'bot', text: reply }]);
    // Only answer aloud when the question was asked aloud — a portal that
    // starts talking at someone who typed is startling.
    if (spoken) {
      setSpeaking(true);
      speak(reply);
      window.setTimeout(() => setSpeaking(false), Math.min(reply.length * 70, 15000));
    }
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      send(transcript, true);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    stopSpeaking();
    setListening(true);
    recognition.start();
  }

  return (
    <div className="chat-fab">
      {open && (
        <div className="chat-window">
          <div className="chat-head">
            <div className="chat-avatar">
              <Icon icon="mdi:robot-happy-outline" width={20} color="#fff" />
            </div>
            <div>
              <div className="chat-title">VANI — Virtual Assistant</div>
              <div className="chat-online">
                {listening
                  ? 'Listening…'
                  : speaking
                    ? 'Speaking…'
                    : 'TN-GLMS Help Desk • Online'}
              </div>
            </div>
            <button
              className="chat-close"
              onClick={() => {
                stopSpeaking();
                setOpen(false);
              }}
              aria-label="Close assistant"
            >
              ×
            </button>
          </div>

          <div className="chat-msgs" ref={ref} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.from}`}>
                {m.text}
              </div>
            ))}
          </div>

          <div className="chat-chips">
            {['Project Status', 'Compensation', 'R&R', 'Grievance', 'Documents'].map((c) => (
              <button key={c} className="chip" onClick={() => send(c)}>
                {c}
              </button>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={listening ? 'Listening…' : 'Type your question…'}
              aria-label="Ask VANI a question"
            />
            {voiceSupported && (
              <button
                onClick={toggleListening}
                title={listening ? 'Stop listening' : 'Ask by voice'}
                aria-label={listening ? 'Stop listening' : 'Ask by voice'}
                style={{
                  background: listening ? 'var(--ux-orange)' : 'var(--ux-grey-200)',
                  color: listening ? '#fff' : 'var(--ux-primary)',
                  padding: '0 12px',
                }}
              >
                <Icon icon={listening ? 'mdi:microphone' : 'mdi:microphone-outline'} width={17} />
              </button>
            )}
            <button onClick={() => send()}>Send</button>
          </div>
        </div>
      )}

      <button
        className="chat-toggle"
        onClick={() => setOpen((o) => !o)}
        title="Chat with VANI — Virtual Assistant"
        aria-label="Chat with VANI — Virtual Assistant"
      >
        <Icon icon={open ? 'mdi:close' : 'mdi:chat-processing-outline'} width={26} color="#fff" />
      </button>
    </div>
  );
}
