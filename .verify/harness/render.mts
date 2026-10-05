/**
 * Verification harness (Node): render the Production Checklist with the suite's
 * real sample claim data to .verify/harness/out.pdf so the Python comparator can
 * diff it against productiontemplate.pdf.
 *
 * Run with:
 *   node --import tsx .verify/harness/render.mts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const load = (rel: string) => import(pathToFileURL(path.join(root, rel)).href);

const { generateProductionChecklistPdf, buildChecklistValues } = (await load(
  'src/services/productionChecklistPdf.ts'
)) as typeof import('../../src/services/productionChecklistPdf');

const { INITIAL_PROJECT } = (await load('src/App.tsx')) as typeof import('../../src/App');

const doc = generateProductionChecklistPdf(INITIAL_PROJECT);
const bytes = Buffer.from(doc.output('arraybuffer'));
const out = path.join(here, 'out.pdf');
writeFileSync(out, bytes);

console.log(`wrote ${out} (${bytes.length} bytes)`);
console.log('values merged onto the form:');
for (const [key, value] of Object.entries(buildChecklistValues(INITIAL_PROJECT))) {
  if (value) console.log(`  ${key} = ${JSON.stringify(value)}`);
}
