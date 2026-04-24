#!/usr/bin/env node
/**
 * Ingests renaissance-cards.json (repo root) into versioned per-domain packs.
 *
 * Generates stable deterministic IDs: `slugify(domain):slugify(concept)`.
 * Re-running is idempotent — existing IDs never change for unchanged cards.
 *
 * Usage:
 *   node scripts/import-cards.mjs [--source PATH]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..');
const repoRoot = resolve(appRoot, '..');
const outDir = join(appRoot, 'src/data/flashcards/v1');
const manifestPath = join(appRoot, 'src/data/flashcards/_manifest.json');
const CARD_SET_VERSION = 1;

const args = process.argv.slice(2);
const sourceIdx = args.indexOf('--source');
const sourcePath =
  sourceIdx >= 0 ? args[sourceIdx + 1] : join(repoRoot, 'renaissance-cards.json');

function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function cardId(card) {
  return `${slugify(card.domain)}:${slugify(card.concept)}`;
}

function validateCard(card, idx) {
  if (!card || typeof card !== 'object') throw new Error(`Card ${idx} not an object`);
  if (typeof card.concept !== 'string' || !card.concept.trim()) {
    throw new Error(`Card ${idx} missing concept`);
  }
  if (typeof card.domain !== 'string' || !card.domain.trim()) {
    throw new Error(`Card ${idx} missing domain`);
  }
  const type = card.type || 'standard';
  const validTypes = ['standard', 'connection', 'application', 'synthesis', 'scenario'];
  if (!validTypes.includes(type)) {
    throw new Error(`Card ${idx} has invalid type: ${type}`);
  }
  return type;
}

function main() {
  if (!existsSync(sourcePath)) {
    console.error(`Source not found: ${sourcePath}`);
    console.error('Run from main branch: git show origin/main:renaissance-cards.json > /tmp/renaissance-cards.json');
    console.error('Then: node scripts/import-cards.mjs --source /tmp/renaissance-cards.json');
    process.exit(1);
  }

  const raw = readFileSync(sourcePath, 'utf8');
  const cards = JSON.parse(raw);
  if (!Array.isArray(cards)) throw new Error('Source JSON must be an array');

  // Always merge additions that live under src/data/flashcards/source/*.json
  const sourceDir = join(appRoot, 'src/data/flashcards/source');
  if (existsSync(sourceDir)) {
    for (const name of readdirSync(sourceDir)) {
      if (!name.endsWith('.json')) continue;
      const extraPath = join(sourceDir, name);
      const extraCards = JSON.parse(readFileSync(extraPath, 'utf8'));
      if (!Array.isArray(extraCards)) continue;
      cards.push(...extraCards);
      console.log(`  merged ${extraCards.length} cards from ${name}`);
    }
  }

  // Extra sources passed via --extras (one-off; preferred path is source/ dir)
  const extrasIdx = args.indexOf('--extras');
  if (extrasIdx >= 0) {
    const extras = args.slice(extrasIdx + 1).filter((a) => !a.startsWith('--'));
    for (const extraPath of extras) {
      if (!existsSync(extraPath)) {
        console.warn(`  extras not found, skipping: ${extraPath}`);
        continue;
      }
      const extraCards = JSON.parse(readFileSync(extraPath, 'utf8'));
      if (!Array.isArray(extraCards)) {
        console.warn(`  extras not an array, skipping: ${extraPath}`);
        continue;
      }
      cards.push(...extraCards);
      console.log(`  merged ${extraCards.length} cards from ${extraPath}`);
    }
  }

  const byDomain = new Map();
  const idSet = new Set();
  const collisions = [];
  const typeCounts = {};

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const type = validateCard(card, i);
    const id = cardId(card);
    if (idSet.has(id)) {
      collisions.push({ id, concept: card.concept, domain: card.domain });
      continue;
    }
    idSet.add(id);
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    const normalized = { id, type, ...card };
    if (!normalized.type) normalized.type = 'standard';

    if (!byDomain.has(card.domain)) byDomain.set(card.domain, []);
    byDomain.get(card.domain).push(normalized);
  }

  if (collisions.length) {
    console.warn('Duplicate card IDs skipped:');
    for (const c of collisions) console.warn(`  ${c.id}  (${c.concept} / ${c.domain})`);
  }

  mkdirSync(outDir, { recursive: true });

  const domainFiles = {};
  const domainCounts = {};
  for (const [domain, list] of byDomain.entries()) {
    const slug = slugify(domain);
    const file = `${slug}.json`;
    list.sort((a, b) => a.concept.localeCompare(b.concept));
    writeFileSync(join(outDir, file), JSON.stringify(list, null, 2) + '\n');
    domainFiles[domain] = file;
    domainCounts[domain] = list.length;
  }

  const manifest = {
    version: CARD_SET_VERSION,
    generated_at: new Date().toISOString(),
    source: sourcePath,
    card_count: idSet.size,
    duplicates_skipped: collisions.length,
    domain_counts: domainCounts,
    domain_files: domainFiles,
    type_counts: typeCounts,
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`Wrote ${idSet.size} cards across ${byDomain.size} domains to ${outDir}`);
  console.log(`Manifest: ${manifestPath}`);
}

main();
