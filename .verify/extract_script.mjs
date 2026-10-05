// Extracts the PYTHON_ESX_CONVERTER_SCRIPT template literal exactly as Vite/TS would
// evaluate it, so we can inspect the real generated Python source.
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';

const result = await build({
  entryPoints: ['src/services/pythonScriptGenerator.ts'],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'neutral',
});

const code = result.outputFiles[0].text;
const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
writeFileSync('.verify/esx_converter.generated.py', mod.PYTHON_ESX_CONVERTER_SCRIPT, 'utf8');
console.log('WROTE .verify/esx_converter.generated.py  bytes=', mod.PYTHON_ESX_CONVERTER_SCRIPT.length);
