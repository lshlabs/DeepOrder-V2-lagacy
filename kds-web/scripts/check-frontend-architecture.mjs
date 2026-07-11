/**
 * Frontend Architecture Check
 *
 * Verifies that the codebase conforms to the Pragmatic Feature Architecture
 * defined in docs/architecture/frontend.md.
 *
 * Run: node scripts/check-frontend-architecture.mjs
 * Or:  npm run check:architecture
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");

let failures = 0;
let warnings = 0;

function fail(msg) {
  console.error(`  FAIL  ${msg}`);
  failures++;
}

function warn(msg) {
  console.warn(`  WARN  ${msg}`);
  warnings++;
}

function pass(msg) {
  console.log(`  pass  ${msg}`);
}

function checkExists(relPath, label) {
  const abs = join(ROOT, relPath);
  if (existsSync(abs)) {
    fail(`${label}: ${relPath} must not exist`);
    return true;
  }
  return false;
}

function checkNotExists(relPath, label) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) {
    pass(`${label}: ${relPath} absent`);
    return false;
  }
  return true;
}

/** Recursively collect all files with given extensions under a directory. */
function collectFiles(dir, exts = [".ts", ".tsx", ".css", ".mjs", ".js"]) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...collectFiles(full, exts));
    } else if (exts.includes(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

function readSrc(file) {
  try {
    return readFileSync(file, "utf-8");
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// CHECK 1: Only one CSS file
// ---------------------------------------------------------------------------
console.log("\n[1] CSS file count");
{
  const cssFiles = collectFiles(SRC, [".css"]);
  const relPaths = cssFiles.map((f) => relative(ROOT, f));
  if (cssFiles.length === 1 && relPaths[0] === "src/app/styles/globals.css") {
    pass(`Single globals.css: ${relPaths[0]}`);
  } else if (cssFiles.length === 0) {
    fail("No CSS files found — globals.css is required");
  } else {
    const unexpected = relPaths.filter((p) => p !== "src/app/styles/globals.css");
    unexpected.forEach((p) => fail(`Unexpected CSS file: ${p}`));
    if (unexpected.length === 0) pass("Single globals.css confirmed");
  }
}

// ---------------------------------------------------------------------------
// CHECK 2: CSS imports only in main.tsx
// ---------------------------------------------------------------------------
console.log("\n[2] CSS imports only in main.tsx");
{
  const allSrcFiles = collectFiles(SRC, [".ts", ".tsx"]);
  for (const file of allSrcFiles) {
    if (file.endsWith("main.tsx")) continue;
    const src = readSrc(file);
    const cssImports = [...src.matchAll(/import\s+['"][^'"]+\.css['"]/g)];
    if (cssImports.length > 0) {
      fail(`CSS import outside main.tsx: ${relative(ROOT, file)}`);
    }
  }
  pass("No stray CSS imports in TS/TSX files");
}

// ---------------------------------------------------------------------------
// CHECK 3: antd import and .ant- selector absence
// ---------------------------------------------------------------------------
console.log("\n[3] Ant Design absence");
{
  const allFiles = collectFiles(SRC, [".ts", ".tsx", ".css"]);
  let found = false;
  for (const file of allFiles) {
    const src = readSrc(file);
    if (/from\s+['"]antd['"]/.test(src) || /from\s+['"]@ant-design/.test(src)) {
      fail(`antd import in: ${relative(ROOT, file)}`);
      found = true;
    }
    if (/\.ant-/.test(src)) {
      fail(`.ant- selector/class in: ${relative(ROOT, file)}`);
      found = true;
    }
  }
  if (!found) pass("No antd imports or .ant- classes");
}

// ---------------------------------------------------------------------------
// CHECK 4: Forbidden directories
// ---------------------------------------------------------------------------
console.log("\n[4] Forbidden directories");
{
  const forbidden = [
    ["src/shared", "src/shared"],
    ["src/features/kds", "src/features/kds (legacy)"],
    ["src/types", "src/types (moved to src/lib/types.ts)"],
  ];
  let allAbsent = true;
  for (const [relPath, label] of forbidden) {
    if (existsSync(join(ROOT, relPath))) {
      const files = collectFiles(join(ROOT, relPath));
      if (files.length > 0) {
        fail(`${label} exists and has files`);
        allAbsent = false;
      } else {
        pass(`${label} is empty (directory only, ignored by git)`);
      }
    } else {
      pass(`${label} absent`);
    }
  }
  if (allAbsent) pass("All forbidden directories absent or empty");
}

// ---------------------------------------------------------------------------
// CHECK 5: Legacy token / class patterns
// ---------------------------------------------------------------------------
console.log("\n[5] Legacy CSS token/class usage");
{
  const LEGACY_PATTERNS = [
    /\bkds-board\b/,
    /\bkds-card\b/,
    /\bkds-lane\b/,
    /\bkds-notice-bar\b/,
    /\bkds-floating-menu\b/,
    /\bkds-row-actions\b/,
    /\bkds-table-actions-inline\b/,
    /\bkds-table--staff\b/,
    /\bkds-table--history\b/,
    /\bkds-panel--stats\b/,
    /\bkds-metric-strip\b/,
    /\bkds-menu-tile\b/,
    /\bkds-segmented-btn\b/,
    /\bauth-card\b/,
    /\bauth-page\b/,
  ];
  const tsxFiles = collectFiles(SRC, [".ts", ".tsx"]);
  let found = false;
  for (const file of tsxFiles) {
    const src = readSrc(file);
    for (const pattern of LEGACY_PATTERNS) {
      if (pattern.test(src)) {
        fail(`Legacy class "${pattern.source}" in: ${relative(ROOT, file)}`);
        found = true;
      }
    }
  }
  if (!found) pass("No legacy CSS token/class patterns found");
}

// ---------------------------------------------------------------------------
// CHECK 6: components/{ui,blocks,layout} must not import from features
// ---------------------------------------------------------------------------
console.log("\n[6] components layer isolation");
{
  const compDir = join(SRC, "components");
  const compFiles = collectFiles(compDir, [".ts", ".tsx"]);
  let found = false;
  for (const file of compFiles) {
    const src = readSrc(file);
    if (/@\/features\//.test(src)) {
      fail(`components file imports from features: ${relative(ROOT, file)}`);
      found = true;
    }
  }
  if (!found) pass("components layer does not import from features");
}

// ---------------------------------------------------------------------------
// CHECK 7: No cross-feature deep imports
// ---------------------------------------------------------------------------
console.log("\n[7] Cross-feature deep import check");
{
  const featuresDir = join(SRC, "features");
  const featureFiles = collectFiles(featuresDir, [".ts", ".tsx"]);
  let found = false;
  for (const file of featureFiles) {
    // Determine which feature this file belongs to
    const rel = relative(featuresDir, file);
    const ownerFeature = rel.split("/")[0]; // e.g. "orders", "tasks"
    const src = readSrc(file);
    // Look for imports from a sibling feature's internals
    // Pattern: @/features/<other>/<anything>/<anything> (more than 2 path segments)
    const matches = [...src.matchAll(/@\/features\/([^/'"]+)\/[^/'"]+\/[^'"]+/g)];
    for (const m of matches) {
      const importedFeature = m[1];
      if (importedFeature !== ownerFeature) {
        fail(`Cross-feature deep import in ${relative(ROOT, file)}: "${m[0]}"`);
        found = true;
      }
    }
  }
  if (!found) pass("No cross-feature deep imports found");
}

// ---------------------------------------------------------------------------
// CHECK 8: @tailwind / @import "tailwindcss" only in globals.css
// ---------------------------------------------------------------------------
console.log("\n[8] @tailwind directive isolation");
{
  const allFiles = collectFiles(SRC, [".css", ".ts", ".tsx"]);
  let found = false;
  for (const file of allFiles) {
    if (file.endsWith("globals.css")) continue;
    const src = readSrc(file);
    if (/@tailwind\b/.test(src) || /@import\s+['"]tailwindcss['"]/.test(src)) {
      fail(`@tailwind directive outside globals.css: ${relative(ROOT, file)}`);
      found = true;
    }
  }
  if (!found) pass("@tailwind only in globals.css");
}

// ---------------------------------------------------------------------------
// CHECK 9: preflight: false must not exist
// ---------------------------------------------------------------------------
console.log("\n[9] Tailwind preflight enabled");
{
  const twConfig = join(ROOT, "tailwind.config.js");
  if (existsSync(twConfig)) {
    const src = readSrc(twConfig);
    if (/preflight\s*:\s*false/.test(src)) {
      fail("tailwind.config.js has preflight: false — must be removed");
    } else {
      pass("preflight is not disabled");
    }
  } else {
    pass("tailwind.config.js not found (v4 inline config)");
  }
}

// ---------------------------------------------------------------------------
// CHECK 10: globals.css must import/use tailwind
// ---------------------------------------------------------------------------
console.log("\n[10] globals.css has Tailwind entry");
{
  const globalsPath = join(SRC, "app/styles/globals.css");
  if (existsSync(globalsPath)) {
    const src = readSrc(globalsPath);
    if (/@tailwind\b/.test(src) || /@import\s+['"]tailwindcss['"]/.test(src)) {
      pass("globals.css contains @tailwind directive");
    } else {
      fail("globals.css missing @tailwind directive");
    }
  } else {
    fail("globals.css not found at src/app/styles/globals.css");
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(60));
if (failures === 0 && warnings === 0) {
  console.log("Architecture check PASSED — all 10 rules satisfied.");
} else if (failures === 0) {
  console.log(`Architecture check PASSED with ${warnings} warning(s).`);
} else {
  console.error(`Architecture check FAILED — ${failures} error(s), ${warnings} warning(s).`);
  process.exit(1);
}
