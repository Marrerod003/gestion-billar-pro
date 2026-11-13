/* ==========================================================================
   PROBILLAR — main.js
   --------------------------------------------------------------------------
   JavaScript vanilla (sin dependencias).
   Funciones:
     1. Reloj en vivo del dashboard mock
     2. Acordeón de preguntas frecuentes (FAQ)
     3. Animación de aparición al hacer scroll (Intersection Observer)
   ========================================================================== */


/* --------------------------------------------------------------------------
   1. RELOJ EN VIVO (Dashboard del Hero)
   Actualiza la hora cada 30 segundos en el elemento #live-time
   -------------------------------------------------------------------------- */
function updateTime() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const el = document.getElementById('live-time');
  if (el) {
    el.textContent = 'HOY · ' + h + ':' + m;
  }
}

// Ejecutar al cargar y luego cada 30 s
updateTime();
setInterval(updateTime, 30000);


/* --------------------------------------------------------------------------
   2. FAQ — Acordeón
   Al hacer clic en una pregunta:
     - Cierra todas las demás
     - Abre/cierra la actual
   -------------------------------------------------------------------------- */
document.querySelectorAll('.faq-question').forEach(function (btn) {
  btn.addEventListener('click', function () {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    // Cerrar todos los items
    document.querySelectorAll('.faq-item').forEach(function (i) {
      i.classList.remove('open');
      i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    // Si estaba cerrado, abrirlo
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});


/* --------------------------------------------------------------------------
   3. REVEAL AL SCROLL
   Usa Intersection Observer para que las tarjetas aparezcan
   suavemente cuando entran en el viewport.
   -------------------------------------------------------------------------- */
const observer = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  },
  { threshold: 0.08 }
);

document
  .querySelectorAll('.module-card, .benefit-card, .price-card, .strip-card, .problem-item')
  .forEach(function (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });


/* --------------------------------------------------------------------------
   4. TEMA OSCURO / CLARO
   - Guarda preferencia en localStorage
   - Aplica data-theme="light" o elimina el atributo (oscuro por defecto)
   - Respeta preferencia del sistema la primera vez
   -------------------------------------------------------------------------- */
(function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const STORAGE_KEY = 'probillar-theme';

  // Preferencia guardada o del sistema
  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const initial = saved || (prefersLight ? 'light' : 'dark');

  function applyTheme(theme) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }

  applyTheme(initial);

  if (toggle) {
    toggle.addEventListener('click', function () {
      const isLight = root.getAttribute('data-theme') === 'light';
      applyTheme(isLight ? 'dark' : 'light');
    });
  }
})();
