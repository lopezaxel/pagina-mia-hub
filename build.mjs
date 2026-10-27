// Arma dist/ con lo que el sitio realmente usa. Es lo único que Vercel publica (ver vercel.json).
// Así no se sirven .claude/, los originales de public/assets/misc/ ni las imágenes sin referenciar.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT = 'dist';
const ROOT_FILES = ['index.html', 'styles.css', 'script.js', 'favicon.svg', 'robots.txt', 'sitemap.xml'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Todo lo que index.html y styles.css referencian bajo public/ (src, srcset, preload, url(), og:image).
const sources = ['index.html', 'styles.css'].map(f => readFileSync(f, 'utf8')).join('\n');
const assets = [...new Set(sources.match(/public\/[^\s"'),]+/g) ?? [])];

const missing = [...ROOT_FILES, ...assets].filter(f => !existsSync(f));
if (missing.length) {
  console.error('build: faltan archivos referenciados:\n  ' + missing.join('\n  '));
  process.exit(1);
}

for (const f of [...ROOT_FILES, ...assets]) {
  mkdirSync(dirname(join(OUT, f)), { recursive: true });
  cpSync(f, join(OUT, f));
}
console.log(`build: ${ROOT_FILES.length} archivos de raíz + ${assets.length} assets -> ${OUT}/`);
