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
 * Pure and dependency-free — a direct DB-free test pin target
 * (tests/unit/aiReplyFormat.test.ts). Rendered ONLY in chat bubbles
 * (ai-chat.css is not extended; the list uses the existing utility
 * classes + spacing tokens).
 */

/** One renderable block of an assistant reply. */
export type ReplyBlock =
  | { kind: 'text'; lines: string[] }
  | { kind: 'list'; items: string[] };

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

/**
 * Split a reply into render blocks. Consecutive list lines group into
 * ONE list block (preserving order); everything else accumulates as
 * text lines. Empty lines become empty text lines (the Multiline
 * renderer keeps them as breathing room). Non-mutating.
 */
export function formatReplyBlocks(reply: string): ReplyBlock[] {
  const blocks: ReplyBlock[] = [];
  let text: string[] = [];
  let items: string[] = [];
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
  for (const raw of reply.split('\n')) {
    const match = LIST_LINE.exec(raw);
    if (match) {
      flushText();
      items.push(stripInlineMarkdown(match[1] ?? '').trim());
    } else {
      flushList();
      text.push(stripInlineMarkdown(raw));
    }
  }
  flushText();
  flushList();
  return blocks;
}
