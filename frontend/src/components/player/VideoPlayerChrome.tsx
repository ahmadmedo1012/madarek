/**
 * VideoPlayerChrome (`.vpc`) — the branded madarek player skin (R2-B).
 *
 * A PRESENTATIONAL wrapper: it renders its own controls over/around a
 * `<video>` it does NOT own. All playback logic — watch-time reporting,
 * resume-seek, checkpoints, completion — stays in the host page
 * (LecturePlayerPage), which passes its existing video ref down. The
 * chrome only reads UI state (playing / position / buffered / rate /
 * muted) by attaching listeners to the video element, and writes the
 * bare media properties a user gesture implies (currentTime, muted,
 * playbackRate, play/pause, container fullscreen). It never reports,
 * never seeks on mount, and never touches the host's event handlers.
 *
 * Geometry contract: the host supplies the frame via `className`
 * (LecturePlayerPage passes .lecture-video-wrap → aspect-ratio +
 * radius + overflow clip); `.vpc` re-skins it night + layers the
 * chrome (styles in styles/player.css, imported below — it travels
 * with this component into the lazy page chunk, per the D11 css
 * split).
 *
 * Direction contract (RTL): the document is `dir="rtl"`. The progress
 * rail fills RIGHT→LEFT — playback starts at the right edge (the
 * Arabic reading start) and flows leftward. Positions ride logical
 * properties (`inset-inline-start`), the same idiom as the page's
 * .lecture-progress-* marks; the pointer→time math mirrors in
 * pctFromPointer. Arrow keys follow CONTENT direction per RTL media
 * convention: ArrowLeft skips FORWARD +10s, ArrowRight back −10s (the
 * mirror of the LTR convention — documented here; each skip button
 * also carries aria-keyshortcuts so the mapping is discoverable).
 *
 * Media glyphs are deliberately NOT mirrored in RTL (Material "do not
 * mirror media controls" + YouTube-ar precedent) — only their position
 * mirrors via the RTL flex flow.
 *
 * Keyboard (on the chrome container, tabIndex 0): Space/K play-pause,
 * ArrowLeft/ArrowRight ±10s (see above), Home/End + the slider's own
 * keys on the track, F fullscreen, M mute. Keys are handled ONLY when
 * the chrome itself is focused (e.target === e.currentTarget) — the
 * controls handle their own keys, and the checkpoint quiz lives in a
 * body-level Modal portal whose inputs can never be hijacked from
 * here (defense in depth on top of that guarantee).
 */
import {
  useCallback, useEffect, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode, type RefObject,
} from 'react';
import {
  Check, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw,
  TriangleAlert, Volume2, VolumeX,
} from 'lucide-react';
import { Icon } from '../Icon';
import { formatMmSs } from '../../lib/format';
import '../../styles/player.css';

const SKIP_SEC = 10;
const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

/* Vendor-safe fullscreen surface (Safari's webkit prefixes; jsdom has
   neither — every branch is optional-chained so tests never trip). */
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };

export interface VideoPlayerChromeProps {
  /** The host page's video ref — the chrome drives THE SAME element. */
  videoRef: RefObject<HTMLVideoElement>;
  /** Checkpoint trigger times (sec) — rendered as gold notches on the rail. */
  checkpointTimes: number[];
  /** Notified after any chrome-initiated seek (scrub / skip / replay). */
  onSeek?: (sec: number) => void;
  /** Frame class for the host element (e.g. "lecture-video-wrap"). */
  className?: string;
  /** The `<video>` element (plus any siblings it needs, e.g. tracks). */
  children: ReactNode;
}

export function VideoPlayerChrome({
  videoRef,
  checkpointTimes,
  onSeek,
  className,
  children,
}: VideoPlayerChromeProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const rateBtnRef = useRef<HTMLButtonElement | null>(null);
  const scrubbingRef = useRef(false);

  // UI state — all mirrored FROM the video element via listeners.
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);     // poster gate → hidden on first play
  const [ended, setEnded] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrubPct, setScrubPct] = useState<number | null>(null);

  /* ── Mirror the video element's state (all listeners cleaned up) ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const syncDuration = () => {
      const d = v.duration;
      setDuration(Number.isFinite(d) && d > 0 ? d : 0);
    };
    const syncBuffered = () => {
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0 || v.buffered.length === 0) return;
      setBufferedPct(Math.min(100, (v.buffered.end(v.buffered.length - 1) / d) * 100));
    };
    const onPlay = () => { setPlaying(true); setStarted(true); setEnded(false); };
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setEnded(true); setWaiting(false); };
    const onTime = () => setCurrent(v.currentTime);
    const onWaiting = () => setWaiting(true);
    const onPlaying = () => setWaiting(false);
    const onCanPlay = () => setWaiting(false);
    const onError = () => { setFailed(true); setWaiting(false); };
    const onVolumeChange = () => setMuted(v.muted);
    const onRateChange = () => setRate(v.playbackRate);

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('durationchange', syncDuration);
    v.addEventListener('loadedmetadata', syncDuration);
    v.addEventListener('progress', syncBuffered);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('stalled', onWaiting);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('error', onError);
    v.addEventListener('volumechange', onVolumeChange);
    v.addEventListener('ratechange', onRateChange);

    // Initial sync (the element can already be mid-state on remount).
    syncDuration();
    setMuted(v.muted);
    setRate(v.playbackRate);
    setPlaying(!v.paused && !v.ended);

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('durationchange', syncDuration);
      v.removeEventListener('loadedmetadata', syncDuration);
      v.removeEventListener('progress', syncBuffered);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('stalled', onWaiting);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('error', onError);
      v.removeEventListener('volumechange', onVolumeChange);
      v.removeEventListener('ratechange', onRateChange);
    };
  }, [videoRef]);

  /* Fullscreen state (the HOST is the fullscreen element so this chrome
     stays visible; a body-level portal would vanish). */
  useEffect(() => {
    const onFsChange = () => {
      const doc = document as FsDocument;
      setIsFullscreen(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  /* Speed menu: close on outside pointer-down (capture phase). */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (hostRef.current && !hostRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [menuOpen]);

  /* ── Actions (drive the video element through the ref) ──────────── */

  const seekTo = useCallback((sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    const target = duration > 0 ? Math.min(Math.max(0, sec), duration) : Math.max(0, sec);
    v.currentTime = target;
    setCurrent(target);
    onSeek?.(target);
  }, [videoRef, duration, onSeek]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      if (v.ended) {
        v.currentTime = 0; // replay from the start
        onSeek?.(0);
      }
      void v.play();
    } else {
      v.pause();
    }
  }, [videoRef, onSeek]);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    seekTo(v.currentTime + delta);
  }, [videoRef, seekTo]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted; // volume level stays untouched — mute toggle only
  }, [videoRef]);

  const toggleFullscreen = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const doc = document as FsDocument;
    const el = host as FsElement;
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      if (document.exitFullscreen) void document.exitFullscreen();
      else doc.webkitExitFullscreen?.();
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => { /* denied (e.g. iframe embed) — stay inline */ });
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else {
      // iPhone: container fullscreen is unsupported; hand off to the
      // platform video player (native iOS chrome takes over there).
      (videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null)
        ?.webkitEnterFullscreen?.();
    }
  }, [videoRef]);

  const setVideoRate = useCallback((r: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = r;
    setRate(r); // optimistic; the ratechange listener is the source of truth
    setMenuOpen(false);
    rateBtnRef.current?.focus();
  }, [videoRef]);

  const retry = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setFailed(false);
    setWaiting(true);
    // Keep the student's place across the reload: the page's own
    // onLoadedMetadata resume-seek is one-shot-guarded, so restoring
    // here can never fight it.
    const resumeAt = v.currentTime;
    const onMeta = () => {
      if (resumeAt > 0 && Number.isFinite(v.duration) && resumeAt < v.duration) {
        v.currentTime = resumeAt;
      }
    };
    v.addEventListener('loadedmetadata', onMeta, { once: true });
    v.load();
  }, [videoRef]);

  /* ── Scrub (pointer) — RTL-aware math ───────────────────────────── */

  const pctFromPointer = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    // The rail fills right→left in RTL: the fraction is measured from
    // the RIGHT edge. (Logical inset-inline-start positions + this
    // mirror = the task's (1 − t/d) physical-left formula, expressed
    // in the codebase's logical-property idiom.)
    const rtl = getComputedStyle(track).direction === 'rtl';
    const frac = rtl ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;
    return Math.min(1, Math.max(0, frac)) * 100;
  }, []);

  const onTrackPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubbingRef.current = true;
    const pct = pctFromPointer(e.clientX);
    setScrubPct(pct);
    seekTo((pct / 100) * duration);
  };
  const onTrackPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    const pct = pctFromPointer(e.clientX);
    setScrubPct(pct);
    seekTo((pct / 100) * duration);
  };
  const onTrackPointerEnd = () => {
    scrubbingRef.current = false;
    setScrubPct(null);
  };

  /* ── Keyboard ───────────────────────────────────────────────────── */

  const onTrackKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    // RTL convention: arrows follow content direction — the timeline
    // flows right→left, so ArrowLeft ADVANCES (see component doc).
    if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); skip(SKIP_SEC); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); skip(-SKIP_SEC); }
    else if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); seekTo(0); }
    else if (e.key === 'End') { e.preventDefault(); e.stopPropagation(); seekTo(duration); }
  };

  const onHostKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // Only when the chrome itself holds focus — never hijack keys
    // aimed at the controls (they manage their own), and never at
    // inputs (the checkpoint quiz is a body-level portal; its events
    // cannot reach this handler — the guard is defense in depth).
    if (e.target !== e.currentTarget) return;
    // Letter shortcuts ride e.code (physical key) so Arabic-layout
    // keyboards get the same K/F/M shortcuts as Latin ones.
    if (e.key === ' ' || e.code === 'KeyK') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      skip(SKIP_SEC);   // RTL: forward
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      skip(-SKIP_SEC);  // RTL: back
    } else if (e.code === 'KeyF') {
      toggleFullscreen();
    } else if (e.code === 'KeyM') {
      toggleMute();
    }
  };

  const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setMenuOpen(false);
      rateBtnRef.current?.focus();
    }
  };

  /* ── Derived ────────────────────────────────────────────────────── */

  const position = scrubPct !== null
    ? (scrubPct / 100) * duration
    : current;
  const playedPct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const rateLabel = `${Number(rate.toFixed(2))}×`;

  return (
    <div
      ref={hostRef}
      className={className ? `vpc ${className}` : 'vpc'}
      tabIndex={0}
      role="group"
      aria-label="مشغّل الفيديو"
      data-paused={!playing ? 'true' : undefined}
      data-scrubbing={scrubPct !== null ? 'true' : undefined}
      onKeyDown={onHostKeyDown}
    >
      {/* The host page's <video> — untouched, handlers and all. */}
      {children}

      {/* Click surface: toggle play; double-click fullscreen. */}
      <div
        className="vpc-surface"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        aria-hidden
      />

      {/* Poster gate — before the first play (the video's own poster
          attribute, when present, shows through the scrim). */}
      {!started && !failed && !ended && (
        <div className="vpc-overlay">
          <button type="button" className="vpc-play-big" onClick={togglePlay} aria-label="تشغيل المحاضرة">
            <Icon icon={Play} size={26} />
          </button>
        </div>
      )}

      {/* Ended gate — replay. */}
      {ended && !failed && (
        <div className="vpc-overlay">
          <button type="button" className="vpc-play-big" onClick={togglePlay} aria-label="إعادة التشغيل من البداية">
            <Icon icon={RotateCcw} size={26} />
          </button>
        </div>
      )}

      {/* Loading — while the element buffers. */}
      {waiting && !failed && (
        <div className="vpc-busy">
          <span className="vpc-spinner" role="status" aria-label="جارٍ التحميل" />
        </div>
      )}

      {/* Error gate. */}
      {failed && (
        <div className="vpc-error" role="alert">
          <Icon icon={TriangleAlert} size={22} className="vpc-error-icon" />
          <div className="vpc-error-msg">تعذّر تحميل الفيديو — أعد المحاولة</div>
          <button type="button" className="vpc-retry" onClick={retry}>إعادة المحاولة</button>
        </div>
      )}

      {/* Bottom scrim + control bar. */}
      <div className="vpc-scrim" aria-hidden />
      <div className="vpc-bar">
        {/* Progress — role=slider with its own arrow keys (RTL-mapped). */}
        <div
          ref={trackRef}
          className="vpc-track"
          role="slider"
          tabIndex={0}
          aria-label="شريط تقدّم المحاضرة"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, Math.round(duration))}
          aria-valuenow={Math.max(0, Math.round(position))}
          aria-valuetext={duration > 0 ? `${formatMmSs(position)} من ${formatMmSs(duration)}` : undefined}
          aria-disabled={duration <= 0 ? 'true' : undefined}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerEnd}
          onPointerCancel={onTrackPointerEnd}
          onKeyDown={onTrackKeyDown}
        >
          <span className="vpc-rail" aria-hidden>
            <span className="vpc-buffered" style={{ inlineSize: `${bufferedPct}%` }} />
            <span className="vpc-played" style={{ inlineSize: `${playedPct}%` }} />
            {duration > 0 && checkpointTimes.map((t, i) => (
              <span
                key={i}
                className="vpc-mark"
                style={{ insetInlineStart: `calc(${(t / duration) * 100}% - 4px)` }}
                aria-hidden
                title="نقطة فحص"
              />
            ))}
            <span className="vpc-head" style={{ insetInlineStart: `calc(${playedPct}% - 6px)` }} />
          </span>
        </div>

        <div className="vpc-controls">
          {/* RTL flex: this cluster renders on the RIGHT (reading
              start) — «إرجاع» sits right of play, «تقديم» left of it,
              the mirror of the LTR −10 | play | +10 layout. */}
          <button
            type="button"
            className="vpc-btn"
            onClick={() => skip(-SKIP_SEC)}
            aria-label="إرجاع 10 ثوانٍ"
            aria-keyshortcuts="ArrowRight"
            title="إرجاع 10 ثوانٍ"
          >
            <Icon icon={RotateCcw} size={20} />
          </button>
          <button
            type="button"
            className="vpc-btn vpc-btn-play"
            onClick={togglePlay}
            aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}
            aria-keyshortcuts="Space K"
            title={playing ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            <Icon icon={playing ? Pause : Play} size={22} />
          </button>
          <button
            type="button"
            className="vpc-btn"
            onClick={() => skip(SKIP_SEC)}
            aria-label="تقديم 10 ثوانٍ"
            aria-keyshortcuts="ArrowLeft"
            title="تقديم 10 ثوانٍ"
          >
            <Icon icon={RotateCw} size={20} />
          </button>

          <span className="vpc-time" dir="ltr">
            {formatMmSs(position)}{' '}
            <span className="vpc-time-total">/ {formatMmSs(duration)}</span>
          </span>

          {/* Speed — inline menu (NOT a portal: must survive fullscreen). */}
          <div className="vpc-speed">
            <button
              ref={rateBtnRef}
              type="button"
              className="vpc-btn vpc-btn-rate"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="سرعة التشغيل"
              title="سرعة التشغيل"
            >
              <span dir="ltr">{rateLabel}</span>
            </button>
            {menuOpen && (
              <div className="vpc-menu" role="menu" aria-label="سرعة التشغيل" onKeyDown={onMenuKeyDown}>
                {RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="menuitemradio"
                    aria-checked={rate === r}
                    className="vpc-menu-item"
                    onClick={() => setVideoRate(r)}
                  >
                    <span dir="ltr">{r}×</span>
                    {rate === r && <Icon icon={Check} size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="vpc-btn"
            onClick={toggleMute}
            aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
            aria-keyshortcuts="M"
            aria-pressed={muted}
            title={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
          >
            <Icon icon={muted ? VolumeX : Volume2} size={20} />
          </button>
          <button
            type="button"
            className="vpc-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
            aria-keyshortcuts="F"
            title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
          >
            <Icon icon={isFullscreen ? Minimize : Maximize} size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
