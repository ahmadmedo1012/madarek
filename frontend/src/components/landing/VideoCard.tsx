/**
 * VideoCard — the R307 click-to-load facade for official university
 * documentaries (DESIGN.md §6b, r307).
 *
 * Zero third-party bytes until the visitor asks for them: the card
 * renders as a designed drafting-frame (title, institution, duration,
 * play affordance) and the youtube-nocookie iframe mounts ONLY after
 * an explicit click. The poster is a composition, not a thumbnail —
 * no third-party thumbnail host (img-src stays `'self'`), no autoplay, no
 * teaser video. If iframes are unavailable the card degrades to the
 * facade with a direct link.
 *
 * Honesty: `kindAr` («فيديو توثيقي من القناة الرسمية للجامعة») is
 * rendered as the card's type label — a university documentary is
 * never presented as a Madarek product demo.
 */
import { useEffect, useRef, useState } from 'react';
import { PlayCircle, ExternalLink, X } from 'lucide-react';
import { Icon } from '../Icon';
import type { UniversityVideo } from '../../data/university-media';

export interface VideoCardProps {
  video: UniversityVideo;
  variant?: 'primary' | 'secondary';
}

export function VideoCard({ video, variant = 'primary' }: VideoCardProps) {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);

  // Escape / close returns focus to the play control (the overlay
  // contract: focus comes back to the trigger).
  useEffect(() => {
    if (!playing) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlaying(false);
        playRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing]);

  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.videoId}?rel=0`;

  return (
    <figure className={['vc', `vc--${variant}`].join(' ')} data-playing={playing || undefined}>
      <div className="vc-frame" ref={frameRef}>
        {playing ? (
          <>
            <iframe
              className="vc-iframe"
              src={embedUrl}
              title={`${video.titleAr} — ${video.channelAr}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              /* Sandbox keeps the embed isolated from the SPA; YouTube's
                 own player scripts run inside its origin as designed. */
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            />
            <button
              type="button"
              className="vc-close"
              aria-label="إغلاق الفيديو"
              onClick={() => {
                setPlaying(false);
                playRef.current?.focus();
              }}
            >
              <Icon icon={X} size={16} />
            </button>
          </>
        ) : (
          <>
            {/* The facade: a designed poster card. The play button is
                the single primary control; the duration chip and the
                kind label set expectations before any bytes move. */}
            <div className="vc-poster" aria-hidden="true">
              <span className="vc-poster-mark fo-mono" dir="ltr" data-code="[▶]" />
              <span className="vc-poster-lines" />
            </div>
            <div className="vc-body">
              <p className="vc-kind">{video.kindAr}</p>
              <p className="vc-title">{video.titleAr}</p>
              <p className="vc-meta">
                <span>{video.institution}</span>
                <span className="fo-mono" dir="ltr">
                  {video.durationAr}
                </span>
              </p>
            </div>
            <div className="vc-actions">
              <button
                type="button"
                ref={playRef}
                className="vc-play btn accent"
                onClick={() => setPlaying(true)}
              >
                <Icon icon={PlayCircle} size={18} />
                شاهد الفيديو
              </button>
              <a
                className="vc-direct"
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon icon={ExternalLink} size={13} />
                {video.channelAr}
              </a>
            </div>
          </>
        )}
      </div>
      <figcaption className="vc-caption">
        <span className="vc-caption-kind">{video.kindAr}</span>
        <span className="vc-caption-title">{video.titleAr}</span>
      </figcaption>
    </figure>
  );
}
