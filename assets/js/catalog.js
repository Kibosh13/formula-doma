/* Каталог, карточка товара, корзина, избранное. Работает и с сервером (/api/catalog), и в демо (assets/data/catalog.json). */
(function () {
  'use strict';
  var DEMO = !!window.__DEMO__;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rub(n) { return Number(n).toLocaleString('ru-RU') + ' ₽'; }
  function src(u) { return String(u || '').replace(/^\//, ''); } // относительные пути — работают и на сервере, и на GitHub Pages
  function qs(name) { try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; } }

  /* ---------- хранилище: корзина и избранное (в браузере посетителя) ---------- */
  function load(key, def) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch (e) { return def; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} updateBadges(); }
  var Store = {
    cart: function () { return load('fd_cart', []); },
    fav: function () { return load('fd_fav', []); },
    addToCart: function (id, qty) { var c = Store.cart(); var it = c.filter(function (x) { return x.id === id; })[0]; if (it) it.qty = Math.min(99, it.qty + (qty || 1)); else c.push({ id: id, qty: qty || 1 }); save('fd_cart', c); },
    setQty: function (id, qty) { var c = Store.cart().map(function (x) { if (x.id === id) x.qty = Math.max(1, Math.min(99, qty)); return x; }); save('fd_cart', c); },
    remove: function (id) { save('fd_cart', Store.cart().filter(function (x) { return x.id !== id; })); },
    clear: function () { save('fd_cart', []); },
    isFav: function (id) { return Store.fav().indexOf(id) >= 0; },
    toggleFav: function (id) { var f = Store.fav(); var i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); save('fd_fav', f); return i < 0; }
  };
  window.FDStore = Store;

  function updateBadges() {
    var cartN = Store.cart().reduce(function (s, x) { return s + x.qty; }, 0);
    var favN = Store.fav().length;
    $$('[data-badge="cart"]').forEach(function (b) { b.textContent = cartN; b.hidden = !cartN; });
    $$('[data-badge="fav"]').forEach(function (b) { b.textContent = favN; b.hidden = !favN; });
  }
  updateBadges();
  window.addEventListener('storage', updateBadges);

  /* ---------- данные ---------- */
  var dataPromise = null;
  function getData() {
    if (!dataPromise) {
      var url = DEMO ? 'assets/data/catalog.json' : '/api/catalog';
      dataPromise = Promise.all([
        fetch(url, { credentials: 'same-origin', cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : { products: [] }; }).catch(function () { return { products: [] }; }),
        fetch('assets/data/categories.json').then(function (r) { return r.json(); })
      ]).then(function (res) {
        var d = res[0] || {};
        return { categories: d.categories || res[1], products: (d.products || []).filter(function (p) { return p.published !== false; }) };
      });
    }
    return dataPromise;
  }
  function catBySlug(data, slug) { return data.categories.filter(function (c) { return c.slug === slug; })[0]; }
  function priceHtml(p) {
    if (p.price == null) return '<span class="fd-price fd-price--ask">Цена по запросу</span>';
    return '<span class="fd-price">' + (p.price_from ? 'от ' : '') + rub(p.price) + '</span>' + (p.old_price && p.old_price > p.price ? ' <s class="fd-price__old">' + rub(p.old_price) + '</s>' : '');
  }
  var HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z"></path></svg>';
  var PLACEHOLDER = '<div class="fd-noimg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg></div>';

  function cardHtml(p, data) {
    var cat = catBySlug(data, p.category);
    var fav = Store.isFav(p.id);
    return '<article class="fd-card">' +
      '<a class="fd-card__img" href="product.html?id=' + p.id + '">' + (p.images && p.images[0] ? '<img src="' + esc(src(p.images[0])) + '" alt="' + esc(p.title) + '" loading="lazy">' : PLACEHOLDER) + '</a>' +
      '<button type="button" class="fd-fav' + (fav ? ' is-on' : '') + '" data-fav="' + p.id + '" aria-pressed="' + fav + '" aria-label="В избранное">' + HEART + '</button>' +
      '<div class="fd-card__body">' +
        (cat ? '<span class="fd-card__cat">' + esc(cat.name) + '</span>' : '') +
        '<a class="fd-card__title" href="product.html?id=' + p.id + '">' + esc(p.title) + '</a>' +
        '<div class="fd-card__price">' + priceHtml(p) + '</div>' +
        '<button type="button" class="vb-f7k-btn vb-f7k-btn--primary fd-card__buy" data-add="' + p.id + '"><span class="t-btnflex__text">В корзину</span></button>' +
      '</div></article>';
  }
  function emptyHtml(title, text) {
    return '<div class="fd-empty"><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' +
      '<div class="fd-empty__actions"><a class="vb-f7k-btn vb-f7k-btn--primary" href="index.html#vb-f7k-anketa"><span class="t-btnflex__text">Заказать расчёт</span><span class="vb-f7k-btn__arrow" aria-hidden="true">→</span></a>' +
      '<a class="vb-f7k-btn vb-f7k-btn--ghost" href="catalog.html"><span class="t-btnflex__text">Все разделы</span></a></div></div>';
  }

  function toast(msg) {
    var t = $('#fd-toast');
    if (!t) { t = document.createElement('div'); t.id = 'fd-toast'; t.className = 'fd-toast'; t.setAttribute('role', 'status'); (document.getElementById('vb-f7k-root') || document.body).appendChild(t); }
    t.innerHTML = msg; t.classList.add('is-on');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }

  /* делегирование: «в корзину», «в избранное» */
  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) { e.preventDefault(); Store.addToCart(Number(add.getAttribute('data-add')), Number(add.getAttribute('data-qty')) || 1); toast('Товар добавлен в корзину · <a href="cart.html">Перейти</a>'); return; }
    var fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      var on = Store.toggleFav(Number(fav.getAttribute('data-fav')));
      $$('[data-fav="' + fav.getAttribute('data-fav') + '"]').forEach(function (b) { b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); var l = b.querySelector('.fd-fav__label'); if (l) l.textContent = on ? 'В избранном' : 'В избранное'; });
      toast(on ? 'Добавлено в избранное · <a href="favorites.html">Открыть</a>' : 'Убрано из избранного');
      if (document.body.getAttribute('data-page') === 'favorites' && !on) renderFavorites();
    }
  });

  /* ---------- страница каталога ---------- */
  function renderCatalog() {
    var root = $('#fd-catalog'); if (!root) return;
    getData().then(function (data) {
      var slug = qs('c');
      var cat = slug ? catBySlug(data, slug) : null;
      var title = cat ? cat.name : 'Каталог мебели';
      document.title = title + ' — Формула Дома';
      $('#fd-title').textContent = title;
      $('#fd-crumb-current').textContent = title;
      $('#fd-lead').textContent = cat ? cat.lead : 'Выберите раздел — или закажите мебель по вашим размерам, мы сделаем расчёт бесплатно.';
      $('#fd-tabs').innerHTML = '<a href="catalog.html" class="' + (!cat ? 'is-active' : '') + '">Все</a>' + data.categories.map(function (c) {
        var n = data.products.filter(function (p) { return p.category === c.slug; }).length;
        return '<a href="catalog.html?c=' + c.slug + '" class="' + (cat && cat.slug === c.slug ? 'is-active' : '') + '">' + esc(c.name) + (n ? ' <i>' + n + '</i>' : '') + '</a>';
      }).join('');
      var list = cat ? data.products.filter(function (p) { return p.category === cat.slug; }) : data.products;
      var html = '';
      if (!cat) {
        html += '<div class="vb-f7k-cats fd-cats">' + data.categories.map(function (c) {
          return '<a class="vb-f7k-cat" href="catalog.html?c=' + c.slug + '"><div class="vb-f7k-cat__img"><img src="' + esc(c.image) + '" alt="' + esc(c.name) + '" loading="lazy"></div><div class="vb-f7k-cat__row"><span class="vb-f7k-cat__name">' + esc(c.name) + '</span><span class="vb-f7k-cat__arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg></span></div></a>';
        }).join('') + '</div>';
        if (list.length) html += '<h2 class="fd-subtitle">Все товары</h2>';
      }
      if (list.length) html += '<div class="fd-grid">' + list.map(function (p) { return cardHtml(p, data); }).join('') + '</div>';
      else if (cat) html += emptyHtml('Раздел скоро пополнится', 'Мы добавляем готовые модели в каталог. Пока можно заказать «' + cat.name + '» по вашим размерам — рассчитаем стоимость бесплатно.');
      root.innerHTML = html;
    });
  }

  /* ---------- карточка товара ---------- */
  function renderProduct() {
    var root = $('#fd-product'); if (!root) return;
    getData().then(function (data) {
      var id = Number(qs('id'));
      var p = data.products.filter(function (x) { return x.id === id; })[0];
      if (!p) { var cc = $('#fd-crumb-cat'); if (cc) cc.textContent = 'Все разделы'; $('#fd-crumb-current').textContent = 'Товар не найден'; root.innerHTML = emptyHtml('Товар не найден', 'Возможно, он снят с продажи. Посмотрите другие модели в каталоге или закажите мебель по вашим размерам.'); return; }
      var cat = catBySlug(data, p.category);
      document.title = p.title + ' — Формула Дома';
      var crumbCat = $('#fd-crumb-cat'); if (cat && crumbCat) { crumbCat.textContent = cat.name; crumbCat.href = 'catalog.html?c=' + cat.slug; }
      $('#fd-crumb-current').textContent = p.title;
      var imgs = p.images && p.images.length ? p.images : [];
      var specs = String(p.specs || '').split('\n').map(function (l) { var i = l.indexOf(':'); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; }).filter(Boolean);
      var fav = Store.isFav(p.id);
      root.innerHTML =
        '<div class="fd-product">' +
          '<div class="fd-gallery">' +
            '<div class="fd-gallery__main">' + (imgs[0] ? '<img id="fd-main-img" src="' + esc(src(imgs[0])) + '" alt="' + esc(p.title) + '">' : PLACEHOLDER) + '</div>' +
            (imgs.length > 1 ? '<div class="fd-gallery__thumbs">' + imgs.map(function (u, i) { return '<button type="button" class="' + (i ? '' : 'is-active') + '" data-img="' + esc(src(u)) + '" aria-label="Фото ' + (i + 1) + '"><img src="' + esc(src(u)) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '') +
          '</div>' +
          '<div class="fd-info">' +
            (cat ? '<a class="vb-f7k-eyebrow" href="catalog.html?c=' + cat.slug + '">' + esc(cat.name) + '</a>' : '') +
            '<h1 class="fd-info__title">' + esc(p.title) + '</h1>' +
            '<div class="fd-info__price">' + priceHtml(p) + '</div>' +
            '<div class="fd-info__actions">' +
              '<div class="fd-qty" data-qty-box><button type="button" data-qty-dec aria-label="Меньше">−</button><input type="number" min="1" max="99" value="1" aria-label="Количество"><button type="button" data-qty-inc aria-label="Больше">+</button></div>' +
              '<button type="button" class="vb-f7k-btn vb-f7k-btn--primary vb-f7k-btn--lg" data-add="' + p.id + '" id="fd-add-btn"><span class="t-btnflex__text">В корзину</span></button>' +
              '<button type="button" class="vb-f7k-btn vb-f7k-btn--ghost vb-f7k-btn--lg fd-fav-btn' + (fav ? ' is-on' : '') + '" data-fav="' + p.id + '" aria-pressed="' + fav + '">' + HEART + '<span class="fd-fav__label">' + (fav ? 'В избранном' : 'В избранное') + '</span></button>' +
            '</div>' +
            '<a class="fd-info__calc" href="index.html#vb-f7k-anketa">Нужны другие размеры или материалы? Закажите расчёт →</a>' +
            (p.description ? '<div class="fd-info__desc">' + esc(p.description).replace(/\n/g, '<br>') + '</div>' : '') +
            (specs.length ? '<dl class="fd-specs">' + specs.map(function (s) { return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
          '</div>' +
        '</div>';
      var related = data.products.filter(function (x) { return x.category === p.category && x.id !== p.id; }).slice(0, 4);
      if (related.length) root.innerHTML += '<h2 class="fd-subtitle">Ещё в разделе «' + esc(cat ? cat.name : '') + '»</h2><div class="fd-grid">' + related.map(function (x) { return cardHtml(x, data); }).join('') + '</div>';
      // галерея
      $$('.fd-gallery__thumbs button', root).forEach(function (b) {
        b.addEventListener('click', function () { $('#fd-main-img').src = b.getAttribute('data-img'); $$('.fd-gallery__thumbs button', root).forEach(function (x) { x.classList.toggle('is-active', x === b); }); });
      });
      // количество
      var box = $('[data-qty-box]', root), inp = box.querySelector('input'), addBtn = $('#fd-add-btn');
      function setQ(v) { v = Math.max(1, Math.min(99, parseInt(v, 10) || 1)); inp.value = v; addBtn.setAttribute('data-qty', v); }
      box.querySelector('[data-qty-dec]').addEventListener('click', function () { setQ(+inp.value - 1); });
      box.querySelector('[data-qty-inc]').addEventListener('click', function () { setQ(+inp.value + 1); });
      inp.addEventListener('change', function () { setQ(inp.value); });
    });
  }

  /* ---------- избранное ---------- */
  function renderFavorites() {
    var root = $('#fd-favorites'); if (!root) return;
    getData().then(function (data) {
      var ids = Store.fav();
      var list = data.products.filter(function (p) { return ids.indexOf(p.id) >= 0; });
      root.innerHTML = list.length ? '<div class="fd-grid">' + list.map(function (p) { return cardHtml(p, data); }).join('') + '</div>'
        : emptyHtml('В избранном пока пусто', 'Отмечайте понравившиеся модели сердечком — они сохранятся здесь.');
    });
  }

  /* ---------- корзина ---------- */
  function renderCart() {
    var root = $('#fd-cart'); if (!root) return;
    getData().then(function (data) {
      var cart = Store.cart();
      var rows = cart.map(function (it) { var p = data.products.filter(function (x) { return x.id === it.id; })[0]; return p ? { p: p, qty: it.qty } : null; }).filter(Boolean);
      // убираем из корзины товары, которых больше нет
      if (rows.length !== cart.length) save('fd_cart', rows.map(function (r) { return { id: r.p.id, qty: r.qty }; }));
      if (!rows.length) { root.innerHTML = emptyHtml('Корзина пуста', 'Добавьте товары из каталога или закажите мебель по индивидуальному проекту.'); $('#fd-checkout').hidden = true; return; }
      $('#fd-checkout').hidden = false;
      var total = 0, approx = false;
      rows.forEach(function (r) { if (r.p.price == null) approx = true; else { total += r.p.price * r.qty; if (r.p.price_from) approx = true; } });
      root.innerHTML = '<div class="fd-cart">' + rows.map(function (r) {
        var p = r.p;
        return '<div class="fd-cart__row">' +
          '<a class="fd-cart__img" href="product.html?id=' + p.id + '">' + (p.images && p.images[0] ? '<img src="' + esc(src(p.images[0])) + '" alt="">' : PLACEHOLDER) + '</a>' +
          '<div class="fd-cart__info"><a href="product.html?id=' + p.id + '" class="fd-cart__title">' + esc(p.title) + '</a><div>' + priceHtml(p) + '</div></div>' +
          '<div class="fd-qty"><button type="button" data-cq="' + p.id + '" data-d="-1" aria-label="Меньше">−</button><input type="number" value="' + r.qty + '" min="1" max="99" data-ci="' + p.id + '" aria-label="Количество"><button type="button" data-cq="' + p.id + '" data-d="1" aria-label="Больше">+</button></div>' +
          '<button type="button" class="fd-cart__del" data-del="' + p.id + '" aria-label="Удалить">✕</button>' +
        '</div>';
      }).join('') + '</div>' +
      '<div class="fd-cart__total"><span>Итого</span><b>' + (total ? (approx ? 'от ' : '') + rub(total) : 'по запросу') + '</b></div>' +
      (approx ? '<p class="fd-note">Точную стоимость менеджер уточнит после заявки — для части позиций цена зависит от размеров и материалов.</p>' : '');
      $$('[data-cq]', root).forEach(function (b) { b.addEventListener('click', function () { var id = +b.getAttribute('data-cq'); var it = Store.cart().filter(function (x) { return x.id === id; })[0]; Store.setQty(id, (it ? it.qty : 1) + Number(b.getAttribute('data-d'))); renderCart(); }); });
      $$('[data-ci]', root).forEach(function (i) { i.addEventListener('change', function () { Store.setQty(+i.getAttribute('data-ci'), parseInt(i.value, 10) || 1); renderCart(); }); });
      $$('[data-del]', root).forEach(function (b) { b.addEventListener('click', function () { Store.remove(+b.getAttribute('data-del')); renderCart(); }); });
    });
  }

  function initCheckout() {
    var form = $('#fd-order-form'); if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = form.querySelector('.vb-f7k-form__error');
      function fail(m) { err.textContent = m; err.hidden = false; }
      err.hidden = true;
      var name = form.elements.name.value.trim(), phone = form.elements.phone.value.trim();
      if (name.length < 2) return fail('Укажите имя');
      if (phone.replace(/\D/g, '').length !== 11) return fail('Укажите корректный номер телефона');
      if (!form.elements.consent.checked) return fail('Нужно согласие на обработку персональных данных');
      var btn = form.querySelector('[type=submit]'); btn.disabled = true;
      var body = { name: name, phone: phone, comment: form.elements.comment.value.trim(), items: Store.cart(), website: form.elements.website.value, page: location.href };
      try { body.utm = JSON.parse(sessionStorage.getItem('fd_utm') || '{}'); body.referrer = sessionStorage.getItem('fd_ref') || ''; } catch (x) {}
      var req = DEMO ? new Promise(function (r) { setTimeout(function () { r({ ok: true }); }, 400); })
        : fetch('/api/order', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Ошибка'); return j; }); });
      req.then(function () {
        try { if (window.ym && window.__METRIKA_ID__) window.ym(window.__METRIKA_ID__, 'reachGoal', 'order'); } catch (x) {}
        Store.clear();
        $('#fd-cart').innerHTML = '';
        $('#fd-checkout').innerHTML = '<div class="fd-empty fd-empty--ok"><h3>Заказ отправлен</h3><p>Спасибо! Менеджер свяжется с вами в ближайшее рабочее время, чтобы подтвердить детали и стоимость.</p><div class="fd-empty__actions"><a class="vb-f7k-btn vb-f7k-btn--ghost" href="catalog.html"><span class="t-btnflex__text">Вернуться в каталог</span></a></div></div>';
      }).catch(function (x) { fail(x.message || 'Не удалось отправить. Позвоните нам: 8 909 077 73 40'); btn.disabled = false; });
    });
    // автозаполнение для авторизованных
    if (!DEMO) fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (r) {
      if (r.user) { if (!form.elements.name.value) form.elements.name.value = r.user.name || ''; if (!form.elements.phone.value && /^\+7/.test(r.user.phone || '')) form.elements.phone.value = r.user.phone; }
    }).catch(function () {});
  }

  renderCatalog(); renderProduct(); renderFavorites(); renderCart(); initCheckout();
})();
