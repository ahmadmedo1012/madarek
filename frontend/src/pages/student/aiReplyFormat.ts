/**
 * aiReplyFormat.ts — the pure markdown-lite reply formatter (r176c).
 *
 * Free-router models emit markdown routinely (`**bold**`, `#` headings,
 * `-` list lines) even when asked not to; the chat bubbles render RAW
 * text (no markdown pipeline, by design — inert text only, never
 * dangerouslySetInnerHTML). This formatter de-markdowns a reply into
 * render blocks: plain text lines pass verbatim (minus emphasis and
 * heading markers), and runs of leading-`-`/`*` list lines become one
 * list block so RTL bullets read correctly.
 *
 * R362 (Agent 5, §F code rendering): fenced code blocks are now a
 * first-class block kind. A programming answer from a real LLM
 * (` ```ts … ``` `) used to render as literal backtick lines wrapped
 * in the RTL paragraph rhythm — unreadable for the exact audience
 * (programming students) the assistant serves. Fences parse into a
 * `code` block: the markers drop, the body stays VERBATIM (no
 * emphasis stripping, no list parsing — code is code), and the
 * renderer owns the LTR/mono presentation. An unclosed fence closes
 * at end-of-input: a streaming reply whose closing fence has not
 * arrived yet still renders its code as code. `splitInlineCode` does
 * the same for `` `span` `` runs INSIDE text/list lines (an identifier
 * like fetch_user() scrambles in bidi plain text; a mono LTR chip
 * keeps it legible). Pure and dependency-free — test-pinned beside
 * the rest (AiAssistantPage-chat-hygiene.test.tsx).
 */

/** One renderable block of an assistant reply. */
export type ReplyBlock =
  | { kind: 'text'; lines: string[] }
  | { kind: 'list'; items: string[] }
  | { kind: 'code'; lang: string | null; lines: string[] };

/** Strip inline emphasis + heading markers from one line. `**bold**`,
 * `__underline__`, `*em*`/`_em_` pairs collapse to their inner text;
 * 1–6 leading `#`/`##`… heading markers (with their following space)
 * are removed. Everything else passes VERBATIM (no interpretation of
 * links, code fences, or HTML — they render as the inert text they
 * are). */
export function stripInlineMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '$1');
}

/** A list line: optional leading spaces, then `-` or `*` or `•`, then
 * a space, then content. Ordered-list lines (`1. …`) stay text — the
 * model already numbers them. */
const LIST_LINE = /^\s*(?:[-*•])\s+(.*)$/;

/** A fence line: 3+ backticks (optionally followed by a language
 * token) opens; a bare 3+ backtick line closes. Tildes (~~~) are the
 * markdown alternative some models emit — both count. */
const FENCE_OPEN = /^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/;
const FENCE_CLOSE = /^\s*(`{3,}|~{3,})\s*$/;

/** One inline span of a text/list line: plain text or a `` `code` ``
 * run (markers dropped by the splitter, never rendered). */
export type InlineSpan = { text: string } | { code: string };

/** Split ONE line into plain-text and inline-code spans. Backtick
 * pairs delimit the code runs; an unpaired backtick stays verbatim
 * text (a stray accent is not markup). Pure. */
export function splitInlineCode(line: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let rest = line;
  let guard = 0;
  while (rest.length > 0 && guard++ < 200) {
    const open = rest.indexOf('`');
    if (open === -1) {
      spans.push({ text: rest });
      break;
    }
    const close = rest.indexOf('`', open + 1);
    if (close === -1) {
      // Unpaired — the remainder is plain text.
      spans.push({ text: rest });
      break;
    }
    if (open > 0) spans.push({ text: rest.slice(0, open) });
    const code = rest.slice(open + 1, close);
    spans.push({ code });
    rest = rest.slice(close + 1);
  }
  return spans.filter((s): s is InlineSpan =>
    ('text' in s && s.text !== '') || ('code' in s && s.code !== ''));
}

/**
 * Split a reply into render blocks. Consecutive list lines group into
 * ONE list block (preserving order); fenced ```/~~~ regions become
 * verbatim code blocks (see the header — emphasis/list parsing is
 * suspended inside a fence); everything else accumulates as text
 * lines. Empty lines become empty text lines (the Multiline renderer
 * keeps them as breathing room). Non-mutating.
 */
export function formatReplyBlocks(reply: string): ReplyBlock[] {
  const blocks: ReplyBlock[] = [];
  let text: string[] = [];
  let items: string[] = [];
  let code: string[] | null = null;
  let codeLang: string | null = null;

  const flushText = () => {
    if (text.length > 0) {
      blocks.push({ kind: 'text', lines: text });
      text = [];
    }
  };
  const flushList = () => {
    if (items.length > 0) {
      blocks.push({ kind: 'list', items });
      items = [];
    }
  };
  const flushCode = () => {
    if (code !== null) {
      blocks.push({ kind: 'code', lang: codeLang, lines: code });
      code = null;
      codeLang = null;
    }
  };

  for (const raw of reply.split('\n')) {
    if (code !== null) {
      if (FENCE_CLOSE.test(raw)) {
        flushCode();
      } else {
        code.push(raw);
      }
      continue;
    }
    const fence = FENCE_OPEN.exec(raw);
    if (fence) {
      flushText();
      flushList();
      code = [];
      codeLang = fence[2] && fence[2].length > 0 ? fence[2] : null;
      continue;
    }
    const match = LIST_LINE.exec(raw);
    if (match) {
      flushText();
      items.push(stripInlineMarkdown(match[1] ?? '').trim());
    } else {
      flushList();
      text.push(stripInlineMarkdown(raw));
    }
  }
  // An unclosed fence closes at end-of-input (the streaming case —
  // the closer may simply not have arrived yet).
  flushCode();
  flushText();
  flushList();
  return blocks;
}
