/* Motor de las presentaciones de Soham: navegación, transiciones que guían, pasos, cifras y fondo vivo. */
(() => {
  const escenario = document.getElementById('escenario');
  const diapositivas = [...escenario.querySelectorAll(':scope > section')];
  const notas = document.getElementById('notas');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  diapositivas.forEach((d, i) => d.querySelectorAll('.pag').forEach((p) => { p.textContent = i + 1; }));
  let actual = -1;
  let escala = 1;

  function ajustar() {
    escala = Math.min(innerWidth / 1920, innerHeight / 1080);
    escenario.style.transform = 'scale(' + escala + ') translate(-50%, -50%)';
  }
  const pasos = (d) => [...d.querySelectorAll('.fragment')];
  const CLASES = ['activa', 'sale-adelante', 'sale-atras', 'llega-adelante', 'llega-atras', 'mismo-grupo'];

  // Cifras que cuentan desde 0
  function contar(d) {
    d.querySelectorAll('[data-contar]').forEach((el) => {
      const meta = Number(el.dataset.contar);
      if (quieto) { el.textContent = meta; return; }
      const inicio = performance.now() + 450;
      el.textContent = '0';
      const paso = (t) => {
        const p = Math.min(1, Math.max(0, (t - inicio) / 1300));
        el.textContent = Math.round(meta * (1 - Math.pow(1 - p, 3)));
        if (p < 1 && d.classList.contains('activa')) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });
  }

  // Una imagen grande sale de su miniatura (.mini.actual → .etapa-img): crece, gira y se asienta
  function desdeMiniatura(d) {
    const grande = d.querySelector('.etapa-img');
    const mini = d.querySelector('.mini.actual');
    if (!grande || !mini || quieto) return;
    requestAnimationFrame(() => {
      const a = mini.getBoundingClientRect();
      const b = grande.getBoundingClientRect();
      const dx = (a.left + a.width / 2 - (b.left + b.width / 2)) / escala;
      const dy = (a.top + a.height / 2 - (b.top + b.height / 2)) / escala;
      const s = a.width / b.width;
      grande.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(-28deg)`, opacity: 0.4 },
        { transform: 'translate(0, 0) scale(1.05) rotate(4deg)', opacity: 1, offset: 0.72 },
        { transform: 'none', opacity: 1 },
      ], { duration: 1150, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'both', delay: 150 });
      mini.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 600, easing: 'ease-out' });
    });
  }

  function mostrar(i, todosLosPasos, direccion) {
    i = Math.max(0, Math.min(diapositivas.length - 1, i));
    if (i === actual) return;
    const vieja = diapositivas[actual];
    const nueva = diapositivas[i];
    const mismoGrupo = vieja && nueva.dataset.grupo && vieja.dataset.grupo === nueva.dataset.grupo;
    diapositivas.forEach((d) => { if (d !== vieja) d.classList.remove(...CLASES); });
    if (vieja) {
      vieja.classList.remove(...CLASES);
      if (!mismoGrupo && !quieto) {
        vieja.classList.add(direccion < 0 ? 'sale-atras' : 'sale-adelante');
        vieja.addEventListener('animationend', function fin(e) {
          if (e.target !== vieja) return;
          vieja.classList.remove('sale-atras', 'sale-adelante');
          vieja.removeEventListener('animationend', fin);
        });
      }
      vieja.querySelectorAll('video').forEach((v) => v.pause());
    }
    nueva.classList.add('activa');
    if (vieja && !quieto) nueva.classList.add(mismoGrupo ? 'mismo-grupo' : direccion < 0 ? 'llega-atras' : 'llega-adelante');
    nueva.querySelectorAll('video').forEach((v) => { v.currentTime = 0; v.play().catch(() => {}); });
    pasos(nueva).forEach((f) => f.classList.toggle('visible', Boolean(todosLosPasos)));
    if (nueva.dataset.pasos) ponerPaso(nueva, todosLosPasos ? Number(nueva.dataset.pasos) : 0);
    actual = i;
    contar(nueva);
    desdeMiniatura(nueva);
    const nota = nueva.querySelector('aside');
    notas.textContent = nota ? nota.textContent : '';
    history.replaceState(null, '', '#' + (i + 1));
    if (quieto) requestAnimationFrame(dibujar);
  }
  // Diapositivas con pasos propios (data-pasos): cada clic suma un paso y la sección recibe p1…pN
  function ponerPaso(d, k) {
    d.dataset.paso = k;
    for (let j = 1; j <= Number(d.dataset.pasos); j++) d.classList.toggle('p' + j, j <= k);
  }
  function siguiente() {
    const d = diapositivas[actual];
    if (d.dataset.pasos && Number(d.dataset.paso) < Number(d.dataset.pasos)) { ponerPaso(d, Number(d.dataset.paso) + 1); return; }
    const pendiente = pasos(diapositivas[actual]).find((f) => !f.classList.contains('visible'));
    if (pendiente) pendiente.classList.add('visible');
    else if (actual < diapositivas.length - 1) mostrar(actual + 1, false, 1);
  }
  function anterior() {
    const d = diapositivas[actual];
    if (d.dataset.pasos && Number(d.dataset.paso) > 0) { ponerPaso(d, Number(d.dataset.paso) - 1); return; }
    const vistos = pasos(diapositivas[actual]).filter((f) => f.classList.contains('visible'));
    if (vistos.length) vistos[vistos.length - 1].classList.remove('visible');
    else if (actual > 0) mostrar(actual - 1, true, -1);
  }

  // Fondo vivo: retícula isométrica que se desliza y pulsos de luz que la recorren
  const C30 = Math.cos(Math.PI / 6), S30 = Math.sin(Math.PI / 6);
  const pulsos = Array.from({ length: 9 }, () => nuevoPulso(true));
  function nuevoPulso(inicial) {
    const sube = Math.random() < 0.5;
    return { x: inicial ? Math.random() * 1920 : -150, y: Math.random() * 1080 + (sube ? 300 : -300), vx: C30, vy: sube ? -S30 : S30, v: 0.6 + Math.random() * 0.9, largo: 90 + Math.random() * 120 };
  }
  let desplazamiento = 0;
  function dibujar() {
    const d = diapositivas[actual];
    const lienzo = d && d.querySelector('.ambiente');
    if (lienzo) {
      const g = lienzo.getContext('2d');
      const oscuro = true;
      const base = getComputedStyle(d).getPropertyValue('--pulso').trim() || '106,165,255';
      g.clearRect(0, 0, 1920, 1080);
      g.lineWidth = 1;
      g.strokeStyle = `rgba(${base},${oscuro ? 0.06 : 0.055})`;
      const paso = 110;
      const off = desplazamiento % paso;
      g.beginPath();
      for (let k = -2200; k < 3200; k += paso) {
        const b = k + off;
        g.moveTo(b, 0); g.lineTo(b + 1080 * C30 / S30, 1080);
        g.moveTo(b, 1080); g.lineTo(b + 1080 * C30 / S30, 0);
      }
      g.stroke();
      for (const p of pulsos) {
        const grad = g.createLinearGradient(p.x - p.vx * p.largo, p.y - p.vy * p.largo, p.x, p.y);
        grad.addColorStop(0, `rgba(${base},0)`);
        grad.addColorStop(1, `rgba(${base},${oscuro ? 0.35 : 0.28})`);
        g.strokeStyle = grad;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(p.x - p.vx * p.largo, p.y - p.vy * p.largo);
        g.lineTo(p.x, p.y);
        g.stroke();
        g.fillStyle = `rgba(${base},${oscuro ? 0.5 : 0.35})`;
        g.beginPath(); g.arc(p.x, p.y, 2.5, 0, Math.PI * 2); g.fill();
        if (!quieto) { p.x += p.vx * p.v; p.y += p.vy * p.v; }
        if (p.x > 2100 || p.y < -200 || p.y > 1280) Object.assign(p, nuevoPulso(false));
      }
      if (!quieto) desplazamiento += 0.12;
    }
    if (!quieto) requestAnimationFrame(dibujar);
  }

  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); siguiente(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); anterior(); }
    else if (e.key === 'Home') mostrar(0, false, -1);
    else if (e.key === 'End') mostrar(diapositivas.length - 1, true, 1);
    else if (e.key === 'f' || e.key === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if (e.key === 'n' || e.key === 'N') notas.classList.toggle('abierta');
  });
  addEventListener('click', (e) => { if (!notas.contains(e.target)) (e.clientX < innerWidth / 4 ? anterior : siguiente)(); });
  let x0 = null;
  addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) (dx < 0 ? siguiente : anterior)(); x0 = null; });
  let reposo;
  addEventListener('mousemove', () => { document.body.classList.add('raton'); clearTimeout(reposo); reposo = setTimeout(() => document.body.classList.remove('raton'), 1800); });
  addEventListener('resize', ajustar);
  ajustar();
  mostrar((parseInt(location.hash.slice(1), 10) || 1) - 1, false, 1);
  requestAnimationFrame(dibujar);
})();
