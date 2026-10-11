/**
 * Backend unit test — sanctioned-URL scheme guards (r142, T1a-01/T1a-02).
 *
 * zod's `z.string().url()` accepts any RFC-3986 scheme — `javascript:`
 * and `data:` included — so four stored-link fields that the frontend
 * renders as <a href> were relying on the CSP pin alone:
 *  - enterCompSchema.fileUrl        (competition entries, was free-form)
 *  - createPostSchema.imageUrl      (community posts, was .url())
 *  - materialCreateSchema.url       (offering materials, was .url())
 *  - teacher-profile publications[].url (was free-form)
 *
 * This suite pins the NEW contract: scheme-capable URLs are rejected
 * at the schema layer; the sanctioned families (https, files API,
 * same-origin static) keep passing. The policy functions themselves
 * live in src/lib/sanctioned-url.ts (single source of truth; the
 * submissions + curriculum re-exports are covered by their own suites).
 *
 * DB-free: only the schemas are exercised.
 */
import { describe, expect, it } from 'vitest';
import {
  isSanctionedMediaUrl,
  isSanctionedSubmissionUrl,
} from '../../src/lib/sanctioned-url';
import { enterCompSchema } from '../../src/http/routes/social.routes';
import { createPostSchema } from '../../src/http/routes/catalog.routes';
import { materialCreateSchema } from '../../src/http/routes/offerings.routes';
import { updateProfileSchema } from '../../src/http/routes/teacher-profile.routes';

const SCHEME_ATTACKS = [
  'javascript:alert(1)',
  'javascript://evil.com/%0aalert(1)',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  'vbscript:msgbox(1)',
  'http://plain.example.com/a.pdf', // plaintext http is NOT sanctioned
  '//protocol-relative.evil.com/a.pdf',
  'file:///etc/passwd',
  'ftp://files.example.com/a.pdf',
];

const MEDIA_BASE = {
  name: 'محاضرة مرفقة',
  type: 'PDF',
  sizeBytes: 1024,
};

describe('lib/sanctioned-url — policy functions (r142)', () => {
  it('isSanctionedMediaUrl: https, files API and same-origin static pass', () => {
    expect(isSanctionedMediaUrl('https://example.com/a.pdf')).toBe(true);
    expect(isSanctionedMediaUrl('/api/v1/files/papers/a.pdf')).toBe(true);
    expect(isSanctionedMediaUrl('/lectures/se301-01-intro.mp4')).toBe(true);
  });

  it('isSanctionedMediaUrl: scheme-capable and traversal URLs are rejected', () => {
    for (const url of SCHEME_ATTACKS) {
      expect(isSanctionedMediaUrl(url), url).toBe(false);
    }
    expect(isSanctionedMediaUrl('/../etc/passwd')).toBe(false);
    expect(isSanctionedMediaUrl('/')).toBe(false);
    expect(isSanctionedMediaUrl('')).toBe(false);
  });

  it('isSanctionedSubmissionUrl: same-origin static is NOT sanctioned for student submissions', () => {
    expect(isSanctionedSubmissionUrl('https://example.com/a.pdf')).toBe(true);
    expect(isSanctionedSubmissionUrl('/api/v1/files/papers/a.pdf')).toBe(true);
    expect(isSanctionedSubmissionUrl('/lectures/se301-01.mp4')).toBe(false);
    expect(isSanctionedSubmissionUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('enterCompSchema.fileUrl — competition entries (r142 T1a-01)', () => {
  const base = { title: 'مشاركتي', body: 'نص المشاركة الكامل ضمن الحد المطلوب' };

  it('accepts the sanctioned families', () => {
    expect(enterCompSchema.safeParse({ ...base, fileUrl: 'https://example.com/entry.pdf' }).success).toBe(true);
    expect(enterCompSchema.safeParse({ ...base, fileUrl: '/api/v1/files/papers/entry.pdf' }).success).toBe(true);
  });

  it('rejects javascript:/data: and friends (was free-form storage)', () => {
    for (const url of SCHEME_ATTACKS) {
      const r = enterCompSchema.safeParse({ ...base, fileUrl: url });
      expect(r.success, url).toBe(false);
    }
  });
});

describe('createPostSchema.imageUrl — community posts (r142 T1a-02)', () => {
  const base = { body: 'منشور تجريبي' };

  it('accepts https and files-API images', () => {
    expect(createPostSchema.safeParse({ ...base, imageUrl: 'https://cdn.example.com/pic.jpg' }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...base, imageUrl: '/api/v1/files/papers/pic.jpg' }).success).toBe(true);
  });

  it('rejects javascript: (z.string().url() used to accept it)', () => {
    // The exact regression: zod 3.23.8 .url() passes this string.
    expect(createPostSchema.safeParse({ ...base, imageUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(createPostSchema.safeParse({ ...base, imageUrl: 'data:text/html,<script>x</script>' }).success).toBe(false);
  });
});

describe('materialCreateSchema.url — offering materials (r142 T1a-02)', () => {
  it('accepts https, files API and same-origin static (curriculum parity)', () => {
    expect(materialCreateSchema.safeParse({ ...MEDIA_BASE, url: 'https://example.com/lec.mp4' }).success).toBe(true);
    expect(materialCreateSchema.safeParse({ ...MEDIA_BASE, url: '/api/v1/files/papers/lec.pdf' }).success).toBe(true);
    expect(materialCreateSchema.safeParse({ ...MEDIA_BASE, url: '/lectures/se301-01.mp4' }).success).toBe(true);
  });

  it('rejects scheme-capable URLs (z.string().url() used to accept them)', () => {
    for (const url of SCHEME_ATTACKS) {
      const r = materialCreateSchema.safeParse({ ...MEDIA_BASE, url });
      expect(r.success, url).toBe(false);
    }
  });
});

describe('updateProfileSchema.publications[].url — public profile links (r142 T1a-02)', () => {
  const base = { publications: [{ title: 'ورقة محكمة', year: 2024 }] };

  it('accepts https and files-API publication links', () => {
    const ok = updateProfileSchema.safeParse({
      ...base,
      publications: [{ title: 'ورقة محكمة', year: 2024, url: 'https://doi.example.com/10.1234/x' }],
    });
    expect(ok.success).toBe(true);
  });

  it('rejects javascript:/data: (was free-form storage rendered as <a href>)', () => {
    for (const url of SCHEME_ATTACKS) {
      const r = updateProfileSchema.safeParse({
        publications: [{ title: 'ورقة محكمة', year: 2024, url }],
      });
      expect(r.success, url).toBe(false);
    }
  });
});
