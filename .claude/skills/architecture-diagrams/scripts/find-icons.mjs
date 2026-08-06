#!/usr/bin/env node
/**
 * Search theSVG registry for icon slugs. Always run this before writing a
 * diagram -- guessing slugs is the single most common way a build fails.
 *
 *   node find-icons.mjs dynamodb
 *   node find-icons.mjs "load balancer" lambda golang     # several terms at once
 *   node find-icons.mjs --prefix aws- --category Database # browse a whole family
 *   node find-icons.mjs --limit 20 kubernetes
 *   node find-icons.mjs --refresh dynamodb                # re-fetch the registry
 */
import { getRegistry } from "../lib/thesvg.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
};

const limit = Number(flag("limit") ?? 12);
const prefix = flag("prefix");
const category = flag("category");
const refresh = flag("refresh") === true;
const terms = argv.filter((a) => !a.startsWith("--")).map((t) => t.toLowerCase());

const { icons } = await getRegistry({ refresh });

let pool = icons;
if (prefix) pool = pool.filter((i) => i.slug.startsWith(prefix));
if (category) pool = pool.filter((i) => i.categories?.some((c) => c.toLowerCase() === String(category).toLowerCase()));

if (!terms.length) {
  if (!prefix && !category) {
    console.error("usage: find-icons.mjs [--prefix aws-] [--category Database] [--limit N] <term>...");
    process.exit(1);
  }
  // Browsing mode: no search terms, just list what matched the filters.
  console.log(`${pool.length} icon(s) matching filters:\n`);
  pool.slice(0, limit === 12 ? 60 : limit).forEach(print);
  if (pool.length > limit) console.log(`  ... and ${pool.length - limit} more (raise --limit)`);
  process.exit(0);
}

/** Rank by how directly the term hits: exact slug > slug prefix > title > alias > substring. */
function score(icon, term) {
  const slug = icon.slug.toLowerCase();
  const title = icon.title.toLowerCase();
  const aliases = (icon.aliases ?? []).map((a) => a.toLowerCase());

  if (slug === term) return 100;
  if (title === term) return 95;
  if (aliases.includes(term)) return 90;
  if (slug.endsWith(`-${term}`)) return 80;
  if (slug.startsWith(`${term}-`)) return 75;
  if (title.startsWith(term)) return 70;
  if (slug.includes(term.replace(/\s+/g, "-"))) return 60;
  if (title.includes(term)) return 50;
  if (aliases.some((a) => a.includes(term))) return 40;
  return 0;
}

function print(i) {
  const cats = i.categories?.length ? `  [${i.categories.join(", ")}]` : "";
  console.log(`  ${i.slug.padEnd(52)} ${i.title}${cats}`);
}

const search = (term) =>
  pool
    .map((i) => [score(i, term), i])
    .filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0] || a[1].slug.length - b[1].slug.length)
    .slice(0, limit)
    .map(([, i]) => i);

/**
 * Nothing matched. Retry on every shorter prefix of the term and pool the
 * results -- catches "golang" -> "go", "kubernetes-ish" -> "k8s-*" near-misses.
 * Shortest slug first, since the canonical icon for a thing has the plainest slug.
 */
function didYouMean(term) {
  const seen = new Map();
  for (let n = term.length - 1; n >= 2; n--) {
    for (const i of search(term.slice(0, n))) if (!seen.has(i.slug)) seen.set(i.slug, i);
  }
  return [...seen.values()].sort((a, b) => a.slug.length - b.slug.length).slice(0, 6);
}

let found = true;
for (const term of terms) {
  const hits = search(term);

  console.log(`\n"${term}" -> ${hits.length ? `${hits.length} match(es)` : "NO MATCH"}`);
  hits.forEach(print);

  if (!hits.length) {
    found = false;
    const near = didYouMean(term);
    if (near.length) {
      console.log("  closest:");
      near.forEach(print);
    }
  }
}
console.log();
process.exit(found ? 0 : 1);
