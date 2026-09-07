'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import {
  answerAssistantQuery,
  answerSuggestion,
  QUERY_CATEGORIES,
  type AssistantReply,
  type LanguageCode,
  type PublicProjectLike,
} from '@/lib/ai/assistant';
import {
  getSpeechRecognition,
  speak,
  stopSpeaking,
  type SpeechRecognitionLike,
} from '@/lib/voice-assistant';

type ChatMessage = {
  from: 'bot' | 'user';
  text: string;
  reply?: AssistantReply;
};

const GREETING: Record<LanguageCode, string> = {
  en: 'Hello. I am VANI, the NILAMS virtual assistant. Ask about project status, compensation, R&R, rights, grievances or documents.',
  ta: 'வணக்கம். நான் NILAMS மெய்நிகர் உதவியாளர் VANI. திட்ட நிலை, இழப்பீடு, மறுவாழ்வு, உரிமைகள், குறைகள் அல்லது ஆவணங்கள் பற்றி கேளுங்கள்.',
};

const CATEGORY_LABELS: Record<string, { en: string; ta: string }> = {
  compensation: { en: 'Compensation', ta: 'இழப்பீடு' },
  rr: { en: 'R&R', ta: 'மறுவாழ்வு' },
  status: { en: 'Project status', ta: 'திட்ட நிலை' },
  grievance: { en: 'Grievances', ta: 'குறைகள்' },
  documents: { en: 'Documents', ta: 'ஆவணங்கள்' },
  rights: { en: 'Rights', ta: 'உரிமைகள்' },
};

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    { from: 'bot', text: GREETING.en },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [sending, setSending] = useState(false);
  const [projects, setProjects] = useState<PublicProjectLike[]>([]);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const projectsPromiseRef = useRef<Promise<PublicProjectLike[]> | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVoiceSupported(getSpeechRecognition() !== null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [msgs]);

  function loadProjects(): Promise<PublicProjectLike[]> {
    if (!projectsPromiseRef.current) {
      projectsPromiseRef.current = fetch('/api/public/projects')
        .then((res) => {
          if (!res.ok) throw new Error('Project lookup unavailable');
          return res.json();
        })
        .then((data: { projects?: PublicProjectLike[] }) => data.projects ?? [])
        .catch(() => []);
    }
    return projectsPromiseRef.current;
  }

  useEffect(() => {
    if (!open) return;
    loadProjects().then(setProjects);
  }, [open]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  function changeLanguage(next: LanguageCode) {
    setLanguage(next);
    setMsgs((current) => [
      ...current,
      { from: 'bot', text: GREETING[next] },
    ]);
  }

  async function send(query?: string, spoken = false) {
    const text = (query ?? input).trim();
    if (!text || sending) return;

    setSending(true);
    setMsgs((current) => [...current, { from: 'user', text }]);
    setInput('');

    const list = projects.length > 0 ? projects : await loadProjects();
    if (projects.length === 0 && list.length > 0) setProjects(list);

    const reply = answerAssistantQuery(text, {
      projects: list,
      language,
    });
    setMsgs((current) => [...current, { from: 'bot', text: reply.text, reply }]);
    setSending(false);

    if (spoken) {
      setSpeaking(true);
      speak(reply.text, language === 'ta' ? 'ta-IN' : 'en-IN');
      window.setTimeout(() => setSpeaking(false), Math.min(reply.text.length * 65, 15000));
    }
  }

  function sendSuggestion(refId: string, spoken = false) {
    const reply = answerSuggestion(refId, { projects, language });
    setMsgs((current) => [...current, { from: 'bot', text: reply.text, reply }]);
    if (spoken) speak(reply.text, language === 'ta' ? 'ta-IN' : 'en-IN');
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
    recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      void send(event.results[0][0].transcript, true);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    stopSpeaking();
    setListening(true);
    recognition.start();
  }

  function clearConversation() {
    stopSpeaking();
    setSpeaking(false);
    setMsgs([{ from: 'bot', text: GREETING[language] }]);
  }

  return (
    <div className="chat-fab">
      {open && (
        <div className="chat-window" role="dialog" aria-label="VANI virtual assistant">
          <div className="chat-head">
            <div className="chat-avatar">
              <Icon icon="mdi:robot-happy-outline" width={20} color="#fff" />
            </div>
            <div>
              <div className="chat-title">VANI | Virtual Assistant</div>
              <div className="chat-online">
                {listening
                  ? language === 'ta' ? 'கேட்கிறது...' : 'Listening...'
                  : speaking
                    ? language === 'ta' ? 'பேசுகிறது...' : 'Speaking...'
                    : language === 'ta' ? 'NILAMS உதவி மையம்' : 'NILAMS Help Desk'}
              </div>
            </div>
            <div className="chat-head-actions">
              <button
                className="chat-language"
                onClick={() => changeLanguage(language === 'en' ? 'ta' : 'en')}
                aria-label={language === 'en' ? 'Switch to Tamil' : 'Switch to English'}
              >
                {language === 'en' ? 'தமிழ்' : 'EN'}
              </button>
              <button onClick={clearConversation} className="chat-close" aria-label="Clear conversation">
                <Icon icon="mdi:broom" width={18} />
              </button>
              <button onClick={() => setOpen(false)} className="chat-close" aria-label="Close assistant">
                <Icon icon="mdi:close" width={18} />
              </button>
            </div>
          </div>

          <div className="chat-msgs" ref={ref} aria-live="polite">
            {msgs.map((message, index) => (
              <div key={`${message.from}-${index}`} className={`chat-bubble ${message.from}`}>
                <div>{message.text}</div>
                {message.reply?.basis && (
                  <div className="chat-basis">
                    {language === 'ta' ? 'சட்ட அடிப்படை: ' : 'Legal basis: '}
                    {message.reply.basis}
                  </div>
                )}
                {message.reply?.links && message.reply.links.length > 0 && (
                  <div className="chat-links">
                    {message.reply.links.map((link) => (
                      <a key={link.href} href={link.href}>{link.label}</a>
                    ))}
                  </div>
                )}
                {message.reply && message.reply.suggestions.length > 0 && (
                  <div className="chat-suggestions">
                    {message.reply.suggestions.slice(0, 3).map((suggestion) => (
                      <button key={suggestion.ref} onClick={() => sendSuggestion(suggestion.ref)}>
                        {suggestion.label[language]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="chat-bubble bot" aria-label="Preparing answer">
                {language === 'ta' ? 'பதிலைத் தயாரிக்கிறது...' : 'Preparing an answer...'}
              </div>
            )}
          </div>

          <div className="chat-chips">
            {QUERY_CATEGORIES.slice(0, 6).map((category) => (
              <button
                key={category.id}
                className="chip"
                onClick={() => sendSuggestion(`category:${category.id}`)}
              >
                {CATEGORY_LABELS[category.id]?.[language] ?? category.label[language]}
              </button>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void send();
              }}
              placeholder={listening
                ? language === 'ta' ? 'கேள்வியைச் சொல்லுங்கள்...' : 'Listening...'
                : language === 'ta' ? 'உங்கள் கேள்வியை எழுதுங்கள்...' : 'Type your question...'}
              aria-label={language === 'ta' ? 'VANI-யிடம் கேளுங்கள்' : 'Ask VANI a question'}
              disabled={sending}
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
            <button onClick={() => void send()} disabled={sending}>
              {language === 'ta' ? 'அனுப்பு' : 'Send'}
            </button>
          </div>
        </div>
      )}

      <button
        className="chat-toggle"
        onClick={() => setOpen((current) => !current)}
        title={language === 'ta' ? 'VANI உதவியாளருடன் பேசுங்கள்' : 'Chat with VANI'}
        aria-label={language === 'ta' ? 'VANI உதவியாளரைத் திறக்கவும்' : 'Open VANI assistant'}
      >
        <Icon icon={open ? 'mdi:close' : 'mdi:chat-processing-outline'} width={26} color="#fff" />
      </button>
    </div>
  );
}
