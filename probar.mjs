// Recorre la presentación como lo haría el expositor, captura cada diapositiva (y cada paso),
// avisa si algo se sale del lienzo o hay errores, y arma hojas de contacto en revision/.
// Uso: node probar.mjs [url]   (sin url usa index.html local)
// Necesita Playwright: npm i -D playwright && npx playwright install chromium
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
let chromium;
for (const m of ['playwright', '@playwright/test', process.env.PLAYWRIGHT_DIR && pathToFileURL(path.join(process.env.PLAYWRIGHT_DIR, 'index.mjs')).href].filter(Boolean)) {
  try { ({ chromium } = await import(m)); break; } catch {}
}
if (!chromium) {
  console.error('No encontré Playwright. Instálalo en el proyecto: npm i -D playwright && npx playwright install chromium\n(o define PLAYWRIGHT_DIR con la carpeta de @playwright/test de otro proyecto)');
  process.exit(1);
}

const url = process.argv[2] ?? pathToFileURL(path.join(raiz, 'index.html')).href;
const salida = path.join(raiz, 'revision');
fs.rmSync(salida, { recursive: true, force: true });
fs.mkdirSync(salida, { recursive: true });

const navegador = await chromium.launch();
const p = await navegador.newPage({ viewport: { width: 1600, height: 900 } });
const errores = [];
p.on('pageerror', (e) => errores.push(e.message));
p.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
await p.goto(url);

const fotos = [];
const foto = async (nombre) => { const f = path.join(salida, `${String(fotos.length + 1).padStart(2, '0')}-${nombre}.png`); await p.screenshot({ path: f }); fotos.push(f); };
const total = await p.locator('#escenario > section').count();
for (let i = 0; i < total; i++) {
  await p.waitForTimeout(250);
  const id = await p.evaluate(() => document.querySelector('section.activa').id);
  await foto(`${id}-llegando`);
  await p.waitForTimeout(2800);
  const fuera = await p.evaluate(() => {
    const d = document.querySelector('section.activa');
    const s = d.getBoundingClientRect();
    return [...d.querySelectorAll('p,h1,h2,h3,img,svg,li,video')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width && !el.closest('.carrusel') && (r.right > s.right + 2 || r.bottom > s.bottom + 2 || r.left < s.left - 2);
    }).map((el) => `${el.tagName.toLowerCase()} «${(el.textContent || el.getAttribute('alt') || '').trim().slice(0, 40)}»`);
  });
  await foto(id);
  console.log(`${i + 1}. ${id}${fuera.length ? '  ⚠ se sale: ' + fuera.slice(0, 3).join(', ') : ''}`);
  // Pasos propios (data-pasos) y fragmentos: captura cada uno
  const pasos = await p.evaluate(() => { const d = document.querySelector('section.activa'); return Number(d.dataset.pasos || 0) + d.querySelectorAll('.fragment').length; });
  for (let k = 1; k <= pasos; k++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1600); await foto(`${id}-paso${k}`); }
  if (i < total - 1) await p.keyboard.press('ArrowRight');
}

// Hojas de contacto de 9 capturas (sin las de «llegando»)
const finales = fotos.filter((f) => !f.includes('-llegando'));
for (let h = 0; h * 9 < finales.length; h++) {
  const grupo = finales.slice(h * 9, h * 9 + 9).map((f) => `<img src="${pathToFileURL(f).href}" style="width:630px">`).join('');
  await p.setViewportSize({ width: 1900, height: 1100 });
  await p.setContent(`<body style="margin:0;display:flex;flex-wrap:wrap;gap:4px;width:1900px;background:#555">${grupo}</body>`);
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(salida, `hoja${h + 1}.png`), fullPage: true });
}
await navegador.close();
console.log(errores.length ? `Errores en la página:\n${errores.join('\n')}` : 'Sin errores en la página.');
console.log(`Capturas y hojas de contacto en ${salida}`);
