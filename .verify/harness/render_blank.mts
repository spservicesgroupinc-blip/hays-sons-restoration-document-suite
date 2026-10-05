/**
 * Verification harness: render the checklist with NO merged job data.
 *
 * This isolates the form's printed geometry (checkbox gutter, ruled lines,
 * yellow banners, captions) so `.verify/compare.py` measures layout fidelity
 * without intentional filled-in values appearing as differences.
 *
 * Run with: node --import tsx .verify/harness/render_blank.mts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const load = (rel: string) => import(pathToFileURL(path.join(root, rel)).href);

const { generateProductionChecklistPdf } = (await load(
  'src/services/productionChecklistPdf.ts'
)) as typeof import('../../src/services/productionChecklistPdf');
const { INITIAL_PROJECT } = (await load('src/App.tsx')) as typeof import('../../src/App');

const doc = generateProductionChecklistPdf(INITIAL_PROJECT, { blank: true });
const bytes = Buffer.from(doc.output('arraybuffer'));
const out = path.join(here, 'blank.pdf');
writeFileSync(out, bytes);
console.log(`wrote ${out} (${bytes.length} bytes)`);
