/**
 * r323 B1.2 — the RAG knowledge pure layer. Captions, windows, locators,
 * chunking, the Arabic-aware lexical ranker, the citation block builder,
 * and the ungrounded-note honesty rule. DB-free by construction.
 */
import { describe, expect, it } from 'vitest';
import {
  buildRagContextBlock,
  chunkText,
  formatMinSec,
  groupTranscriptWindows,
  parseSrtVtt,
  parseTimestamp,
  RAG_UNGROUNDED_NOTE,
  scoreKnowledgeHits,
  toCitation,
  type KnowledgeHitRow,
} from '../../src/modules/ai/knowledge.js';

describe('parseTimestamp', () => {
  it('reads SRT (comma) and VTT (dot) grammars', () => {
    expect(parseTimestamp('00:00:14,200')).toBeCloseTo(14.2, 3);
    expect(parseTimestamp('00:14:20.000')).toBe(860);
    expect(parseTimestamp('01:02:03,500')).toBe(3723.5);
  });

  it('refuses junk honestly', () => {
    expect(parseTimestamp('14:20')).toBeNull();
    expect(parseTimestamp('not a time')).toBeNull();
  });
});

describe('formatMinSec', () => {
  it('renders the «الدقيقة م:ث» locator', () => {
    expect(formatMinSec(860)).toBe('الدقيقة 14:20');
    expect(formatMinSec(0)).toBe('الدقيقة 0:00');
    expect(formatMinSec(3725)).toBe('الدقيقة 62:05');
  });
});

describe('parseSrtVtt', () => {
  it('parses SRT blocks with cue numbers and multi-line text', () => {
    const srt = [
      '1',
      '00:00:10,000 --> 00:00:14,000',
      'مرحبا بكم في محاضرة الفيزياء',
      'الجزء الأول',
      '',
      '2',
      '00:00:15,000 --> 00:00:18,300',
      'نتحدث عن قوانين نيوتن',
    ].join('\n');
    const cues = parseSrtVtt(srt);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({ startSec: 10, endSec: 14 });
    expect(cues[0]!.text).toBe('مرحبا بكم في محاضرة الفيزياء الجزء الأول');
    expect(cues[1]!.text).toBe('نتحدث عن قوانين نيوتن');
  });

  it('parses VTT with the WEBVTT header and inline tags stripped', () => {
    const vtt = [
      'WEBVTT',
      '',
      '00:00:05.000 --> 00:00:09.000',
      '<v أستاذ>قانون نيوتن الأول</v>',
      '',
      'NOTE هذا تعليق يجب تجاهله',
      '',
      '00:00:09.000 --> 00:00:12.000',
      'يصف القصور الذاتي',
    ].join('\n');
    const cues = parseSrtVtt(vtt);
    expect(cues).toHaveLength(2);
    expect(cues[0]!.text).toBe('قانون نيوتن الأول');
  });

  it('skips a malformed cue without killing the pass', () => {
    const mixed = ['00:00:01,000 --> 00:00:02,000', 'سليم', '', 'توقيت مكسور', '', '00:00:03,000 --> 00:00:04,000', 'سليم أيضاً'].join('\n');
    const cues = parseSrtVtt(mixed);
    expect(cues).toHaveLength(2);
  });
});

describe('groupTranscriptWindows', () => {
  it('merges cues into ~60s windows carrying real locators', () => {
    const cues = parseSrtVtt(
      [
        '00:00:00,000 --> 00:00:30,000',
        'الجزء الأول من الشرح',
        '',
        '00:00:30,000 --> 00:00:59,000',
        'تكملة الجزء الأول',
        '',
        '00:01:05,000 --> 00:01:40,000',
        'نافذة جديدة',
      ].join('\n'),
    );
    const windows = groupTranscriptWindows(cues, 60);
    expect(windows).toHaveLength(2);
    expect(windows[0]!.text).toContain('الجزء الأول');
    expect(windows[0]!.text).toContain('تكملة');
    expect(windows[1]!.text).toBe('نافذة جديدة');
  });
});

describe('chunkText', () => {
  it('splits on sentence boundaries under the cap', () => {
    const text = 'جملة أولى قصيرة. جملة ثانية قصيرة. جملة ثالثة قصيرة.';
    const chunks = chunkText(text, 40);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(40);
    expect(chunks.join(' ')).toContain('جملة ثالثة');
  });

  it('hard-splits a single monster sentence', () => {
    const monster = 'ا'.repeat(1500);
    const chunks = chunkText(monster, 600);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(600);
  });

  it('returns [] for empty input', () => {
    expect(chunkText('   ')).toEqual([]);
  });
});

describe('scoreKnowledgeHits (Arabic-aware lexical)', () => {
  const rows: KnowledgeHitRow[] = [
    {
      id: '1',
      sourceType: 'lecture',
      sourceId: 'lec1',
      title: 'المحاضرة الثانية',
      locator: 'الدقيقة 14:20',
      url: '/student/lectures?lecture=lec1&t=860',
      content: 'شرح قانون نيوتن الأول للقصور الذاتي بأمثلة عملية',
    },
    {
      id: '2',
      sourceType: 'checkpoint',
      sourceId: 'cp1',
      title: 'المحاضرة الثالثة',
      locator: 'الدقيقة 5:00',
      url: null,
      content: 'سؤال عن تركيب الخلية النباتية وجدارها الخلوي',
    },
  ];

  it('ranks the matching chunk first across hamza/diacritic folds', () => {
    // The question folds أ→ا: «القصور الذاتي» must still hit row 1.
    const hits = scoreKnowledgeHits('اشرح لي القُصور الاُ self الذاتي'.replace('self ', ''), rows);
    expect(hits[0]!.id).toBe('1');
    expect(hits[0]!.score).toBeGreaterThan(0.25);
  });

  it('returns [] when nothing matches (honest empty)', () => {
    expect(scoreKnowledgeHits('الطب النووي والمناعة', rows)).toEqual([]);
  });

  it('returns [] for a query without indexable tokens', () => {
    expect(scoreKnowledgeHits('في من هو', rows)).toEqual([]);
  });
});

describe('buildRagContextBlock', () => {
  const hit: KnowledgeHitRow = {
    id: '1',
    sourceType: 'lecture',
    sourceId: 'lec1',
    title: 'محاضرة القانون الثاني',
    locator: 'الدقيقة 3:15',
    url: '/student/lectures?lecture=lec1&t=195',
    content: 'العلاقة بين القوة والكتلة والتسارع',
  };

  it('numbers the sources and builds matching citations', () => {
    const { block, citations } = buildRagContextBlock([{ ...hit, score: 1.5 }]);
    expect(block).toContain('[1] محاضرة القانون الثاني · الدقيقة 3:15');
    expect(block).toContain('اذكر المصدر');
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({ index: 1, locator: 'الدقيقة 3:15', url: hit.url! });
  });

  it('is empty for no hits (and the ungrounded note exists for the caller)', () => {
    expect(buildRagContextBlock([])).toEqual({ block: '', citations: [] });
    expect(RAG_UNGROUNDED_NOTE).toContain('ليست من مواد المقرر');
  });

  it('clips the snippet at 160 chars', () => {
    const cite = toCitation(1, { ...hit, content: 'ا'.repeat(300) });
    expect(cite.snippet).toHaveLength(161); // 160 + ellipsis
    expect(cite.snippet.endsWith('…')).toBe(true);
  });
});
