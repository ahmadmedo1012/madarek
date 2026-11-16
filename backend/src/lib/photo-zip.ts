/**
 * r357 L2 — the photo-ZIP attach engine (pure).
 *
 * The registrar uploads one ZIP whose entries are named after the
 * students' university ids (رقم القيد): «20240001.webp», «20240002.png».
 * The impure shell (profiles.routes.ts) unpacks with adm-zip and reads
 * bytes; THIS module owns every decision:
 *   · which entries are even eligible (image extensions, sane sizes);
 *   · filename-stem → universityId matching, trimmed + case-folded
 *     digits only (a stray «.jpg » never matches by accident);
 *   · one entry per student — a ZIP with two files for the same
 *     student is a REFUSAL for that student (ambiguous), never a
 *     silent last-wins;
 *   · the per-entry verdict + the summary the route returns and audits.
 */
/** One ZIP entry as the planner sees it (internal — the route maps adm-zip rows to this). */
interface ZipEntryInput {
  /** Raw entry name as it appears in the ZIP (any case). */
  name: string;
  sizeBytes: number;
}

export interface ZipStudent {
  universityId: string;
  profileId: string;
}

export type ZipVerdict =
  | { kind: 'attach'; profileId: string; universityId: string; entry: string; ext: string }
  | { kind: 'ambiguous'; universityId: string; entries: string[] }
  | { kind: 'unmatched'; entry: string; reason: 'no-such-id' | 'not-an-image' | 'too-large' };

export interface ZipPlan {
  verdicts: ZipVerdict[];
  counts: { entries: number; attach: number; ambiguous: number; unmatched: number };
}

export const PHOTO_ZIP_MAX_ENTRIES = 1000;
export const PHOTO_ZIP_MAX_ENTRY_BYTES = 2 * 1024 * 1024;
const IMAGE_EXT = new Set(['.webp', '.png', '.jpg', '.jpeg']);

/** Normalize a university id for matching: trim, lowercase, strip the
 * zero-width/directional marks Arabic copy sometimes carries. */
export function normalizeZipId(raw: string): string {
  return raw
    .replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, '')
    .trim()
    .toLowerCase();
}

const extensionOf = (name: string): string => {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
};

const stemOf = (name: string): string => {
  const i = name.lastIndexOf('.');
  const base = i === -1 ? name : name.slice(0, i);
  return base.split(/[\\/]/).pop() ?? '';
};

/**
 * Decide the whole ZIP in one pass. Entries beyond PHOTO_ZIP_MAX_ENTRIES
 * are not even looked at (the route refuses the archive earlier); the
 * function still tolerates them defensively as unmatched/not-an-image.
 */
export function planPhotoZip(entries: ZipEntryInput[], students: ZipStudent[]): ZipPlan {
  const byId = new Map<string, ZipStudent>();
  for (const s of students) byId.set(normalizeZipId(s.universityId), s);

  // entry name (normalized id) → the entries claiming it
  const claims = new Map<string, { entry: string; ext: string; size: number }[]>();
  const verdicts: ZipVerdict[] = [];

  for (const e of entries.slice(0, PHOTO_ZIP_MAX_ENTRIES)) {
    const ext = extensionOf(e.name);
    if (!IMAGE_EXT.has(ext)) {
      verdicts.push({ kind: 'unmatched', entry: e.name, reason: 'not-an-image' });
      continue;
    }
    if (e.sizeBytes <= 0 || e.sizeBytes > PHOTO_ZIP_MAX_ENTRY_BYTES) {
      verdicts.push({ kind: 'unmatched', entry: e.name, reason: 'too-large' });
      continue;
    }
    const id = normalizeZipId(stemOf(e.name));
    if (id === '') {
      verdicts.push({ kind: 'unmatched', entry: e.name, reason: 'no-such-id' });
      continue;
    }
    const list = claims.get(id) ?? [];
    list.push({ entry: e.name, ext, size: e.sizeBytes });
    claims.set(id, list);
  }

  for (const [id, list] of claims) {
    const student = byId.get(id);
    if (!student) {
      for (const c of list) verdicts.push({ kind: 'unmatched', entry: c.entry, reason: 'no-such-id' });
      continue;
    }
    if (list.length > 1) {
      verdicts.push({ kind: 'ambiguous', universityId: student.universityId, entries: list.map((c) => c.entry) });
      continue;
    }
    const only = list[0]!;
    verdicts.push({
      kind: 'attach',
      profileId: student.profileId,
      universityId: student.universityId,
      entry: only.entry,
      ext: only.ext,
    });
  }

  const counts = {
    entries: entries.length,
    attach: verdicts.filter((v) => v.kind === 'attach').length,
    ambiguous: verdicts.filter((v) => v.kind === 'ambiguous').length,
    unmatched: verdicts.filter((v) => v.kind === 'unmatched').length,
  };
  return { verdicts, counts };
}
