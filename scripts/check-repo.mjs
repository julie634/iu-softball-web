#!/usr/bin/env node
/**
 * Static bug checker for the IU Softball hub.
 * Catches regressions that unit tests may miss (hardcoded seasons, stale feeds).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".cursor",
]);

/** @type {{ file: string, pattern: RegExp, message: string }[]} */
const RULES = [
  {
    file: "client/src/pages/scoreboard.tsx",
    pattern: /data\.ncaa\.com/,
    message: "Live scoreboard must not use data.ncaa.com (404s for current seasons).",
  },
  {
    file: "client/src/pages/scoreboard.tsx",
    pattern: /return `2025\//,
    message: "Live scoreboard must not hardcode NCAA season year 2025.",
  },
  {
    file: "client/src/lib/queryClient.ts",
    pattern: /staleTime:\s*Infinity/,
    message: "Default query staleTime must not be Infinity (live data never refreshes).",
  },
  {
    file: "client/src/pages/stats.tsx",
    pattern: /g\.iu_score\s*>\s*g\.opponent_score/,
    message: "Stats record must use computeRecord so exhibition games are excluded.",
  },
  {
    file: "client/src/lib/selectors.ts",
    pattern: /export type SeasonState = "in-season" \| "postseason" \| "offseason";/,
    message: "SeasonState must include fall-ball.",
  },
];

const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".json"]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function ext(file) {
  const i = file.lastIndexOf(".");
  return i >= 0 ? file.slice(i) : "";
}

const failures = [];

for (const rule of RULES) {
  const full = join(ROOT, rule.file);
  let source = "";
  try {
    source = readFileSync(full, "utf8");
  } catch {
    failures.push(`${rule.file}: missing file (${rule.message})`);
    continue;
  }
  if (rule.pattern.test(source)) {
    failures.push(`${rule.file}: ${rule.message}`);
  }
}

const repoFiles = walk(ROOT).filter((f) => TEXT_EXT.has(ext(f)));
for (const file of repoFiles) {
  const rel = relative(ROOT, file);
  if (rel.startsWith("docs/") || rel.startsWith("scripts/")) continue;
  const source = readFileSync(file, "utf8");
  if (source.includes("data.ncaa.com/casablanca/scoreboard/softball")) {
    failures.push(`${rel}: leftover NCAA Casablanca scoreboard URL`);
  }
}

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
for (const script of ["check", "test", "verify", "check:repo"]) {
  if (!pkg.scripts?.[script]) {
    failures.push(`package.json: missing npm script "${script}"`);
  }
}

const envExample = readFileSync(join(ROOT, ".env.example"), "utf8");
for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) {
  if (!envExample.includes(key)) {
    failures.push(`.env.example: missing ${key}`);
  }
}

if (failures.length) {
  console.error("Repo bug checker failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Repo bug checker passed (${RULES.length} file rules, ${repoFiles.length} scanned files).`);
