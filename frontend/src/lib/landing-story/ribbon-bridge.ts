/**
 * landing-story/ribbon-bridge.ts — the Agent-1 artwork discovery bridge.
 *
 * Agent 1 owns the landing artwork module and ships `createKnowledgeRibbon(
 * THREE, options)`. This branch must build standalone at the shared base,
 * where that module does not exist yet — so discovery happens at RUNTIME
 * via `import.meta.glob` (Vite): an empty match set compiles cleanly, and
 * the moment Agent 1's branch lands next to this code, the artwork is
 * adopted automatically with zero edits here and zero API changes there.
 *
 * Recognized locations (any module exporting `createKnowledgeRibbon`):
 *   frontend/src/components/landing/knowledge-ribbon.{ts,tsx}
 *   frontend/src/components/landing/*ribbon*.{ts,tsx}
 *   frontend/src/components/landing/madarek-artwork.{ts,tsx}
 *   frontend/src/lib/knowledge-ribbon.{ts,tsx}
 *   frontend/src/lib/landing-artwork.{ts,tsx}
 *
 * When several match, the alphabetically-first module that actually
 * exports the factory wins (deterministic).
 */
import type { KnowledgeRibbonFactory } from './types';

/* Recognized locations (any module exporting `createKnowledgeRibbon`):
 *   frontend/src/components/landing/knowledge-ribbon.{ts,tsx}
 *   frontend/src/components/landing/*ribbon*.{ts,tsx}
 *   frontend/src/components/landing/madarek-artwork.{ts,tsx}
 *   frontend/src/lib/knowledge-ribbon.{ts,tsx}
 *   frontend/src/lib/landing-artwork.{ts,tsx}
 */

type RibbonModule = Record<string, unknown> | null | undefined;

/* Each pattern must be a literal for Vite's build-time glob resolution;
 * an empty match set compiles cleanly (this is what keeps the branch
 * green before Agent 1's artwork lands). Lazy by default (no `eager`). */
const loaders: Record<string, () => Promise<RibbonModule>> = {
  ...(import.meta.glob(
    '../../components/landing/knowledge-ribbon.{ts,tsx}',
  ) as Record<string, () => Promise<RibbonModule>>),
  ...(import.meta.glob(
    '../../components/landing/*ribbon*.{ts,tsx}',
  ) as Record<string, () => Promise<RibbonModule>>),
  ...(import.meta.glob(
    '../../components/landing/madarek-artwork.{ts,tsx}',
  ) as Record<string, () => Promise<RibbonModule>>),
  ...(import.meta.glob(
    '../../lib/knowledge-ribbon.{ts,tsx}',
  ) as Record<string, () => Promise<RibbonModule>>),
  ...(import.meta.glob(
    '../../lib/landing-artwork.{ts,tsx}',
  ) as Record<string, () => Promise<RibbonModule>>),
};

export async function loadKnowledgeRibbon(): Promise<KnowledgeRibbonFactory | null> {
  const keys = Object.keys(loaders).sort();
  for (const key of keys) {
    try {
      const mod = await loaders[key]!();
      const factory = (mod as Record<string, unknown> | null | undefined)?.[
        'createKnowledgeRibbon'
      ];
      if (typeof factory === 'function') return factory as KnowledgeRibbonFactory;
    } catch {
      /* a broken candidate must never take the poster down — try next */
    }
  }
  return null;
}
