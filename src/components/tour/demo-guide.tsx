"use client";

/**
 * The demo walkthrough: a guide who does the demo for you.
 *
 * A judge opening this site has minutes, no account and no documentation. So
 * Nila picks the language, makes them their own copy of a case in their own
 * region, and then walks the acquisition end to end — spotlighting the thing
 * she is talking about and, if they press Next, pressing it for them. Every
 * step is a real element on a real page: the same button they could click
 * themselves, which is the difference between a walkthrough and a video.
 *
 * Three rules it keeps:
 *   - The voice stops the instant the step changes. Nothing is ever heard
 *     describing a screen that is no longer there.
 *   - Next performs the step. The judge never has to work out what to click.
 *   - Doing it yourself works too, and moves the tour on with you.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { GuideAvatar, type GuideMood } from "./guide-avatar";
import { useSecondLang } from "@/components/lang-provider";
import {
  TOUR_LANGUAGES,
  TOUR_LANG_COOKIE,
  audioLangFor,
  tourLanguage,
} from "@/lib/tour/languages";
import { TOUR_STEPS, TOTAL_STEPS, stepRoute, type TourStep } from "@/lib/tour/steps";
import { mark } from "@/lib/tour/clock";
import type { SecondLang } from "@/lib/lang";

const STATE_KEY = "nilams_tour_state";

interface DemoSession {
  projectId: string;
  counts: { plots: number; owners: number };
  users: { district: { id: string }; state: { id: string } };
  region: {
    id: string;
    state: string; stateNative: string;
    district: string; districtNative: string;
    town: string; townNative: string;
    river: string; riverNative: string;
    village: string; villageNative: string;
    projectName: string; projectNameNative: string;
    court: string;
    uiSecond: SecondLang;
  };
}

interface Texts {
  ui: Record<string, string>;
  steps: Record<string, string>;
}

type Phase = "idle" | "picker" | "running" | "minimised";

/* ── DOM helpers ──────────────────────────────────────────────────────── */

function findTarget(name: string | undefined): HTMLElement | null {
  if (!name) return null;
  return document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
}

/**
 * Presses an element the way a person would.
 *
 * `click()` alone is not enough here: Radix tabs and menus act on pointerdown,
 * so a plain click leaves the tab unchanged and the tour talking about a panel
 * that never opened.
 */
function pressElement(el: HTMLElement) {
  const opts = { bubbles: true, cancelable: true, view: window } as const;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.dispatchEvent(new PointerEvent("pointerdown", { ...opts, pointerId: 1, isPrimary: true }));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new PointerEvent("pointerup", { ...opts, pointerId: 1, isPrimary: true }));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.click();
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Waits for an element to exist, giving the page time to render it. */
async function waitForTarget(name: string, timeout = 8000): Promise<HTMLElement | null> {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const el = findTarget(name);
    if (el) return el;
    await wait(150);
  }
  return null;
}

function waitForEvent(name: string, timeout = 20000): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      window.removeEventListener(name, done);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, timeout);
    window.addEventListener(name, done);
  });
}

/** Loads the Google font for a script the judge's device may not have. */
function loadFont(family: string | undefined) {
  if (!family) return;
  const id = `tour-font-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}:wght@400;600&display=swap`;
  document.head.appendChild(link);
}

/* ── The guide ────────────────────────────────────────────────────────── */

export function DemoGuide() {
  const router = useRouter();
  const pathname = usePathname();
  const { setL2 } = useSecondLang();

  const [phase, setPhase] = useState<Phase>("idle");
  const [lang, setLang] = useState<string | null>(null);
  const [texts, setTexts] = useState<Texts | null>(null);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // True while the guide is pressing something itself. Without it, the guide's
  // own click also fires the "they did it themselves" listener below, and the
  // tour jumps two steps at once.
  const pressingRef = useRef(false);
  const step: TourStep | undefined = TOUR_STEPS[index];

  /* ── Restore ────────────────────────────────────────────────────────── */

  useEffect(() => {
    setMobile(window.matchMedia("(max-width: 640px)").matches);
    let saved: { lang?: string; index?: number; phase?: Phase; muted?: boolean } = {};
    try {
      saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? "{}");
    } catch {
      saved = {};
    }
    if (saved.muted) setMuted(true);
    if (!saved.lang) {
      setPhase("picker");
      return;
    }
    setLang(saved.lang);
    setIndex(saved.index ?? 0);
    setPhase(saved.phase === "running" ? "running" : "minimised");
    loadFont(tourLanguage(saved.lang).font);
    void loadTexts(saved.lang);
    void refreshSession();
  }, []);

  useEffect(() => {
    if (!lang) return;
    localStorage.setItem(STATE_KEY, JSON.stringify({ lang, index, phase, muted }));
  }, [lang, index, phase, muted]);

  async function loadTexts(code: string) {
    for (const candidate of [code, "en"]) {
      try {
        const res = await fetch(`/tour/i18n/${candidate}.json`);
        if (res.ok) {
          setTexts((await res.json()) as Texts);
          return;
        }
      } catch {
        /* try the next one */
      }
    }
  }

  async function refreshSession() {
    try {
      const res = await fetch("/api/demo/start");
      const body = (await res.json()) as DemoSession & { projectId: string | null };
      if (body.projectId) setSession(body as DemoSession);
    } catch {
      /* the tour still works; only the project id is missing */
    }
  }

  /* ── Text ───────────────────────────────────────────────────────────── */

  const vars = useMemo(() => {
    const r = session?.region;
    const native = lang !== "en" && lang !== null;
    return {
      district: (native ? r?.districtNative : r?.district) ?? "the district",
      state: (native ? r?.stateNative : r?.state) ?? "",
      river: (native ? r?.riverNative : r?.river) ?? "the river",
      town: (native ? r?.townNative : r?.town) ?? "",
      village: (native ? r?.villageNative : r?.village) ?? "",
      project: (native ? r?.projectNameNative : r?.projectName) ?? "",
      court: r?.court ?? "the High Court",
      plots: String(session?.counts.plots ?? 32),
      owners: String(session?.counts.owners ?? 60),
      n: String(index + 1),
      total: String(TOTAL_STEPS),
    } as Record<string, string>;
  }, [session, lang, index]);

  const fill = useCallback(
    (text: string | undefined) => (text ?? "").replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? ""),
    [vars]
  );

  const ui = useCallback((key: string) => fill(texts?.ui[key]) || key, [fill, texts]);
  const langMeta = tourLanguage(lang);

  /* ── Voice ──────────────────────────────────────────────────────────── */

  // Stops the moment the step changes: the guide never narrates the last
  // screen over the new one.
  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    if (phase !== "running" || !step) return;
    mark("step:shown", `${index + 1} ${step.id}`);
    if (muted || !lang || !texts) return;

    let cancelled = false;
    const audio = new Audio(`/tour/audio/${audioLangFor(lang)}/${step.id}.mp3`);
    audioRef.current = audio;
    audio.play().catch(() => {
      // No pre-rendered clip (or autoplay refused): fall back to the browser's
      // own voice, which at least keeps the step spoken.
      if (cancelled || typeof window.speechSynthesis === "undefined") return;
      const utterance = new SpeechSynthesisUtterance(fill(texts.steps[step.id]));
      utterance.lang = lang === "en" ? "en-IN" : `${audioLangFor(lang)}-IN`;
      window.speechSynthesis.speak(utterance);
    });

    return () => {
      cancelled = true;
      audio.pause();
      window.speechSynthesis?.cancel();
    };
  }, [index, phase, muted, lang, step, texts, fill]);

  /* ── Spotlight tracking ─────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== "running" || !step) return;
    let frame = 0;
    let scrolled = false;

    let announced = false;
    const track = () => {
      const el = findTarget(step.target);
      if (el) {
        const box = el.getBoundingClientRect();
        setRect((prev) => {
          if (!prev) return box;
          if (
            Math.abs(prev.top - box.top) < 1 &&
            Math.abs(prev.left - box.left) < 1 &&
            Math.abs(prev.width - box.width) < 1 &&
            Math.abs(prev.height - box.height) < 1
          ) {
            return prev;
          }
          return box;
        });
        if (!announced) {
          announced = true;
          mark("step:target", `${step.id} ${step.target ?? ""}`);
        }
        if (!scrolled && (box.top < 80 || box.bottom > window.innerHeight - 80)) {
          scrolled = true;
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      } else {
        setRect((prev) => (prev === null ? null : null));
      }
      frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);
    return () => cancelAnimationFrame(frame);
  }, [phase, step, index, pathname]);

  /* ── Doing it themselves ────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== "running" || !step?.selfClick || !step.target) return;
    let alive = true;

    const attach = async () => {
      const el = await waitForTarget(step.target!, 6000);
      if (!el || !alive) return;
      const onClick = () => {
        if (pressingRef.current) return;
        el.removeEventListener("click", onClick);
        // Their click already did the work; just follow them.
        setTimeout(() => advance(), step.settle ?? 600);
      };
      el.addEventListener("click", onClick);
      return () => el.removeEventListener("click", onClick);
    };
    const cleanup = attach();
    return () => {
      alive = false;
      void cleanup.then((fn) => fn?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, pathname]);

  /* ── Navigation ─────────────────────────────────────────────────────── */

  // Each step belongs on a page. If the judge wandered off it, go back.
  useEffect(() => {
    if (phase !== "running" || !step || busy) return;
    const want = stepRoute(step, session?.projectId ?? null);
    if (want && pathname !== want) router.push(want);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, session?.projectId]);

  /* ── Steps ──────────────────────────────────────────────────────────── */

  const advance = useCallback(() => {
    setDownloaded(false);
    setIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
  }, []);

  async function runAction(current: TourStep) {
    const projectId = session?.projectId ?? null;

    switch (current.action.kind) {
      case "none":
        return;

      case "click": {
        const el = await waitForTarget(current.action.target ?? current.target ?? "");
        if (el) pressElement(el);
        return;
      }

      case "goto": {
        if (current.action.to.includes("{project}") && !projectId) return;
        router.push(current.action.to.replace("{project}", projectId ?? ""));
        return;
      }

      case "login": {
        const userId =
          current.action.as === "central"
            ? "u-central-1"
            : current.action.as === "state"
              ? session?.users.state.id
              : session?.users.district.id;
        if (!userId) return;
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const next = TOUR_STEPS[index + 1];
        const to = next ? stepRoute(next, projectId) : "/app";
        router.push(to ?? "/app");
        router.refresh();
        return;
      }

      case "intake": {
        // The panel does the work: it fetches the kit file, sets the record
        // type and runs the preview, exactly as a dropped file would.
        window.dispatchEvent(
          new CustomEvent("nilams-tour:intake", {
            detail: { category: current.action.category, url: `/api/demo/kit/${current.action.kit}` },
          })
        );
        return;
      }

      case "census": {
        await fetch("/api/demo/census", { method: "POST" });
        router.refresh();
        window.dispatchEvent(new CustomEvent("nilams-tour:census-done"));
        const tab = await waitForTarget("tab-rr", 4000);
        if (tab) pressElement(tab);
        return;
      }

      case "stayForm": {
        const open = await waitForTarget("add-dispute", 6000);
        if (open) pressElement(open);
        const form = (await waitForTarget("dispute-form", 6000)) as HTMLFormElement | null;
        if (!form) return;

        const today = new Date();
        const filed = new Date(today.getTime() - 26 * 24 * 60 * 60 * 1000);
        const hearing = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000);
        const values: Record<string, string> = {
          caseNumber: `WP (C) ${4100 + (today.getDate() * 7) % 800}/${today.getFullYear()}`,
          court: session?.region.court ?? "High Court",
          title: `Landowners' Association v. State of ${session?.region.state ?? ""}`,
          partyName: "Village Landowners' Association",
          filedDate: filed.toISOString().slice(0, 10),
          nextHearingDate: hearing.toISOString().slice(0, 10),
          summary:
            "Writ petition challenging the adequacy of the social impact assessment. The court has stayed further proceedings, including disbursement of compensation, until the next hearing.",
        };

        for (const [name, value] of Object.entries(values)) {
          const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
          if (!field) continue;
          const setter = Object.getOwnPropertyDescriptor(
            field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
            "value"
          )?.set;
          setter?.call(field, value);
          field.dispatchEvent(new Event("input", { bubbles: true }));
          field.dispatchEvent(new Event("change", { bubbles: true }));
          await wait(90);
        }

        const stayBox = form.elements.namedItem("isStayOrder") as HTMLInputElement | null;
        if (stayBox && !stayBox.checked) pressElement(stayBox);
        await wait(400);
        form.requestSubmit();
        await waitForTarget("stay-banner", 9000);
        window.dispatchEvent(new CustomEvent("nilams-tour:stay-recorded"));
        return;
      }
    }
  }

  async function onNext() {
    if (!step || busy) return;
    if (index === TOUR_STEPS.length - 1) {
      mark("tour:finished", lang ?? "");
      setPhase("minimised");
      return;
    }
    setBusy(true);
    pressingRef.current = true;
    mark("step:action", `${index + 1} ${step.id} ${step.action.kind}`);
    try {
      await runAction(step);
      if (step.awaitEvent) await waitForEvent(step.awaitEvent);
      if (step.settle) await wait(step.settle);
    } finally {
      setBusy(false);
    }
    mark("step:done", `${index + 1} ${step.id}`);
    advance();
    // Released a beat later: a click the guide made can still be in flight.
    setTimeout(() => {
      pressingRef.current = false;
    }, 400);
  }

  async function chooseLanguage(code: string) {
    setBusy(true);
    mark("tour:language", code);
    setLang(code);
    document.cookie = `${TOUR_LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    loadFont(tourLanguage(code).font);
    await loadTexts(code);
    try {
      const res = await fetch("/api/demo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: code }),
      });
      const body = (await res.json()) as DemoSession;
      setSession(body);
      // The site's second language follows the region: Tamil beside English in
      // Tamil Nadu, Hindi everywhere else.
      if (body.region?.uiSecond) setL2(body.region.uiSecond);
    } catch {
      /* the tour runs without a sandbox; the upload steps simply have none */
    }
    setIndex(0);
    setPhase("running");
    setBusy(false);
  }

  async function downloadKit(kind: string) {
    setDownloaded(true);
    window.location.href = `/api/demo/kit/${kind}`;
  }

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (phase === "idle") return null;

  if (phase === "picker") {
    return (
      <div className="tour-scrim" role="dialog" aria-modal="true" aria-label="Choose your language">
        <div className="tour-picker">
          <div className="tour-picker-head">
            <GuideAvatar size={86} mood="talking" />
            <div>
              <h2>Choose your language / अपनी भाषा चुनें</h2>
              <p>
                Nila will walk you through a live land acquisition — in your language, with a case
                from your region. The site stays English with Hindi or Tamil.
              </p>
            </div>
          </div>
          <div className="tour-langs">
            {TOUR_LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => chooseLanguage(l.code)}
                disabled={busy}
                className="tour-lang"
                style={l.font ? { fontFamily: `'${l.font}', system-ui, sans-serif` } : undefined}
                lang={l.code}
              >
                <span className="tour-lang-native">{l.native}</span>
                <span className="tour-lang-en">{l.english}</span>
              </button>
            ))}
          </div>
          <button className="tour-skip" onClick={() => setPhase("minimised")} disabled={busy}>
            Skip — I&apos;ll explore on my own
          </button>
        </div>
        <GuideStyles />
      </div>
    );
  }

  if (phase === "minimised") {
    return (
      <>
        <div className="tour-dock">
          {menuOpen && (
            <div className="tour-menu">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setPhase("running");
                }}
              >
                <Icon icon="mdi:play-circle-outline" width={18} /> {ui(index > 0 ? "resume" : "start")}
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setIndex(0);
                  setPhase("running");
                }}
              >
                <Icon icon="mdi:restart" width={18} /> {ui("restart")}
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setPhase("picker");
                }}
              >
                <Icon icon="mdi:translate" width={18} /> {ui("changeLang")}
              </button>
            </div>
          )}
          <button
            className="tour-fab"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={ui("guideRole")}
          >
            <GuideAvatar size={54} mood="idle" />
          </button>
        </div>
        <GuideStyles />
      </>
    );
  }

  const body = fill(texts?.steps[step?.id ?? ""]) || "…";
  const mood: GuideMood = busy ? "working" : index === TOUR_STEPS.length - 1 ? "cheer" : "talking";
  const hole = rect && rect.width > 0 ? rect : null;
  const bubbleBelow = !hole || hole.bottom < window.innerHeight * 0.55;

  return (
    <>
      {/* Dimmed everywhere except the thing being talked about. */}
      <div className="tour-overlay" aria-hidden="true">
        {hole ? (
          <>
            <div className="tour-shade" style={{ inset: `0 0 auto 0`, height: Math.max(hole.top - 8, 0) }} />
            <div
              className="tour-shade"
              style={{ top: Math.max(hole.bottom + 8, 0), bottom: 0, left: 0, right: 0 }}
            />
            <div
              className="tour-shade"
              style={{ top: Math.max(hole.top - 8, 0), height: hole.height + 16, left: 0, width: Math.max(hole.left - 8, 0) }}
            />
            <div
              className="tour-shade"
              style={{
                top: Math.max(hole.top - 8, 0),
                height: hole.height + 16,
                left: hole.right + 8,
                right: 0,
              }}
            />
            <div
              className="tour-ring"
              style={{ top: hole.top - 8, left: hole.left - 8, width: hole.width + 16, height: hole.height + 16 }}
            />
          </>
        ) : (
          <div className="tour-shade" style={{ inset: 0 }} />
        )}
      </div>

      <div
        className={`tour-bubble ${mobile ? "tour-bubble-mobile" : bubbleBelow ? "tour-bubble-below" : "tour-bubble-above"}`}
        style={
          mobile || !hole
            ? undefined
            : {
                top: bubbleBelow ? Math.min(hole.bottom + 22, window.innerHeight - 250) : undefined,
                bottom: bubbleBelow ? undefined : Math.min(window.innerHeight - hole.top + 22, window.innerHeight - 250),
                left: Math.min(Math.max(hole.left + hole.width / 2 - 200, 16), window.innerWidth - 416),
              }
        }
        role="dialog"
        aria-live="polite"
        lang={langMeta.code}
        dir={langMeta.rtl ? "rtl" : "ltr"}
      >
        <div className="tour-bubble-top">
          <GuideAvatar size={56} mood={mood} />
          <div className="tour-who">
            <strong>{ui("guideName")}</strong>
            <span>{ui("step").replace("{n}", String(index + 1)).replace("{total}", String(TOTAL_STEPS))}</span>
          </div>
          <div className="tour-tools">
            <button onClick={() => setMuted((m) => !m)} aria-label={ui(muted ? "unmute" : "mute")}>
              <Icon icon={muted ? "mdi:volume-off" : "mdi:volume-high"} width={18} />
            </button>
            <button onClick={() => setPhase("minimised")} aria-label={ui("close")}>
              <Icon icon="mdi:close" width={18} />
            </button>
          </div>
        </div>

        <p className="tour-text" style={langMeta.font ? { fontFamily: `'${langMeta.font}', system-ui, sans-serif` } : undefined}>
          {body}
        </p>

        {langMeta.audioFrom && !muted && <p className="tour-note">{ui("voiceNote")}</p>}

        {step?.download && (
          <button className="tour-download" onClick={() => downloadKit(step.download!)} data-tour="tour-download">
            <Icon icon={downloaded ? "mdi:check-circle" : "mdi:download"} width={20} />
            {downloaded ? ui("downloaded") : ui("download")}
          </button>
        )}

        <div className="tour-progress">
          <span style={{ width: `${((index + 1) / TOTAL_STEPS) * 100}%` }} />
        </div>

        <div className="tour-actions">
          <button className="tour-ghost" onClick={() => setPhase("minimised")}>
            {ui("skip")}
          </button>
          <div className="tour-right">
            {index > 0 && (
              <button className="tour-ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={busy}>
                {ui("back")}
              </button>
            )}
            <button className="tour-next" onClick={onNext} disabled={busy}>
              {busy ? (
                <>
                  <Icon icon="mdi:loading" width={18} className="tour-spin" /> {ui("working")}
                </>
              ) : (
                <>
                  {index === TOUR_STEPS.length - 1 ? ui("close") : ui("next")}
                  <Icon icon="mdi:arrow-right" width={18} />
                </>
              )}
            </button>
          </div>
        </div>
        {step?.selfClick && !busy && <p className="tour-hint">{ui("yourTurn")}</p>}
      </div>
      <GuideStyles />
    </>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────── */

function GuideStyles() {
  return (
    <style jsx global>{`
      .tour-scrim {
        position: fixed;
        inset: 0;
        z-index: 9000;
        background: rgba(8, 20, 38, 0.72);
        backdrop-filter: blur(3px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        overflow-y: auto;
      }
      .tour-picker {
        background: #fff;
        border-radius: 18px;
        max-width: 720px;
        width: 100%;
        padding: 22px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      }
      .tour-picker-head {
        display: flex;
        gap: 14px;
        align-items: center;
        margin-bottom: 16px;
      }
      .tour-picker-head h2 {
        font-size: 19px;
        font-weight: 700;
        color: #12263f;
        margin: 0 0 4px;
      }
      .tour-picker-head p {
        font-size: 13px;
        color: #52667c;
        margin: 0;
        line-height: 1.5;
      }
      .tour-langs {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
        gap: 8px;
        max-height: 46vh;
        overflow-y: auto;
        padding: 2px;
      }
      .tour-lang {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 10px 12px;
        border: 1.5px solid #dbe4ee;
        border-radius: 12px;
        background: #f8fafc;
        text-align: left;
        cursor: pointer;
        transition: all 0.15s;
      }
      .tour-lang:hover:not(:disabled) {
        border-color: #0b5394;
        background: #eaf2fb;
        transform: translateY(-1px);
      }
      .tour-lang-native {
        font-size: 16px;
        font-weight: 600;
        color: #12263f;
        line-height: 1.35;
      }
      .tour-lang-en {
        font-size: 11px;
        color: #7b8ca0;
      }
      .tour-skip {
        margin-top: 14px;
        width: 100%;
        padding: 9px;
        border: 0;
        background: none;
        color: #7b8ca0;
        font-size: 13px;
        cursor: pointer;
      }
      .tour-skip:hover { color: #0b5394; text-decoration: underline; }

      .tour-overlay { position: fixed; inset: 0; z-index: 8990; pointer-events: none; }
      .tour-shade {
        position: fixed;
        background: rgba(8, 20, 38, 0.62);
        pointer-events: auto;
        transition: all 0.18s ease-out;
      }
      .tour-ring {
        position: fixed;
        border: 3px solid #f7b733;
        border-radius: 12px;
        box-shadow: 0 0 0 4px rgba(247, 183, 51, 0.35), 0 0 26px rgba(247, 183, 51, 0.55);
        animation: tour-pulse 1.6s ease-in-out infinite;
        pointer-events: none;
        transition: all 0.18s ease-out;
      }
      @keyframes tour-pulse {
        0%, 100% { box-shadow: 0 0 0 4px rgba(247, 183, 51, 0.3), 0 0 22px rgba(247, 183, 51, 0.45); }
        50% { box-shadow: 0 0 0 9px rgba(247, 183, 51, 0.14), 0 0 34px rgba(247, 183, 51, 0.7); }
      }

      .tour-bubble {
        position: fixed;
        z-index: 9100;
        width: 400px;
        background: #fff;
        border-radius: 16px;
        padding: 14px 16px 12px;
        box-shadow: 0 18px 48px rgba(8, 20, 38, 0.38);
        border: 1px solid #e3eaf3;
      }
      .tour-bubble-mobile {
        left: 8px;
        right: 8px;
        bottom: 8px;
        width: auto;
        max-height: 62vh;
        overflow-y: auto;
      }
      .tour-bubble-top { display: flex; align-items: center; gap: 10px; }
      .tour-who { flex: 1; display: flex; flex-direction: column; }
      .tour-who strong { font-size: 14px; color: #12263f; }
      .tour-who span { font-size: 11px; color: #8497aa; }
      .tour-tools { display: flex; gap: 2px; }
      .tour-tools button {
        border: 0;
        background: none;
        color: #8497aa;
        padding: 5px;
        border-radius: 8px;
        cursor: pointer;
      }
      .tour-tools button:hover { background: #eef3f9; color: #0b5394; }
      .tour-text {
        margin: 10px 0 0;
        font-size: 14.5px;
        line-height: 1.62;
        color: #1c2b3a;
      }
      .tour-note { margin: 6px 0 0; font-size: 11px; color: #9aa9b8; }
      .tour-download {
        margin-top: 12px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 11px;
        border: 0;
        border-radius: 11px;
        background: linear-gradient(180deg, #f7b733, #e79a1f);
        color: #3b2503;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(231, 154, 31, 0.4);
      }
      .tour-download:hover { filter: brightness(1.04); }
      .tour-progress {
        margin-top: 12px;
        height: 4px;
        background: #eef3f9;
        border-radius: 99px;
        overflow: hidden;
      }
      .tour-progress span {
        display: block;
        height: 100%;
        background: #0b5394;
        border-radius: 99px;
        transition: width 0.3s;
      }
      .tour-actions {
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .tour-right { display: flex; align-items: center; gap: 6px; }
      .tour-ghost {
        border: 0;
        background: none;
        color: #7b8ca0;
        font-size: 13px;
        padding: 8px 10px;
        border-radius: 9px;
        cursor: pointer;
      }
      .tour-ghost:hover { background: #eef3f9; color: #0b5394; }
      .tour-next {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 0;
        border-radius: 11px;
        background: #0b5394;
        color: #fff;
        font-weight: 600;
        font-size: 14px;
        padding: 10px 16px;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(11, 83, 148, 0.35);
      }
      .tour-next:disabled { opacity: 0.7; cursor: progress; }
      .tour-spin { animation: tour-spin 0.9s linear infinite; }
      @keyframes tour-spin { to { transform: rotate(360deg); } }
      .tour-hint { margin: 8px 0 0; font-size: 11.5px; color: #8497aa; text-align: center; }

      .tour-dock { position: fixed; right: 16px; bottom: 86px; z-index: 9000; }
      .tour-fab {
        border: 0;
        background: none;
        padding: 0;
        cursor: pointer;
        border-radius: 50%;
        box-shadow: 0 8px 22px rgba(8, 20, 38, 0.35);
        animation: tour-bob 3.4s ease-in-out infinite;
      }
      @keyframes tour-bob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      .tour-menu {
        position: absolute;
        right: 0;
        bottom: 64px;
        width: 210px;
        background: #fff;
        border-radius: 12px;
        border: 1px solid #e3eaf3;
        box-shadow: 0 14px 34px rgba(8, 20, 38, 0.25);
        overflow: hidden;
      }
      .tour-menu button {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 11px 13px;
        border: 0;
        background: none;
        font-size: 13.5px;
        color: #1c2b3a;
        cursor: pointer;
        text-align: left;
      }
      .tour-menu button:hover { background: #eef3f9; color: #0b5394; }

      @media (max-width: 640px) {
        .tour-bubble { width: auto; }
        .tour-picker { padding: 16px; }
        .tour-picker-head p { font-size: 12px; }
        .tour-langs { grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); max-height: 40vh; }
        .tour-dock { bottom: 78px; right: 12px; }
      }
    `}</style>
  );
}
