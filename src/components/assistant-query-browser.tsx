"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  QUERY_CATEGORIES,
  answerAssistantQuery,
  categoryById,
  knowledgeStats,
  menuForCategory,
  type AssistantReply,
  type CategoryId,
  type LanguageCode,
  type PublicProjectLike,
} from "@/lib/ai/assistant";

/**
 * The assistant with its questions on show.
 *
 * A free-text box is a memory test: the user has to guess what the assistant
 * knows, and when they guess wrong the assistant looks stupid rather than
 * under-prompted. So the categories are the primary interface here and typing
 * is the secondary one — two taps through a subject to a written-out question
 * is not a fallback for people who cannot type, it is the faster path for
 * everyone, and on a phone handed across a table it is the only one that works.
 *
 * This is Lane E's own surface, embeddable anywhere. The public VANI widget
 * (`components/public/Chatbot.tsx`, Lane D) calls the same
 * `answerAssistantQuery` underneath, so the two cannot drift apart in what
 * they know — only in how they look.
 */

const LABELS = {
  heading: { en: "Ask about land acquisition", ta: "நில கையகப்படுத்தல் பற்றி கேளுங்கள்" },
  pickSubject: { en: "Pick a subject", ta: "ஒரு தலைப்பைத் தேர்ந்தெடுங்கள்" },
  orType: { en: "…or type a question in your own words", ta: "…அல்லது உங்கள் சொந்த வார்த்தைகளில் கேளுங்கள்" },
  placeholder: { en: "e.g. how much will I get for my land", ta: "எ.கா. எனது நிலத்திற்கு எவ்வளவு கிடைக்கும்" },
  send: { en: "Ask", ta: "கேள்" },
  back: { en: "All subjects", ta: "அனைத்து தலைப்புகள்" },
  basis: { en: "Legal basis", ta: "சட்ட அடிப்படை" },
  alsoAsk: { en: "You might also ask", ta: "இதையும் கேட்கலாம்" },
  reset: { en: "Start again", ta: "மீண்டும் தொடங்கு" },
} as const;

export function AssistantQueryBrowser({
  projects = [],
  showDiagnostics = false,
}: {
  projects?: PublicProjectLike[];
  /** Match diagnostics, for the sandbox page. Never shown to citizens. */
  showDiagnostics?: boolean;
}) {
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [openCategory, setOpenCategory] = useState<CategoryId | null>(null);
  const [typed, setTyped] = useState("");
  const [reply, setReply] = useState<AssistantReply | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => knowledgeStats(), []);
  const t = (key: keyof typeof LABELS) => LABELS[key][language];

  useEffect(() => {
    if (reply && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [reply]);

  function ask(query: string, category?: CategoryId) {
    const next = answerAssistantQuery(query, { projects, language, category });
    setReply(next);
    // Following a suggestion into a different subject should move the open
    // category with it, or the menu underneath contradicts the answer above.
    if (next.category && next.kind === "answer") setOpenCategory(next.category);
  }

  const questions = openCategory ? menuForCategory(openCategory) : [];
  const categoryMeta = openCategory ? categoryById(openCategory) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">{t("heading")}</h3>
          <p className="text-xs text-muted-foreground">
            {stats.total} pre-written answers across {stats.byCategory.length} subjects, every one
            in both languages, {stats.withBasis} citing a section of the Act.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-md border text-xs">
          {(["en", "ta"] as LanguageCode[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setLanguage(code);
                // Re-answer in the new language rather than leaving a stale
                // bubble in the language the user just switched away from.
                if (reply?.entry) {
                  setReply(answerAssistantQuery(reply.entry.id, { projects, language: code }));
                }
              }}
              className={`px-2.5 py-1 font-medium ${
                language === code ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {code === "en" ? "English" : "தமிழ்"}
            </button>
          ))}
        </div>
      </div>

      {/* Typing stays available, but under the menu rather than above it. */}
      <div className="flex gap-2">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              ask(typed, openCategory ?? undefined);
              setTyped("");
            }
          }}
          placeholder={t("placeholder")}
          aria-label={t("orType")}
          className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            ask(typed, openCategory ?? undefined);
            setTyped("");
          }}
          className="h-9 shrink-0 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          {t("send")}
        </button>
      </div>

      {!openCategory ? (
        <div>
          <p className="mb-2 text-xs font-medium text-foreground">{t("pickSubject")}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {QUERY_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setOpenCategory(category.id)}
                className="flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <Icon
                  icon={category.icon}
                  width={18}
                  className="mt-0.5 shrink-0 text-brand"
                  aria-hidden
                />
                <span>
                  <span className="block text-xs font-semibold text-foreground">
                    {category.label[language]}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    {category.blurb[language]}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              {categoryMeta && (
                <Icon icon={categoryMeta.icon} width={15} className="text-brand" aria-hidden />
              )}
              {categoryMeta?.label[language]}
            </p>
            <button
              type="button"
              onClick={() => setOpenCategory(null)}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              ← {t("back")}
            </button>
          </div>
          <div className="grid gap-1.5">
            {questions.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => ask(entry.id)}
                className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                  reply?.entry?.id === entry.id
                    ? "border-primary bg-primary/5 font-medium text-foreground"
                    : "text-foreground hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                {entry.question[language]}
              </button>
            ))}
          </div>
        </div>
      )}

      {reply && (
        <div ref={answerRef} className="space-y-3 rounded-md border bg-muted/20 p-3">
          <p
            className={`whitespace-pre-line text-sm leading-relaxed text-foreground ${
              reply.language === "ta" ? "ta" : ""
            }`}
          >
            {reply.text}
          </p>

          {reply.basis && (
            <p className="rounded border-l-2 border-l-primary/40 bg-primary/5 px-2 py-1.5 text-xs">
              <span className="font-medium text-foreground">{t("basis")}: </span>
              <span className="text-muted-foreground">{reply.basis}</span>
            </p>
          )}

          {reply.links && reply.links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {reply.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded border border-primary/40 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {reply.suggestions.length > 0 && (
            <div className="space-y-1.5 border-t pt-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">{t("alsoAsk")}</p>
              <div className="flex flex-wrap gap-1.5">
                {reply.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.ref}
                    type="button"
                    onClick={() => {
                      if (suggestion.ref.startsWith("category:")) {
                        setOpenCategory(suggestion.ref.slice("category:".length) as CategoryId);
                        setReply(null);
                        return;
                      }
                      ask(suggestion.ref);
                    }}
                    className="rounded-full border px-2.5 py-1 text-[11px] text-foreground hover:border-primary/40 hover:bg-background"
                  >
                    {suggestion.label[language]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showDiagnostics && (
            <p className="border-t pt-2 font-mono text-[10px] text-muted-foreground">
              kind={reply.kind} · confidence={reply.confidence.toFixed(2)} ·
              {reply.entry ? ` entry=${reply.entry.id} ·` : ""} matched={reply.matchedOn ?? "—"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
