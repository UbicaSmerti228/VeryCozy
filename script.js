// Вэри Cozy — поведение страницы: облака при прокрутке, отклик мобиля,
// мягкая прокрутка по меню, появление блока «Лепит Леся», переключение фото.
(function () {
  'use strict';

  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hero = document.getElementById('top');
  var foot = document.querySelector('footer');
  var about = document.getElementById('about');
  var sc = document.scrollingElement || document.documentElement;

  // Облака шапки расходятся при прокрутке, облака подвала сходятся, когда он появляется
  function layoutClouds() {
    var vh = window.innerHeight || 800;
    if (hero) {
      var r = hero.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, -r.top / (r.height * 0.75)));
      hero.style.setProperty('--part', p.toFixed(3));
    }
    if (foot) {
      var f = foot.getBoundingClientRect();
      var g = Math.min(1, Math.max(0, (vh - f.top) / (f.height * 0.9)));
      foot.style.setProperty('--gather', g.toFixed(3));
    }
  }

  // Лёгкий толчок подвескам мобиля при прокрутке: пружина с затуханием
  var a = 0, v = 0, springRaf = 0;
  function push(dy) {
    if (!dy || !hero) return;
    v += Math.max(-40, Math.min(40, dy)) * 0.018;
    if (springRaf) return;
    function step() {
      v += -a * 0.03;
      v *= 0.92;
      a = Math.max(-9, Math.min(9, a + v));
      hero.style.setProperty('--kick', a.toFixed(2) + 'deg');
      if (Math.abs(a) < 0.02 && Math.abs(v) < 0.02) {
        a = 0; v = 0; springRaf = 0;
        hero.style.setProperty('--kick', '0deg');
        return;
      }
      springRaf = requestAnimationFrame(step);
    }
    springRaf = requestAnimationFrame(step);
  }

  var lastY = sc.scrollTop, cloudRaf = 0;
  function onScroll() {
    var y = sc.scrollTop;
    var dy = y - lastY;
    lastY = y;
    if (!cloudRaf) cloudRaf = requestAnimationFrame(function () { cloudRaf = 0; layoutClouds(); });
    if (!reduced) push(dy);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  layoutClouds();

  // Мягкая прокрутка к разделу: плавный разгон и торможение, остановить можно касанием
  var scrollRaf = 0;
  function travel(target) {
    var margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    var start = sc.scrollTop;
    var end = Math.max(0, start + target.getBoundingClientRect().top - margin);
    if (reduced) { sc.scrollTop = end; return; }
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    var dist = end - start;
    var dur = Math.min(1100, 420 + Math.abs(dist) * 0.22);
    var t0 = performance.now();
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function off() { window.removeEventListener('wheel', stop); window.removeEventListener('touchstart', stop); }
    function stop() { if (scrollRaf) cancelAnimationFrame(scrollRaf); scrollRaf = 0; off(); }
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    function step(now) {
      var t = Math.min(1, (now - t0) / dur);
      sc.scrollTop = start + dist * ease(t);
      if (t < 1) scrollRaf = requestAnimationFrame(step); else { scrollRaf = 0; off(); }
    }
    scrollRaf = requestAnimationFrame(step);
  }
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;
    var id = link.getAttribute('href').slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    travel(target);
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  // Блок про Лесю «рисуется», когда попадает на экран
  if (about) {
    if ('IntersectionObserver' in window && !reduced) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { about.classList.add('in'); io.disconnect(); }
      }, { threshold: 0.15 });
      io.observe(about);
    } else {
      about.classList.add('in');
    }
  }

  // Переключение фото кружки
  var photos = [
    { src: 'assets/mug-piercing-side.webp', alt: 'Кружка с пирсингом, вид сбоку' },
    { src: 'assets/mug-piercing-top.webp', alt: 'Кружка с пирсингом, вид сверху: светлая глазурь в крапинку внутри' }
  ];
  var card = document.querySelector('#catalog article');
  if (card) {
    var main = null;
    Array.prototype.forEach.call(card.querySelectorAll('img'), function (im) {
      if (!main && !im.closest('button') && im.getAttribute('src') === photos[0].src) main = im;
    });
    var thumbs = card.querySelectorAll('button[aria-label]');
    var on = 'border: 2px solid #3A2A22; transform: translateY(-3px)';
    var offStyle = 'border: 2px solid #D9CBB8; opacity: .8';
    var base = 'width: 58px; height: 103px; padding: 3px; box-sizing: border-box; border-radius: 2px; cursor: pointer; background: #F2F4F8; ';
    var tail = '; box-shadow: 0 4px 12px rgba(58,42,34,.12); transition: transform .2s ease';
    // заранее подгрузить второе фото, чтобы переключение было мгновенным
    var pre = new Image(); pre.src = photos[1].src;
    Array.prototype.forEach.call(thumbs, function (btn, i) {
      btn.addEventListener('click', function () {
        if (main) { main.src = photos[i].src; main.alt = photos[i].alt; }
        Array.prototype.forEach.call(thumbs, function (b, j) {
          b.setAttribute('aria-pressed', i === j ? 'true' : 'false');
          b.setAttribute('style', base + (i === j ? on : offStyle) + tail);
        });
      });
    });
  }
})();
