(function () {
  'use strict';
  var root = document.getElementById('vb-f7k-root');
  if (!root) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- analytics helper (Яндекс.Метрика / VK / GA — если подключены) ---------- */
  function track(goal, params) {
    try {
      var id = window.__METRIKA_ID__;
      if (id && typeof window.ym === 'function') window.ym(id, 'reachGoal', goal, params || {});
      if (window._tmr && window.__VK_PIXEL_ID__) window._tmr.push({ type: 'reachGoal', id: window.__VK_PIXEL_ID__, goal: goal });
      if (typeof window.gtag === 'function') window.gtag('event', goal, params || {});
    } catch (e) {}
  }

  /* ---------- UTM / source: запоминаем, чтобы передать в заявку ---------- */
  var utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'];
  try {
    var qs = new URLSearchParams(location.search), found = {};
    utmKeys.forEach(function (k) { if (qs.get(k)) found[k] = qs.get(k).slice(0, 200); });
    if (Object.keys(found).length) sessionStorage.setItem('fd_utm', JSON.stringify(found));
    if (!sessionStorage.getItem('fd_ref') && document.referrer) sessionStorage.setItem('fd_ref', document.referrer.slice(0, 300));
  } catch (e) {}
  function getUtm() { try { return JSON.parse(sessionStorage.getItem('fd_utm') || '{}'); } catch (e) { return {}; } }
  function getRef() { try { return sessionStorage.getItem('fd_ref') || ''; } catch (e) { return ''; } }

  /* ---------- smooth anchor scroll ---------- */
  root.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link || link.hasAttribute('data-auth-open')) return;
    var hash = link.getAttribute('href');
    if (!hash || hash === '#' || hash === '#auth') { if (hash === '#') event.preventDefault(); return; }
    var target = document.querySelector(hash);
    if (!target) return;
    event.preventDefault();
    closeNav();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- hero slider ---------- */
  var slides = $$('#vb-f7k-slides .vb-f7k-hero__slide');
  var dots = $$('#vb-f7k-dots .vb-f7k-hero__dot');
  if (slides.length) {
    var idx = 0, timer;
    var setSlide = function (n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === idx); });
    };
    var restart = function () { if (reduceMotion) return; clearInterval(timer); timer = setInterval(function () { setSlide(idx + 1); }, 5500); };
    dots.forEach(function (d) { d.addEventListener('click', function () { setSlide(parseInt(d.getAttribute('data-slide'), 10) || 0); restart(); }); });
    var prev = $('#vb-f7k-prev'), next = $('#vb-f7k-next');
    if (prev) prev.addEventListener('click', function () { setSlide(idx - 1); restart(); });
    if (next) next.addEventListener('click', function () { setSlide(idx + 1); restart(); });
    restart();
  }

  /* ---------- scroll reveal ---------- */
  var revealItems = $$('[data-reveal]', root);
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vb-f7k-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealItems.forEach(function (el) {
      var siblings = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.hasAttribute && c.hasAttribute('data-reveal'); });
      el.style.transitionDelay = Math.min(siblings.indexOf(el), 5) * 80 + 'ms';
      io.observe(el);
    });
  } else {
    revealItems.forEach(function (el) { el.classList.add('vb-f7k-in'); });
  }

  /* ---------- mobile burger ---------- */
  var burger = $('#vb-f7k-burger');
  var nav = $('.vb-f7k-nav', root);
  var header = $('#vb-f7k-header');
  function setHeaderBottom() { if (header) root.style.setProperty('--vb-f7k-hdr-bottom', Math.round(header.getBoundingClientRect().bottom) + 'px'); }
  function openNav() {
    if (!nav) return; setHeaderBottom();
    nav.classList.add('vb-f7k-nav--open'); document.body.classList.add('vb-f7k-menu-open');
    if (burger) { burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Закрыть меню'); }
  }
  function closeNav() {
    if (!nav || !nav.classList.contains('vb-f7k-nav--open')) return;
    nav.classList.remove('vb-f7k-nav--open'); document.body.classList.remove('vb-f7k-menu-open');
    if (burger) { burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Открыть меню'); }
  }
  if (burger && nav) {
    burger.addEventListener('click', function (e) { e.stopPropagation(); nav.classList.contains('vb-f7k-nav--open') ? closeNav() : openNav(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
    document.addEventListener('click', function (e) { if (nav.classList.contains('vb-f7k-nav--open') && !nav.contains(e.target) && !burger.contains(e.target)) closeNav(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1100) closeNav(); else setHeaderBottom(); });
    window.addEventListener('scroll', setHeaderBottom, { passive: true });
  }

  /* ---------- phone mask +7 (999) 999-99-99 ---------- */
  function formatPhone(value) {
    var s = String(value).trim(), d;
    if (s.indexOf('+7') === 0) d = s.slice(2).replace(/\D/g, '');
    else { d = s.replace(/\D/g, ''); if (d.length >= 11 && (d[0] === '8' || d[0] === '7')) d = d.slice(1); }
    if (d.length > 10 && (d[0] === '8' || d[0] === '7')) d = d.slice(1);
    d = '7' + d.slice(0, 10);
    if (d.length === 1 && !s.replace(/\D/g, '').length) return '';
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length > 4) out += ') ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }
  $$('input[type="tel"]', root).forEach(function (inp) {
    inp.addEventListener('input', function () { inp.value = formatPhone(inp.value); });
    inp.addEventListener('focus', function () { if (!inp.value) inp.value = '+7 ('; });
    inp.addEventListener('blur', function () { if (inp.value.replace(/\D/g, '').length <= 1) inp.value = ''; });
  });
  function phoneOk(v) { return String(v).replace(/\D/g, '').length === 11; }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()); }

  /* ---------- validation helpers ---------- */
  function setErr(input, msg) {
    var box = input.closest('.vb-f7k-inputbox');
    if (!box) return;
    box.classList.toggle('is-error', !!msg);
    var e = box.querySelector('.t-input-error');
    if (e) e.textContent = msg || '';
  }
  function setFormErr(form, msg) {
    var e = form.querySelector('.vb-f7k-form__error');
    if (!e) return;
    e.textContent = msg || '';
    e.hidden = !msg;
  }
  function validate(form, rules) {
    var ok = true, first = null;
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      var msg = rules[name](input.type === 'checkbox' ? input.checked : input.value.trim());
      setErr(input, msg);
      if (msg) { ok = false; if (!first) first = input; }
    });
    if (first) first.focus();
    return ok;
  }
  function req(min) { return function (v) { if (!v) return 'Обязательное поле'; if (min && v.length < min) return 'Слишком коротко'; return ''; }; }

  /* ---------- демо-режим (статичная копия без сервера, напр. GitHub Pages) ---------- */
  var DEMO = !!window.__DEMO__;
  var demoUser = null, demoLeads = [];
  try { demoUser = JSON.parse(sessionStorage.getItem('fd_demo_user') || 'null'); demoLeads = JSON.parse(sessionStorage.getItem('fd_demo_leads') || '[]'); } catch (e) {}
  function demoSave() { try { sessionStorage.setItem('fd_demo_user', JSON.stringify(demoUser)); sessionStorage.setItem('fd_demo_leads', JSON.stringify(demoLeads)); } catch (e) {} }
  function demoApi(url, data) {
    return new Promise(function (resolve) { setTimeout(resolve, 350); }).then(function () {
      if (url === '/api/auth/me') return { user: demoUser };
      if (url === '/api/me/leads') return { leads: demoLeads };
      if (url === '/api/auth/register') { demoUser = { id: 1, name: data.name, email: data.email, phone: data.phone }; demoSave(); return { ok: true, user: demoUser }; }
      if (url === '/api/auth/login') { demoUser = demoUser || { id: 1, name: 'Гость', email: data.login.indexOf('@') > 0 ? data.login : '—', phone: data.login.indexOf('@') > 0 ? '—' : data.login }; demoSave(); return { ok: true, user: demoUser }; }
      if (url === '/api/auth/logout') { demoUser = null; demoSave(); return { ok: true }; }
      if (url === '/api/lead') { if (demoUser) { demoLeads.unshift({ category: data.category, comment: data.comment, created_at: new Date().toISOString().slice(0, 19).replace('T', ' ') }); demoSave(); } return { ok: true }; }
      return {};
    });
  }

  function api(url, data) {
    if (DEMO) return demoApi(url, data);
    return fetch(url, {
      method: data ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: data ? { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' } : {},
      body: data ? JSON.stringify(data) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var err = new Error(j.error || 'Ошибка сервера'); err.fields = j.fields; throw err; } return j; });
    });
  }
  function busy(form, on) { var b = form.querySelector('[type="submit"]'); if (b) b.disabled = on; }

  /* ---------- анкета → /api/lead → Telegram ---------- */
  var currentUser = null;
  var form = $('#vb-f7k-form');
  if (form) {
    var started = Date.now();
    $$('input,select,textarea', form).forEach(function (el) { el.addEventListener('input', function () { setErr(el, ''); }); el.addEventListener('change', function () { setErr(el, ''); }); });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      setFormErr(form, '');
      var ok = validate(form, {
        name: req(2),
        phone: function (v) { return !v ? 'Обязательное поле' : (phoneOk(v) ? '' : 'Укажите корректный номер телефона'); },
        category: function (v) { return v ? '' : 'Выберите категорию'; }
      });
      if (!ok) return;
      busy(form, true);
      api('/api/lead', {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        category: form.elements.category.value,
        comment: form.elements.comment.value.trim(),
        website: form.elements.website ? form.elements.website.value : '',
        elapsed: Date.now() - started,
        page: location.href,
        referrer: getRef(),
        utm: getUtm()
      }).then(function () {
        track('lead_form', { category: form.elements.category.value });
        var successBox = form.querySelector('.js-successbox');
        Array.prototype.forEach.call(form.children, function (node) { if (node !== successBox && node.style) node.style.display = 'none'; });
        if (successBox) { successBox.style.display = 'block'; successBox.focus(); }
      }).catch(function (err) {
        if (err.fields) Object.keys(err.fields).forEach(function (n) { if (form.elements[n]) setErr(form.elements[n], err.fields[n]); });
        setFormErr(form, err.message || 'Не удалось отправить. Позвоните нам: 8 909 077 73 40');
      }).then(function () { busy(form, false); });
    });
  }

  /* ---------- авторизация / регистрация ---------- */
  var modal = $('#vb-f7k-auth');
  var authLabel = $('#vb-f7k-auth-label');
  function openModal() { if (!modal) return; closeNav(); renderAccount(); modal.classList.add('is-open'); document.body.classList.add('vb-f7k-lock'); var f = modal.querySelector('input:not([type=hidden]):not([type=checkbox])'); if (f && !currentUser) setTimeout(function () { f.focus(); }, 30); }
  function closeModal() { if (!modal) return; modal.classList.remove('is-open'); document.body.classList.remove('vb-f7k-lock'); }
  $$('[data-auth-open]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); openModal(); }); });
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) return closeModal();
      var c = e.target.closest('[data-auth-close]');
      if (c) { closeModal(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    $$('[data-auth-tab]', modal).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-auth-tab');
        $$('[data-auth-tab]', modal).forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        $$('[data-auth-form]', modal).forEach(function (f) { f.hidden = f.getAttribute('data-auth-form') !== tab; });
      });
    });
  }
  if (location.hash === '#auth') setTimeout(openModal, 50);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function setUser(u) {
    currentUser = u || null;
    if (authLabel) authLabel.textContent = currentUser ? 'Кабинет' : 'Авторизация';
    // автозаполнение анкеты для авторизованных
    if (currentUser && form) {
      if (!form.elements.name.value) form.elements.name.value = currentUser.name || '';
      if (!form.elements.phone.value) form.elements.phone.value = currentUser.phone || '';
    }
    renderAccount();
  }
  function renderAccount() {
    if (!modal) return;
    $('#vb-f7k-auth-guest', modal).hidden = !!currentUser;
    $('#vb-f7k-auth-user', modal).hidden = !currentUser;
    if (!currentUser) return;
    $('[data-acc="name"]', modal).textContent = currentUser.name;
    $('[data-acc="phone"]', modal).textContent = currentUser.phone;
    $('[data-acc="email"]', modal).textContent = currentUser.email;
    var box = $('[data-acc="leads"]', modal);
    box.innerHTML = '<span style="color:var(--vb-f7k-orchid)">Загрузка заявок…</span>';
    api('/api/me/leads').then(function (r) {
      if (!r.leads || !r.leads.length) { box.innerHTML = '<span style="color:var(--vb-f7k-orchid)">Заявок пока нет</span>'; return; }
      box.innerHTML = '<span style="color:var(--vb-f7k-orchid)">Мои заявки</span>' + r.leads.map(function (l) {
        return '<div class="vb-f7k-acc__lead"><b>' + esc(l.category) + '</b> · ' + esc(new Date(l.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('ru-RU')) + (l.comment ? '<br>' + esc(l.comment) : '') + '</div>';
      }).join('');
    }).catch(function () { box.innerHTML = ''; });
  }

  var loginForm = $('#vb-f7k-login'), regForm = $('#vb-f7k-register');
  [loginForm, regForm].forEach(function (f) { if (f) $$('input', f).forEach(function (el) { el.addEventListener('input', function () { setErr(el, ''); setFormErr(f, ''); }); }); });

  if (loginForm) loginForm.addEventListener('submit', function (e) {
    e.preventDefault(); setFormErr(loginForm, '');
    if (!validate(loginForm, { login: req(3), password: req(1) })) return;
    busy(loginForm, true);
    api('/api/auth/login', { login: loginForm.elements.login.value.trim(), password: loginForm.elements.password.value })
      .then(function (r) { loginForm.reset(); setUser(r.user); track('login'); })
      .catch(function (err) { setFormErr(loginForm, err.message); })
      .then(function () { busy(loginForm, false); });
  });

  if (regForm) regForm.addEventListener('submit', function (e) {
    e.preventDefault(); setFormErr(regForm, '');
    var ok = validate(regForm, {
      name: req(2),
      phone: function (v) { return !v ? 'Обязательное поле' : (phoneOk(v) ? '' : 'Укажите корректный номер'); },
      email: function (v) { return !v ? 'Обязательное поле' : (emailOk(v) ? '' : 'Некорректный e-mail'); },
      password: function (v) { return v.length < 8 ? 'Минимум 8 символов' : ''; }
    });
    if (!regForm.elements.consent.checked) { setFormErr(regForm, 'Нужно согласие на обработку персональных данных'); ok = false; }
    if (!ok) return;
    busy(regForm, true);
    api('/api/auth/register', {
      name: regForm.elements.name.value.trim(), phone: regForm.elements.phone.value.trim(),
      email: regForm.elements.email.value.trim(), password: regForm.elements.password.value,
      consent: true, utm: getUtm()
    }).then(function (r) { regForm.reset(); setUser(r.user); track('sign_up'); })
      .catch(function (err) {
        if (err.fields) Object.keys(err.fields).forEach(function (n) { if (regForm.elements[n]) setErr(regForm.elements[n], err.fields[n]); });
        setFormErr(regForm, err.message);
      })
      .then(function () { busy(regForm, false); });
  });

  var logout = $('#vb-f7k-logout');
  if (logout) logout.addEventListener('click', function () { api('/api/auth/logout', {}).then(function () { setUser(null); }).catch(function () { setUser(null); }); });

  api('/api/auth/me').then(function (r) { setUser(r.user); }).catch(function () {});
})();
