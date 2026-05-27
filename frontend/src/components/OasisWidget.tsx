import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { Icon } from './Icon';
import { useUiStore } from '../stores/ui.store';
import { useI18nStore } from '../stores/i18n.store';
import { useAiChat } from '../hooks/useResources';
import { useAudioCue } from '../hooks/useAudioCue';

interface ChatMsg {
  role: 'bot' | 'user';
  text: string;
}

const SUGGESTIONS_AR = [
  'كيف أحسّن معدلي التراكمي؟',
  'اشرح لي مفهوماً صعباً',
  'اقترح خطة مذاكرة',
];

const SUGGESTIONS_EN = [
  'How can I improve my GPA?',
  'Explain a difficult concept',
  'Suggest a study plan',
];

export function OasisWidget() {
  const oasisOpen = useUiStore((s) => s.oasisOpen);
  const toggleOasis = useUiStore((s) => s.toggleOasis);
  const closeOasis = useUiStore((s) => s.closeOasis);
  const dir = useI18nStore((s) => s.dir);
  const locale = useI18nStore((s) => s.locale);
  const t = useI18nStore((s) => s.t);

  const chat = useAiChat();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);
  const playClick = useAudioCue((s) => s.playClick);

  const MAX_MESSAGES = 50;

  const suggestions = locale === 'ar' ? SUGGESTIONS_AR : SUGGESTIONS_EN;
  const welcomeMsg = locale === 'ar'
    ? 'مرحباً! أنا واحة - مساعدك الذكي. كيف أساعدك؟'
    : 'Hello! I am Oasis - your AI assistant. How can I help?';

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chat.isPending]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || chat.isPending) return;
    playClick();
    setMessages((m) => [...m, { role: 'user' as const, text: msg }].slice(-MAX_MESSAGES));
    setInput('');
    try {
      const res = await chat.mutateAsync({ conversationId, message: msg });
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: 'bot' as const, text: res.reply }].slice(-MAX_MESSAGES));
    } catch {
      const errorMsg = locale === 'ar' ? 'تعذّر الاتصال. حاول لاحقاً.' : 'Connection failed. Try again later.';
      setMessages((m) => [...m, { role: 'bot' as const, text: errorMsg }].slice(-MAX_MESSAGES));
    }
  };

  const positionClass = dir === 'rtl' ? 'oasis-widget--rtl' : 'oasis-widget--ltr';

  return (
    <div className={`oasis-widget ${positionClass}`}>
      {/* Floating trigger button */}
      {!oasisOpen && (
        <button
          type="button"
          className="oasis-widget__trigger float-widget-pulse"
          onClick={toggleOasis}
          aria-label={locale === 'ar' ? 'فتح المساعد الذكي' : 'Open AI Assistant'}
        >
          <Icon icon={Bot} size={22} />
        </button>
      )}

      {/* Chat panel */}
      {oasisOpen && (
        <div className="oasis-widget__panel reveal-up revealed">
          {/* Header */}
          <header className="oasis-widget__header">
            <div className="oasis-widget__header-title">
              <Icon icon={Bot} size={16} />
              <span>{locale === 'ar' ? 'واحة' : 'Oasis'}</span>
            </div>
            <div className="oasis-widget__header-actions">
              <button
                type="button"
                onClick={closeOasis}
                aria-label={t('action.close')}
                className="oasis-widget__btn"
              >
                <Icon icon={X} size={14} />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div className="oasis-widget__messages" ref={scrollerRef}>
            {messages.length === 0 && (
              <div className="oasis-widget__welcome">
                <div className="oasis-widget__welcome-icon">
                  <Icon icon={Bot} size={28} />
                </div>
                <p className="oasis-widget__welcome-text">{welcomeMsg}</p>
                <div className="oasis-widget__suggestions">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="oasis-widget__chip"
                      onClick={() => void send(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`oasis-widget__msg oasis-widget__msg--${m.role}`}>
                <div className="oasis-widget__msg-bubble">
                  {m.text}
                </div>
              </div>
            ))}

            {chat.isPending && (
              <div className="oasis-widget__msg oasis-widget__msg--bot">
                <div className="oasis-widget__msg-bubble oasis-widget__typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="oasis-widget__input-row">
            <input
              type="text"
              className="oasis-widget__input"
              placeholder={locale === 'ar' ? 'اكتب سؤالك...' : 'Type your question...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
              disabled={chat.isPending}
            />
            <button
              type="button"
              className="oasis-widget__send"
              onClick={() => void send()}
              disabled={!input.trim() || chat.isPending}
              aria-label={t('action.submit')}
            >
              <Icon icon={Send} size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
