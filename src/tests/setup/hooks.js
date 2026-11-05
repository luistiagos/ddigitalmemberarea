// Hooks de resolucao/carga para o `node --test` (ver loader.js).
// - `@/x` -> `src/x` (o alias vive so no vite.config.js; o Node exige `#` em subpath import).
// - especificador relativo/alias sem extensao: tenta .js, .jsx, /index.js, /index.jsx.
// - `.jsx` -> esbuild.transform (jsx automatico); `.css` -> modulo vazio.
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const SRC_URL = new URL('../../', import.meta.url); // .../src/
const EXTENSIONS = ['', '.js', '.jsx', '/index.js', '/index.jsx'];

function isFile(url) {
  const p = fileURLToPath(url);
  return existsSync(p) && statSync(p).isFile();
}

function findWithExtension(baseUrl) {
  for (const ext of EXTENSIONS) {
    const candidate = new URL(baseUrl.href + ext);
    if (isFile(candidate)) return candidate.href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let base = null;
  if (specifier.startsWith('@/')) {
    base = new URL(specifier.slice(2), SRC_URL);
  } else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    base = new URL(specifier, context.parentURL);
  }
  if (base) {
    const found = findWithExtension(base);
    if (found) return { url: found, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.css')) {
    return { format: 'module', source: 'export default {};', shortCircuit: true };
  }
  if (url.endsWith('.jsx')) {
    const code = await readFile(fileURLToPath(url), 'utf8');
    const out = await transform(code, {
      loader: 'jsx',
      jsx: 'automatic',
      format: 'esm',
      sourcefile: fileURLToPath(url),
      sourcemap: 'inline',
    });
    return { format: 'module', source: out.code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
