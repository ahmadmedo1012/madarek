/**
 * r168b — truthfulness pins (fs-level + copy-level).
 *
 * Evidence source: the r168 2-c audit (worklog Task ID 2-c) — surfaces
 * that promised more than the code delivers. Each pin keeps the honest
 * wording from being silently reverted to the overclaim:
 *
 *  1. OASIS CHIPS: the local composer (backend composeReply) honors
 *     concept-explain + worst-gap only; «لخّص الفصل الأخير» /
 *     «اختبار قصير» / «موارد إضافيّة» chips render ONLY with a real
 *     provider (the interactive gating is pinned in
 *     AiAssistantPage-conversations.test.tsx — this file pins the
 *     source contract too).
 *  2. LANDING: station-03 no longer promises chapter summaries/quiz
 *     generation; the megamenu no longer calls illustrative figures
 *     "measured experiment results"; the labs card no longer promises
 *     running AR/VR experiments; the two CTA landmarks are
 *     distinguishable (axe landmark-unique).
 *  3. RESEARCH: the scan simulation is labeled «محاكاة» on the page
 *     header AND the process explainer step 2 (the results area has
 *     carried the note since r154b); the upload modal's required title
 *     is marked and the disabled submit announces its reason.
 *  4. AR/VR PAGE: the subtitle says catalog + unavailable launch.
 *  5. TRAINING: certificates are «سجلّ إتمام» records, hours are
 *     «تقديرية» (estimated), not accredited claims.
 *  6. docs/02: the student surfaces row documents its exceptions.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJsx = (src: string) => stripComments(src);

describe('r168b — Oasis chips are engine-gated in source', () => {
  it('the chip block branches on isRealLlm', () => {
    const page = stripJsx(read('src/pages/student/AiAssistantPage.tsx'));
    expect(page).toMatch(/\{isRealLlm\s*\?\s*\(/);
    expect(page).toContain("send('لخّص لي الفصل الأخير من المقرّر')");
    expect(page).toContain("send('ما المفاهيم التي أحتاج إلى مراجعتها؟')");
  });
});

describe('r168b — landing copy claims only what ships', () => {
  it('r191 — station-03: no chapter-summaries/quiz promise; the AI card claims only the local engine', () => {
    const page = stripJsx(read('src/pages/LandingPage.tsx'));
    expect(page).not.toContain('تلخيصات للفصول الطويلة');
    // r191 copy: the الذكاء الأكاديمي product card — honest local-composer
    // scope, carried over verbatim from the r190/r168b wording contract.
    expect(page).toContain('شروحات مخصَّصة');
    expect(page).toContain('خطط مراجعة حسب أدائك الفعلي');
  });

  it('r188 → r191 — no invented adoption story; the proof section states its source', () => {
    // The r188 folio landing drops the progress-stats chapter wholesale:
    // no 40/70/90 figures, no «تأسست 1988» trust band, no invented
    // adoption. r191 keeps the contract with the new copy: the proof
    // section's numbers are computed from the code and it says so.
    const page = stripJsx(read('src/pages/LandingPage.tsx'));
    expect(page).not.toContain('نتائج تجربة فعلية');
    expect(page).not.toContain('CountUp');
    expect(page).not.toContain('أرقام توضيحيّة');
    expect(page).toContain('كل رقم يُحسب من حالة الميزات في النظام');
    // r191 operator gate: the rejected wording must never resurface on
    // user-facing surfaces (صُنعت في ليبيا + ما يُشحن اليوم).
    expect(page).not.toContain('صُنعت في ليبيا');
    expect(page).not.toContain('ما يُشحن');
    const html = read('index.html');
    expect(html).not.toContain('صُنعت في ليبيا');
  });

  it('r188 → r191 — the vision stage labels AR/VR as a catalog, not running experiments', () => {
    const page = stripJsx(read('src/pages/LandingPage.tsx'));
    expect(page).toContain('المعامل الافتراضية');
    expect(page).toContain('دون تشغيل بعد');
  });

  it('r188 — the section landmarks carry distinct aria-labels', () => {
    const page = stripJsx(read('src/pages/LandingPage.tsx'));
    expect(page).toContain('aria-label="مدارك — منصّة التعليم الذكي"');
    expect(page).toContain('aria-label="ابدأ رحلتك — أنشئ حسابك"');
    // The old duplicate pair must not reappear.
    const dupe = page.match(/aria-label="ابدأ رحلتك"/g);
    expect(dupe).toBeNull();
  });
});

describe('r168b — research scan honesty + modal validation', () => {
  it('the page subtitle and explainer step 2 label the simulation', () => {
    const page = stripJsx(read('src/pages/student/ResearchPage.tsx'));
    expect(page).toContain('محاكاة حتى تفعيل كشف حقيقي');
    const step2 = page.match(/n: 2, title: 'فحص أوتوماتيكي', desc: '[^']*'/)?.[0] ?? '';
    expect(step2).toContain('محاكاة');
    expect(page).not.toContain('أربع مراحل أوتوماتيكية بالكامل');
  });

  it('the title field is marked required and the disabled submit announces why', () => {
    const page = stripJsx(read('src/pages/student/ResearchPage.tsx'));
    expect(page).toContain('label="عنوان البحث (مطلوب)"');
    expect(page).toMatch(/\{!canSubmit && !isPending && \(/);
    expect(page).toContain('role="status"');
    expect(page).toContain('لتتمكّن من الرفع');
  });
});

describe('r168b — AR/VR page subtitle is a catalog disclosure', () => {
  it('the subtitle names the index + unavailable launch', () => {
    const page = stripJsx(read('src/pages/student/MorePages.tsx'));
    expect(page).not.toContain('محتوى تفاعليّ ثلاثيّ الأبعاد');
    expect(page).toContain('فهرس تجارب AR/VR للمقرّرات العمليّة — التشغيل غير متاح بعد');
  });
});

describe('r168b — training certificates are honest records', () => {
  it('subtitle + KPI + badges drop accreditation claims', () => {
    const page = stripJsx(read('src/pages/student/TrainingPages.tsx'));
    expect(page).not.toContain('شهادة معتمدة');
    expect(page).toContain('سجلّ إتمام موثَّق من المنصة');
    expect(page).not.toContain('معتمدة من المنصة');
    expect(page).not.toContain('ساعة معتمدة');
    expect(page).toContain('ساعات تقديرية');
  });
});

describe('r168b — docs/02 documents the student-surface exceptions', () => {
  it('the row is no longer a blanket [منفَّذة]', () => {
    const doc = read('../docs/02-features.md');
    expect(doc).toContain('بقية سطوح الطالب — [منفَّذة مع استثناءات موثَّقة]');
    expect(doc).toContain('تجارب AR (فهرس بلا تشغيل)');
    // r171a closed the r168b student-inbox gap: the doc now documents
    // the SHIPPED inbox (and the honest remaining ceiling — staff roles
    // still have no inbox route) instead of «لا صندوق طالب بعد».
    expect(doc).toContain('صندوق رسائل كامل للطالب');
    expect(doc).toContain('بلا صندوق رسائل خاص');
    expect(doc).not.toContain('لا صندوق طالب بعد');
  });
});
