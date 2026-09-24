'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import {
  answerAssistantQuery,
  answerSuggestion,
  pickText,
  QUERY_CATEGORIES,
  type AssistantReply,
  type BilingualText,
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
  hi: 'नमस्ते। मैं वाणी हूँ, NILAMS की सहायक। परियोजना की स्थिति, प्रतिकर, पुनर्वास, अधिकार, शिकायत या दस्तावेज़ों के बारे में पूछिए।',
};

/** The three portal languages, in the order the header button cycles them. */
const LANGUAGE_CYCLE: { code: LanguageCode; short: string; speech: string }[] = [
  { code: 'en', short: 'EN', speech: 'en-IN' },
  { code: 'hi', short: 'हिं', speech: 'hi-IN' },
  { code: 'ta', short: 'தமிழ்', speech: 'ta-IN' },
];

function speechLang(language: LanguageCode): string {
  return LANGUAGE_CYCLE.find((l) => l.code === language)?.speech ?? 'en-IN';
}

const CATEGORY_LABELS: Record<string, BilingualText> = {
  compensation: { en: 'Compensation', ta: 'இழப்பீடு', hi: 'प्रतिकर' },
  rr: { en: 'R&R', ta: 'மறுவாழ்வு', hi: 'पुनर्वास' },
  status: { en: 'Project status', ta: 'திட்ட நிலை', hi: 'परियोजना की स्थिति' },
  grievance: { en: 'Grievances', ta: 'குறைகள்', hi: 'शिकायतें' },
  documents: { en: 'Documents', ta: 'ஆவணங்கள்', hi: 'दस्तावेज़' },
  rights: { en: 'Rights', ta: 'உரிமைகள்', hi: 'अधिकार' },
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
  // Three languages in one small header: the button shows the next one.
  const nextLanguage =
    LANGUAGE_CYCLE[(LANGUAGE_CYCLE.findIndex((l) => l.code === language) + 1) % LANGUAGE_CYCLE.length];
  const t = (text: BilingualText) => pickText(text, language);
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
      speak(reply.text, speechLang(language));
      window.setTimeout(() => setSpeaking(false), Math.min(reply.text.length * 65, 15000));
    }
  }

  function sendSuggestion(refId: string, spoken = false) {
    const reply = answerSuggestion(refId, { projects, language });
    setMsgs((current) => [...current, { from: 'bot', text: reply.text, reply }]);
    if (spoken) speak(reply.text, speechLang(language));
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
    recognition.lang = speechLang(language);
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
                  ? t({ en: 'Listening...', ta: 'கேட்கிறது...', hi: 'सुन रही हूँ…' })
                  : speaking
                    ? t({ en: 'Speaking...', ta: 'பேசுகிறது...', hi: 'बोल रही हूँ…' })
                    : t({ en: 'NILAMS Help Desk', ta: 'NILAMS உதவி மையம்', hi: 'NILAMS सहायता केंद्र' })}
              </div>
            </div>
            <div className="chat-head-actions">
              <button
                className="chat-language"
                onClick={() => changeLanguage(nextLanguage.code)}
                aria-label={`Switch to ${nextLanguage.code === 'en' ? 'English' : nextLanguage.code === 'hi' ? 'Hindi' : 'Tamil'}`}
              >
                {nextLanguage.short}
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
                {/* The answer bank is being translated; an entry with no text
                    in the chosen language answers in English rather than not
                    at all, and says which it did. */}
                {message.reply?.entry && !message.reply.entry.answer[language] && (
                  <div className="chat-basis">
                    {t({
                      en: '',
                      ta: 'இந்தப் பதில் தற்போது ஆங்கிலத்தில் மட்டும்.',
                      hi: 'यह उत्तर फ़िलहाल केवल अंग्रेज़ी में उपलब्ध है।',
                    })}
                  </div>
                )}
                {message.reply?.basis && (
                  <div className="chat-basis">
                    {t({ en: 'Legal basis: ', ta: 'சட்ட அடிப்படை: ', hi: 'कानूनी आधार: ' })}
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
                {t({ en: 'Preparing an answer...', ta: 'பதிலைத் தயாரிக்கிறது...', hi: 'उत्तर तैयार कर रही हूँ…' })}
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
                {pickText(CATEGORY_LABELS[category.id] ?? category.label, language)}
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
                ? t({ en: 'Listening...', ta: 'கேள்வியைச் சொல்லுங்கள்...', hi: 'सुन रही हूँ…' })
                : t({ en: 'Type your question...', ta: 'உங்கள் கேள்வியை எழுதுங்கள்...', hi: 'अपना सवाल लिखिए…' })}
              aria-label={t({ en: 'Ask VANI a question', ta: 'VANI-யிடம் கேளுங்கள்', hi: 'वाणी से सवाल पूछें' })}
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
              {t({ en: 'Send', ta: 'அனுப்பு', hi: 'भेजें' })}
            </button>
          </div>
        </div>
      )}

      <button
        className="chat-toggle"
        data-tour="chatbot-launch"
        onClick={() => setOpen((current) => !current)}
        title={t({ en: 'Chat with VANI', ta: 'VANI உதவியாளருடன் பேசுங்கள்', hi: 'वाणी से बात करें' })}
        aria-label={t({ en: 'Open VANI assistant', ta: 'VANI உதவியாளரைத் திறக்கவும்', hi: 'वाणी सहायक खोलें' })}
      >
        <Icon icon={open ? 'mdi:close' : 'mdi:chat-processing-outline'} width={26} color="#fff" />
      </button>
    </div>
  );
}
