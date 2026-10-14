import { Link } from 'react-router-dom';
import {
  FileText, FileArchive, Image, Presentation, Video,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '../primitives';
import { Icon } from '../Icon';
import { useOfferingFull } from '../../hooks/useResources';
import { materialHref } from '../../lib/materialHref';
import { formatDateAr } from '../../lib/format';
import { MATERIAL_TYPE_LABEL, type MaterialType } from '../../lib/courseMeta';

/* r164d (course flow): the player's materials card — "materials within
 * reach, not hidden". Until now the ONLY path to a lecture's handouts
 * ran back through the course page (two navigations away from the
 * moment of need); the sidebar next to the video is where a student
 * actually wants them. Reads the SAME ['offerings', id, 'full'] cache
 * CourseDetailPage seeds, so course → player is a cache hit, and a
 * direct player entry (matrix gap link) pays one bounded fetch.
 *
 * Targets route through the canonical materialHref helper (the
 * DownloadsPage / CourseDetail contract): internal paper/material
 * namespaces open the in-app /document viewer (Bearer-authenticated),
 * real https opens a new tab, and unresolvable URLs stay honest
 * non-links. Fail-soft by design: pending/error/empty render nothing —
 * the card is a convenience layer, never a blocker on the player. */

/* Per-format material icons — the same r157 (W2-F7 / audit 6A13) map
 * CourseDetailPage carries (kept local here the way MorePages keeps a
 * local twin of shared helpers when the shared module is out of the
 * wave's file scope). */
const MATERIAL_TYPE_ICON: Record<MaterialType, LucideIcon> = {
  PPT: Presentation,
  VIDEO: Video,
  ZIP: FileArchive,
  IMAGE: Image,
  PDF: FileText,
  DOC: FileText,
  OTHER: FileText,
};

export function OfferingMaterialsCard({ offeringId }: { offeringId: string | undefined }) {
  const q = useOfferingFull(offeringId);
  const materials = q.data?.materials ?? [];
  // Fail-soft: nothing while pending (the card appends when data
  // lands) and nothing on error (the course page remains the source).
  if (!offeringId || q.isPending || q.isError || materials.length === 0) return null;
  return (
    <Card title="مواد المقرّر" icon={FileText}>
      <div className="flex-col gap-2">
        {materials.map((m) => {
          const label = MATERIAL_TYPE_LABEL[m.type as keyof typeof MATERIAL_TYPE_LABEL] ?? m.type;
          const target = materialHref({ url: m.url, name: m.name });
          const body = (
            <>
              <Icon icon={MATERIAL_TYPE_ICON[m.type as MaterialType] ?? FileText} size={16} className="text-muted" />
              <div className="list-row-body">
                <div className="list-row-title" title={m.name}>{m.name}</div>
                <div className="list-row-sub"><bdi>{label}</bdi> · {formatDateAr(m.createdAt)}</div>
              </div>
            </>
          );
          if (target.kind === 'viewer') {
            return <Link key={m.id} className="list-row" to={target.to}>{body}</Link>;
          }
          if (target.kind === 'external') {
            return (
              <a key={m.id} className="list-row" href={target.href} target="_blank" rel="noreferrer">
                {body}
              </a>
            );
          }
          return (
            <div key={m.id} className="list-row">
              {body}
              <span className="text-xs text-subtle" role="note">غير متوفر بعد</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
