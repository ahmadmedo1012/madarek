#!/usr/bin/env node
/**
 * worklet-audit.mjs — R349 M1.3c · the UI-runtime law, enforced at lint time.
 *
 * THE CRASH CLASS (the owner's iPhone .ips, SIGABRT): a closure that
 * executes on the Reanimated UI runtime CALLS a captured plain-JS
 * function. The call throws inside the animation-frame batchinator,
 * there is no JS catch, the process aborts. Jest mocks Reanimated, so
 * no test sees it — this AST guard + the CI simulator smoke are the
 * real defences.
 *
 * The law (react-native-worklets 0.13): inside a WORKLET CONTEXT —
 *   · any function whose body carries the `'worklet'` directive, or
 *   · a function passed to a Reanimated hook that auto-workletizes its
 *     callback (useDerivedValue / useAnimatedStyle / useAnimatedProps /
 *     useAnimatedReaction / useFrameCallback / useAnimatedScrollHandler)
 * — every CALLED identifier must resolve to:
 *   · a worklet (function with the directive) in user code, or
 *   · a builtin/global (String, Math, Number, …), or
 *   · a library import (react-native, reanimated, worklets — theirs).
 * Calling a user-code function WITHOUT the directive = FAIL, including
 * one level of cross-file resolution (imports via relative paths or the
 * `@/` alias into apps/mobile/src).
 *
 * Honest scope (documented, not hidden):
 *   · PROP-RECEIVED functions (a component parameter called inside a
 *     worklet context) are not statically resolvable — CountUp guards
 *     that pattern at RUNTIME (isWorkletFunction). The audit reports
 *     them as INFO lines, never failures.
 *   · Member-expression calls (obj.method()) are not judged — the spec
 *     class is identifier calls resolving to user-declared functions.
 *
 * Dependency: `typescript` (root workspace devDep). Run from repo root:
 *   node scripts/qa/worklet-audit.mjs
 * Exit 0 = lawful · exit 1 = violations with a file:line table.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = path.dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = path.resolve(here, '../../apps/mobile');
const SRC_DIRS = ['src', 'app'].map((d) => path.join(MOBILE_ROOT, d));

/** Reanimated hooks whose callback arguments become worklet contexts. */
const WORKLET_HOOKS = new Set([
  'useDerivedValue',
  'useAnimatedStyle',
  'useAnimatedProps',
  'useAnimatedReaction',
  'useFrameCallback',
  'useAnimatedScrollHandler',
]);

/** Globals always lawful to call on the UI runtime (Hermes builtins). */
const GLOBALS = new Set([
  'String', 'Number', 'Math', 'Boolean', 'Array', 'Object', 'JSON',
  'isNaN', 'isFinite', 'parseInt', 'parseFloat', 'encodeURIComponent',
  'decodeURIComponent', 'Date', 'Error', 'Intl', 'Map', 'Set', 'Promise',
  'Symbol', 'BigInt', 'RegExp', 'console',
]);

/** Library modules whose exports are theirs, not user code. */
const LIB_PREFIXES = ['react-native', 'expo', '@expo', 'react', '@react', 'zustand', 'lucide'];

/* ── file collection ──────────────────────────────────────────────── */

function collectFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(p, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.[jt]sx?$/.test(entry.name)) {
      out.push(p);
    }
  }
}

const files = [];
for (const d of SRC_DIRS) collectFiles(d, files);

const sfCache = new Map();
function parseFile(p) {
  if (sfCache.has(p)) return sfCache.get(p);
  const sf = ts.createSourceFile(p, fs.readFileSync(p, 'utf8'), ts.ScriptTarget.Latest, true);
  sfCache.set(p, sf);
  return sf;
}

/* ── per-file symbol table ────────────────────────────────────────── */

function hasWorkletDirective(fn) {
  const body = fn.body;
  if (!body) return false;
  if (!ts.isBlock(body)) return false;
  return body.statements.some(
    (st) =>
      ts.isExpressionStatement(st) &&
      ts.isStringLiteralLike(st.expression) &&
      st.expression.text === 'worklet',
  );
}

function buildSymbols(sf) {
  const localFns = new Map(); // name -> { worklet: boolean, line }
  const imports = new Map(); // imported name -> { module: string, line }
  const exported = new Map(); // exported name -> { worklet: boolean, line }

  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      localFns.set(node.name.text, {
        worklet: hasWorkletDirective(node),
        line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      });
    } else if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer && ts.isFunctionLike(d.initializer)) {
          localFns.set(d.name.text, {
            worklet: hasWorkletDirective(d.initializer),
            line: sf.getLineAndCharacterOfPosition(d.getStart()).line + 1,
          });
        }
      }
    } else if (ts.isImportDeclaration(node) && node.importClause?.namedBindings) {
      const nb = node.importClause.namedBindings;
      if (ts.isNamedImports(nb)) {
        for (const el of nb.elements) {
          imports.set(el.name.text, {
            module: node.moduleSpecifier.text,
            line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          });
        }
      }
    } else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) {
        const target = (el.propertyName ?? el.name).text;
        const src = localFns.get(target);
        if (src) exported.set(el.name.text, src);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  // exported function declarations
  for (const [name, info] of localFns) {
    if (!exported.has(name)) {
      // cheap export check: re-scan for "export function name" / "export const name"
      const text = sf.text;
      const re = new RegExp(`export (async )?(function ${name}\\b|const ${name}\\b)`);
      if (re.test(text)) exported.set(name, info);
    }
  }
  return { localFns, imports, exported };
}

/* ── cross-file resolution (one level) ────────────────────────────── */

function resolveImportModule(specifier, fromFile) {
  let target = null;
  if (specifier.startsWith('@/')) {
    target = path.join(MOBILE_ROOT, 'src', specifier.slice(2));
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    target = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null; // library or package
  }
  for (const cand of [
    target + '.ts',
    target + '.tsx',
    path.join(target, 'index.ts'),
    path.join(target, 'index.tsx'),
  ]) {
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

function resolveImportedFn(name, specifier, fromFile) {
  if (LIB_PREFIXES.some((p) => specifier === p || specifier.startsWith(p + '/'))) return null;
  const mod = resolveImportModule(specifier, fromFile);
  if (!mod) return null;
  const sf = parseFile(mod);
  const { exported } = buildSymbols(sf);
  const hit = exported.get(name);
  return hit ? { ...hit, file: mod } : null;
}

/* ── worklet-context detection + audit ────────────────────────────── */

const violations = [];
const infos = [];

function auditContext(fnNode, sf, symbols, contextLabel) {
  const params = new Set();
  for (const p of fnNode.parameters) {
    if (ts.isIdentifier(p.name)) params.add(p.name.text);
  }

  function walk(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (params.has(name)) {
        infos.push({
          file: sf.fileName,
          line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          name,
          context: contextLabel,
        });
      } else if (symbols.localFns.has(name)) {
        const info = symbols.localFns.get(name);
        if (!info.worklet) {
          violations.push({
            file: sf.fileName,
            line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            name,
            detail: `calls local function «${name}» (no 'worklet' directive) inside ${contextLabel}`,
          });
        }
      } else if (symbols.imports.has(name)) {
        const imp = symbols.imports.get(name);
        const resolved = resolveImportedFn(name, imp.module, sf.fileName);
        if (resolved && !resolved.worklet) {
          violations.push({
            file: sf.fileName,
            line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            name,
            detail: `calls imported «${name}» from ${imp.module} (declared ${path.relative(
              process.cwd(),
              resolved.file,
            )}:${resolved.line} without 'worklet') inside ${contextLabel}`,
          });
        }
      }
      // globals / unresolved (props of objects, etc.) — lawful by scope
    }
    ts.forEachChild(node, walk);
  }
  walk(fnNode.body ?? fnNode);
}

function findContexts(sf, symbols) {
  function visit(node) {
    if (ts.isFunctionLike(node) && hasWorkletDirective(node)) {
      auditContext(node, sf, symbols, "a 'worklet' function");
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (WORKLET_HOOKS.has(node.expression.text)) {
        for (const arg of node.arguments) {
          if (ts.isFunctionLike(arg) || (ts.isArrowFunction(arg))) {
            auditContext(arg, sf, symbols, `${node.expression.text}(...)`);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

for (const f of files) {
  const sf = parseFile(f);
  const symbols = buildSymbols(sf);
  findContexts(sf, symbols);
}

/* ── report ────────────────────────────────────────────────────────── */

const rel = (p) => path.relative(process.cwd(), p);

if (violations.length > 0) {
  console.error('worklet-audit: VIOLATIONS — UI-runtime closures calling non-worklet user functions:');
  console.error('');
  for (const v of violations) {
    console.error(`  ${rel(v.file)}:${v.line}`);
    console.error(`    ${v.detail}`);
  }
  console.error('');
  console.error(
    `${violations.length} violation(s). Fix: add the 'worklet' directive to the callee (and its ` +
      'own callees), or move the work to the JS thread via scheduleOnRN.',
  );
  process.exit(1);
}

console.log(
  `worklet-audit: LAWFUL — ${files.length} files scanned, 0 violations ` +
    `(${infos.length} prop-received call(s) runtime-guarded, e.g. CountUp's isWorkletFunction).`,
);
for (const i of infos.slice(0, 5)) {
  console.log(`  info: ${rel(i.file)}:${i.line} «${i.name}» in ${i.context} — prop-received, runtime-guarded`);
}
if (infos.length > 5) console.log(`  … +${infos.length - 5} more`);
