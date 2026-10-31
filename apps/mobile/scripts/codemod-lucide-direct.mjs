#!/usr/bin/env node
/**
 * R327 C4 codemod — lucide barrel → direct icon imports.
 *
 * Metro does not tree-shake the lucide-react-native barrel: every icon in
 * the library rides the bundle (1999 icon modules ≈ 1MB of mapped JS for
 * the 90 icons the app actually uses). This rewrites every value import
 * from "lucide-react-native" into per-icon default imports via the
 * package's ./icons/* exports map (which carries its own .d.ts), leaving
 * `import type { LucideIcon }` untouched (types ship zero bytes).
 *
 * One-off migration — run from apps/mobile:
 *   node scripts/codemod-lucide-direct.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { globSync } from "node:fs";

const ROOTS = ["src", "app"];
const CHECK = process.argv.includes("--check");
const ICONS_DIR = "node_modules/lucide-react-native/dist/esm/icons";

function pascalToKebab(name) {
  // WifiOff → wifi-off · AArrowDown → a-arrow-down · Undo2 → undo-2
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .trim();
  return spaced.split(/\s+/).map((w) => w.toLowerCase()).join("-");
}

/** name → icon file, resolved through the barrel's export statements
 *  (the barrel carries aliases: Trash2 → trash.mjs, Building2 → building-complex.mjs…). */
const BARREL = "node_modules/lucide-react-native/dist/esm/lucide-react-native.mjs";
const nameToFile = new Map();
{
  const barrel = fs.readFileSync(BARREL, "utf8");
  const re = /export\s*\{([^}]+)\}\s*from\s*'\.\/icons\/([^']+)\.mjs';?/g;
  let m;
  while ((m = re.exec(barrel)) !== null) {
    const file = m[2];
    for (const part of m[1].split(",")) {
      const name = part.split(" as ")[1]?.trim();
      if (name) nameToFile.set(name, file);
    }
  }
}

const files = [];
for (const root of ROOTS) {
  const dir = path.resolve(root);
  if (!fs.existsSync(dir)) continue;
  files.push(...globSync(path.join(dir, "**/*.@(ts|tsx)")));
}

let totalChanged = 0;
const failures = [];

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  // value imports with braces (type-only imports excluded)
  const re = /import\s*\{([^}]+)\}\s*from\s*"(lucide-react-native)";?/g;
  let out = src;
  let changed = false;
  const problems = [];

  out = out.replace(re, (full, names, pkg) => {
    const parts = names.split(",").map((s) => s.trim()).filter(Boolean);
    const valueParts = [];
    const typeParts = [];
    for (const p of parts) {
      if (p.startsWith("type ")) typeParts.push(p.slice(5).trim());
      else valueParts.push(p);
    }
    if (valueParts.length === 0) return full; // pure type import — untouched
    const lines = [];
    for (const t of typeParts) {
      lines.push(`import type { ${t} } from "${pkg}";`);
    }
    for (const v of valueParts) {
      if (v.includes(" as ")) {
        problems.push(`alias import: ${v}`);
        continue;
      }
      // resolve through the barrel map first (aliases), fall back to the
      // naive kebab name, then verify the file exists.
      const file = nameToFile.get(v) ?? pascalToKebab(v);
      if (!fs.existsSync(path.join(ICONS_DIR, `${file}.mjs`))) {
        problems.push(`no icon file for ${v} → ${file}.mjs`);
        continue;
      }
      lines.push(`import ${v} from "${pkg}/icons/${file}";`);
    }
    if (problems.length) return full;
    changed = true;
    return lines.join("\n");
  });

  if (problems.length) failures.push({ file, problems });
  if (changed) {
    totalChanged++;
    if (!CHECK) fs.writeFileSync(file, out);
  }
}

console.log(`files rewritten: ${totalChanged}${CHECK ? " (check mode — nothing written)" : ""}`);
if (failures.length) {
  console.log("FAILURES:");
  for (const f of failures) console.log(" ", f.file, "→", f.problems.join("; "));
  process.exit(1);
}
