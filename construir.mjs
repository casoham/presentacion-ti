// Arma la presentación: junta diapositivas/<id>.html en el orden de presentacion.json
// y escribe index.html autónomo junto a recursos/. Uso: node construir.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const leer = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
const config = JSON.parse(leer('presentacion.json'));
const escapar = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Íconos de línea (trazos de Lucide, licencia ISC) para <x-icon name="…">
const iconos = {
  Clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  Lightning: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  Chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  Book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  Check: '<path d="M20 6 9 17l-5-5"/>',
  Users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  Target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  MapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
};

let secciones = '';
const faltan = [];
for (const id of config.orden) {
  const archivo = path.join('diapositivas', id + '.html');
  if (!fs.existsSync(path.join(raiz, archivo))) { faltan.push(archivo); continue; }
  let s = leer(archivo);
  // {{incluir:recursos/x.svg}} mete el archivo en línea (para animar capas de un SVG)
  s = s.replace(/\{\{incluir:([^}]+)\}\}/g, (_, f) => leer(f.trim()));
  // {{carrusel:recursos/comentarios.json|ejercicios?}} → 3 cintas con la palabra clave resaltada
  s = s.replace(/\{\{carrusel:([^|}]+)\|([^}]+)\}\}/g, (_, f, patron) => {
    const textos = JSON.parse(leer(f.trim())).map((t) => {
      let c = String(t).replace(/\s+/g, ' ').trim();
      if (c.length > 90) c = c.slice(0, c.lastIndexOf(' ', 88)) + '…';
      c = c.charAt(0).toUpperCase() + c.slice(1);
      return escapar(c).replace(new RegExp(`(${patron})`, 'giu'), '<b>$1</b>');
    });
    const cintas = [[], [], []];
    textos.forEach((c, i) => cintas[i % 3].push(`<p class="comentario">${c}</p>`));
    return cintas.map((c, i) => `<div class="cinta${['', ' reversa', ' lenta'][i]}"${i ? ' aria-hidden="true"' : ''}>${c.join('')}${c.join('')}</div>`).join('\n');
  });
  s = s.replace(/\{\{total:([^}]+)\}\}/g, (_, f) => String(JSON.parse(leer(f.trim())).length));
  s = s.replace(/<x-icon name="(\w+)"(?: style="([^"]*)")?><\/x-icon>/g, (_, n, st = '') =>
    `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${st}; flex:none;">${iconos[n] ?? ''}</svg>`);
  // Fondo vivo detrás del contenido (se puede quitar con data-sin-fondo en la sección)
  if (!/data-sin-fondo/.test(s.split('>')[0])) s = s.replace(/(<section[^>]*>)/, '$1\n<canvas class="ambiente" width="1920" height="1080" aria-hidden="true"></canvas>');
  secciones += s + '\n';
}
if (faltan.length) console.warn('Faltan diapositivas:', faltan.join(', '));

const css = leer('base.css') + '\n' + (fs.existsSync(path.join(raiz, 'tema.css')) ? leer('tema.css') : '');
const pagina = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(config.titulo)}</title>
<meta name="description" content="${escapar(config.descripcion ?? '')}">
${config.icono ? `<link rel="icon" href="${escapar(config.icono)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${escapar(config.fuentes ?? 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400..700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap')}">
<style>
${css}
</style>
</head>
<body>
<main id="escenario" aria-live="polite">
${secciones}</main>
<div id="notas" role="note"></div>
<p id="ayuda">← → avanzar · F pantalla completa · N notas</p>
<script>
${leer('motor.js')}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(raiz, 'index.html'), pagina);
console.log(`ok: ${config.orden.length - faltan.length} diapositivas en index.html`);
