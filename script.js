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

  // ---------- Кнопки Telegram: сообщение уже вписано ----------
  var TG = 'https://t.me/dvdkna';
  function tgLink(text) { return TG + '?text=' + encodeURIComponent(text); }
  Array.prototype.forEach.call(document.querySelectorAll('a[data-msg]'), function (a) {
    a.href = tgLink(a.getAttribute('data-msg'));
  });

  // ---------- Карточки кружек из products.json ----------
  // Леся добавляет кружки в файл products.json — сайт сам строит карточку
  // по образцу первой и вписывает в кнопку «Хочу …» название и цену.
  var tpl = document.querySelector('[data-p="card"]');
  var THUMB_ON = 'border: 2px solid #3A2A22; transform: translateY(-3px)';
  var THUMB_OFF = 'border: 2px solid #D9CBB8; opacity: .8';
  var THUMB_BASE = 'width: 58px; height: 103px; padding: 3px; box-sizing: border-box; border-radius: 2px; cursor: pointer; background: #F2F4F8; ';
  var THUMB_TAIL = '; box-shadow: 0 4px 12px rgba(58,42,34,.12); transition: transform .2s ease';

  function rub(n) {
    var v = Number(String(n).replace(/[^\d]/g, ''));
    return v ? v.toLocaleString('ru-RU').replace(/\s/g, ' ') : String(n);
  }
  function pick(o, keys) { for (var i = 0; i < keys.length; i++) if (o[keys[i]] != null) return o[keys[i]]; return null; }

  // слова для кнопок в каждом разделе
  var KINDS = {
    'кружки':  { what: 'кружку',  buy: 'Хочу эту кружку',  like: 'Хочу похожую', sold: 'продана' },
    'игрушки': { what: 'игрушку', buy: 'Хочу эту игрушку', like: 'Хочу похожую', sold: 'продана' },
    'обвесы':  { what: 'обвес',   buy: 'Хочу этот обвес',  like: 'Хочу похожий',  sold: 'продан' }
  };
  function shelfOf(item) { var k = pick(item, ['раздел', 'section']); return KINDS[k] ? k : 'кружки'; }

  function setupCard(card, item) {
    var kind = KINDS[shelfOf(item)];
    var name = pick(item, ['название', 'name']) || 'Без названия';
    var price = pick(item, ['цена', 'price']);
    var details = pick(item, ['описание', 'details']) || [];
    var photos = pick(item, ['фото', 'photos']) || [];
    var sold = !!pick(item, ['продана', 'sold']);
    photos = photos.map(function (p) {
      return typeof p === 'string' ? { src: p, alt: name } : { src: pick(p, ['файл', 'src']), alt: pick(p, ['подпись', 'alt']) || name };
    });

    var nameEl = card.querySelector('[data-p="name"]');
    nameEl.textContent = name.replace(/ (с|и|в|на) /g, ' $1 ');

    var det = card.querySelector('[data-p="details"]');
    var dot = det.querySelector('span[aria-hidden]');
    det.textContent = '';
    if (typeof details === 'string') details = details.split(/\s*[,·]\s*/);
    details.forEach(function (d, i) {
      if (i) det.appendChild(dot.cloneNode(true));
      det.appendChild(document.createTextNode(d));
    });

    var priceEl = card.querySelector('[data-p="price"]');
    var cur = priceEl.querySelector('span');
    priceEl.textContent = (sold ? kind.sold : rub(price) + ' ');
    if (!sold) priceEl.appendChild(cur);
    priceEl.style.fontSize = sold ? '24px' : '40px';
    priceEl.style.color = sold ? '#8A7263' : '#3A2A22';

    var buy = card.querySelector('[data-p="buy"]');
    buy.textContent = sold ? kind.like : kind.buy;
    buy.href = tgLink(sold
      ? 'Здравствуйте! Хочу ' + kind.what + ' как «' + name + '».'
      : 'Здравствуйте! Хочу «' + name + '»' + (price ? ' за ' + rub(price).replace(/ /g, ' ') + ' ₽' : '') + '.');

    var main = card.querySelector('[data-p="photo"]');
    var thumbs = card.querySelector('[data-p="thumbs"]');
    if (photos.length) { main.src = photos[0].src; main.alt = photos[0].alt; }
    // фото любой формы видно целиком: рамка подстраивается под первое фото
    main.style.objectFit = 'contain';
    function fit() {
      var r = main.naturalWidth / main.naturalHeight;
      if (r) main.style.aspectRatio = String(Math.min(4 / 3, Math.max(9 / 16, r)));
    }
    if (main.complete && main.naturalWidth) fit(); else main.addEventListener('load', fit, { once: true });
    var proto = thumbs.querySelector('button');
    thumbs.textContent = '';
    if (photos.length < 2) { thumbs.style.display = 'none'; return; }
    thumbs.style.display = '';
    photos.forEach(function (ph, i) {
      var b = proto.cloneNode(true);
      b.setAttribute('aria-label', ph.alt);
      b.querySelector('img').src = ph.src;
      b.setAttribute('aria-pressed', i ? 'false' : 'true');
      b.setAttribute('style', THUMB_BASE + (i ? THUMB_OFF : THUMB_ON) + THUMB_TAIL);
      b.addEventListener('click', function () {
        main.src = ph.src; main.alt = ph.alt;
        Array.prototype.forEach.call(thumbs.children, function (o, j) {
          o.setAttribute('aria-pressed', i === j ? 'true' : 'false');
          o.setAttribute('style', THUMB_BASE + (i === j ? THUMB_ON : THUMB_OFF) + THUMB_TAIL);
        });
      });
      thumbs.appendChild(b);
      if (i) { var pre = new Image(); pre.src = ph.src; }
    });
  }

  if (tpl) {
    // пока список грузится (или если он недоступен) — первая карточка уже рабочая
    setupCard(tpl, {
      'название': tpl.querySelector('[data-p="name"]').textContent.replace(/ /g, ' '),
      'цена': tpl.querySelector('[data-p="price"]').textContent,
      'описание': Array.prototype.filter.call(tpl.querySelector('[data-p="details"]').childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }),
      'фото': Array.prototype.map.call(tpl.querySelectorAll('[data-p="thumbs"] button'), function (b) { return { 'файл': b.querySelector('img').getAttribute('src'), 'подпись': b.getAttribute('aria-label') }; })
    });
    var blank = tpl.cloneNode(true);
    Array.prototype.forEach.call(blank.querySelectorAll('.sticker'), function (st) { st.remove(); });
    fetch('products.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (list) {
        if (!Array.isArray(list)) return;
        // кружки — по образцу первой карточки, игрушки и обвесы — в свои разделы ниже
        var mugs = list.filter(function (it) { return shelfOf(it) === 'кружки'; });
        if (list.length && !mugs.length) tpl.style.display = 'none';
        var after = tpl;
        mugs.forEach(function (item, i) {
          var card = i ? blank.cloneNode(true) : tpl;
          if (i) {
            card.style.marginTop = '40px';
            after.parentNode.insertBefore(card, after.nextSibling);
            after = card;
          }
          setupCard(card, item);
        });
        Array.prototype.forEach.call(document.querySelectorAll('[data-shelf]'), function (sec) {
          var box = sec.querySelector('[data-p="list"]');
          list.filter(function (it) { return shelfOf(it) === sec.getAttribute('data-shelf'); }).forEach(function (item) {
            var card = blank.cloneNode(true);
            box.appendChild(card);
            setupCard(card, item);
          });
          if (box.children.length) box.nextElementSibling.style.marginTop = '48px';
        });
      })
      .catch(function () { /* оставляем карточку как есть */ });
  }
})();
