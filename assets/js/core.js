/* ═══════════════════════════════════════════════════════════════════════════
   core.js — shared by every page

   LANGUAGE POLICY
   Code and comments, including the comments inside generated code: English.
   User interface: Italian and English, switchable from the navbar. Console
   diagnostics: Italian only, for now. Repository documents: English, with an
   Italian FILE.it.md twin.

   WHAT LIVES HERE
     1. Constants      language, sandbox endpoints, documentation URLs, pages
     2. Utilities      escaping, masking, storage, clipboard, download
     3. Logger         one readable console line per event, details collapsed
     4. Theme, i18n    light/dark toggle, English dictionary applied to markup
     5. Shell          navbar with menus, breadcrumbs, footer, doc links
     6. HTTP           fetch with timeout and a classified outcome
     7. Session        "Dati pagamento": create the transaction or paste values
     8. Links          payment link resolution, sandbox host allow-list
     9. Widgets        status line, code card, payment/detail card,
                       return-from-redirect banner, link card

   SANDBOX ONLY, BY CONSTRUCTION
   Endpoints are frozen constants and there is no environment selector: a tool
   that can point at production eventually does so by accident. Pasted payment
   links are checked against the same host allow-list before they are used.

   NO EXTERNAL DATA IN innerHTML
   innerHTML is used only for markup written in this source or in the English
   dictionary. Anything typed by the user or returned by an API reaches the DOM
   through textContent, or through esc() inside a generated string.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   1. CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */
const BUILD = '2026-11-12.r2';
const REPO_URL = 'https://github.com/M2NDLAB/fabrick-sandbox-bench';

/* The language is fixed for the lifetime of the page: theme-init.js set it on
   <html> before anything rendered, and switching it reloads the document.
   That is what lets every string be chosen once, at the call site, with tr(). */
const LANG = document.documentElement.lang === 'en' ? 'en' : 'it';
const tr = (it, en) => (LANG === 'en' ? en : it);

const SANDBOX = Object.freeze({
  api: 'https://sandbox.gestpay.net/api/v1',
  lightboxSdk: 'https://sandbox.gestpay.net/pagam/javascript/axerve.js',
  elementsSdk: 'https://sandbox-web.axerve.com/orchestra/checkout/assets/elements/fbk-elements.js',
  checkout: 'https://sandbox-web.axerve.com/orchestra/checkout',
  /* Hosts a payment link may point to. Production hosts are absent on purpose. */
  hosts: Object.freeze(['sandbox-web.axerve.com', 'sandbox.gestpay.net']),
});

/* Every documentation URL in one place. The paths are the slugs of the
   documentation repository; when a slug changes, this is the only edit.
   Slugs are the same in both locales; heading anchors are not, so an anchor is
   appended only for the Italian pages it was taken from. */
const DOCS_BASE = 'https://docs.fabrick.com' + (LANG === 'en' ? '/en' : '');
const ECOM = DOCS_BASE + '/paymentHubAndOrchestra/ecommerce';
const API_REF = 'https://api.paymentorchestra.fabrick.com/';
const itAnchor = (hash) => (LANG === 'it' ? '#' + hash : '');

const DOCS = Object.freeze({
  home: DOCS_BASE + '/',
  gettingStarted: ECOM + '/introduction/getting_started/',
  responseAddress: ECOM + '/introduction/getting_started/' + itAnchor('response-address'),
  checkout: ECOM + '/integrationMethods/hosted-payment-page-orchestra/',
  paybylink: ECOM + '/integrationMethods/pay-by-link/',
  webcomponents: ECOM + '/integrationMethods/web-component/',
  lightbox: ECOM + '/integrationMethods/lightbox/',
  apionly: ECOM + '/integrationMethods/api-only/',
  apm: ECOM + '/alternativePayments/overview/',
  applePay: ECOM + '/alternativePayments/applepay/' + itAnchor('configurazione-aggiuntiva-per-web-component-e-lightbox'),
  googlePay: ECOM + '/alternativePayments/googlepay/' + itAnchor('configurazione-aggiuntiva-per-web-component-e-webview'),
  klarna: ECOM + '/alternativePayments/klarna/',
  paypal: ECOM + '/alternativePayments/paypal/',
  satispay: ECOM + '/alternativePayments/satispay/',
  testCards: ECOM + '/testing/sandbox_cards/',
  apiReference: API_REF,
  apiErrors: API_REF + '#errors',
  paymentTypes: API_REF + '#payment-type-codes',
  status: 'https://status.fabrick.com/',
  support: 'https://landing.fabrick.com/it/fabrick-dashboard-support',
  repo: REPO_URL,
});

const svg = (body, cls) => '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';

const ICONS = Object.freeze({
  external: svg('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>'),
  home: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 19v-5h4v5c0 .55.45 1 1 1h3c.55 0 1-.45 1-1v-7h1.7c.46 0 .68-.57.33-.87L12.67 3.6c-.38-.34-.96-.34-1.34 0l-8.36 7.53c-.34.3-.13.87.33.87H5v7c0 .55.45 1 1 1h3c.55 0 1-.45 1-1z"/></svg>',
  moon: svg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', 'icon-moon'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>', 'icon-sun'),
  chevron: svg('<path d="m6 9 6 6 6-6"/>'),
  code: svg('<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>'),
  pulse: svg('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
  support: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="m5.7 5.7 3.8 3.8M14.5 14.5l3.8 3.8M18.3 5.7l-3.8 3.8M9.5 14.5l-3.8 3.8"/>'),
  translate: svg('<path d="M4 5h8M8 3v2M5.5 5c.4 3 2.4 5.6 5.5 7M10.5 5C10 8.2 7.6 11 4 12.5"/><path d="m12 21 4.5-10L21 21M13.6 17.5h5.8"/>'),
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  cube: svg('<path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>'),
  github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>',
  /* Flags drawn inline: two tiny SVGs are lighter than an icon font and work
     where emoji flags do not (Windows renders them as two letters). */
  flagIt: '<svg class="flag" viewBox="0 0 3 2" aria-hidden="true"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ce2b37"/></svg>',
  flagUs: '<svg class="flag" viewBox="0 0 39 26" aria-hidden="true"><rect width="39" height="26" fill="#b22234"/><path d="M0 3h39M0 7h39M0 11h39M0 15h39M0 19h39M0 23h39" stroke="#fff" stroke-width="2"/><rect width="16" height="14" fill="#3c3b6e"/><g fill="#fff"><circle cx="3" cy="3" r=".9"/><circle cx="8" cy="3" r=".9"/><circle cx="13" cy="3" r=".9"/><circle cx="5.5" cy="7" r=".9"/><circle cx="10.5" cy="7" r=".9"/><circle cx="3" cy="11" r=".9"/><circle cx="8" cy="11" r=".9"/><circle cx="13" cy="11" r=".9"/></g></svg>',
});

const line = (body) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';

/* The six entry points, in the order of the home page and of the navbar menu.
   `needs` states what the page consumes and labels the home card. */
const PAGES = Object.freeze([
  { id: 'checkout', file: 'checkout.html', title: 'Checkout Page', doc: 'checkout', needs: 'link',
    blurb: tr('La pagina di pagamento ospitata da Fabrick (HPPO): crei la richiesta, ottieni il link, il buyer sceglie il metodo e paga.',
              'The payment page hosted by Fabrick (HPPO): create the request, get the link, the buyer picks a method and pays.'),
    icon: line('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 14h5M7 17h3"/>') },
  { id: 'paybylink', file: 'paybylink.html', title: 'Pay By Link', doc: 'paybylink', needs: 'link',
    blurb: tr('La stessa pagina di pagamento, raggiunta da un link, da un QR Code o da una email, con periodo di validità.',
              'The same payment page, reached through a link, a QR code or an email, with a validity period.'),
    icon: line('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>') },
  { id: 'webcomponents', file: 'webcomponents.html', title: 'Web Components', doc: 'webcomponents', needs: 'ids',
    blurb: tr('Il pagamento dentro la tua pagina, come elementi HTML nativi: fbk-checkout, fbk-card, fbk-apple-pay, fbk-google-pay.',
              'The payment inside your page, as native HTML elements: fbk-checkout, fbk-card, fbk-apple-pay, fbk-google-pay.'),
    icon: line('<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>') },
  { id: 'lightbox', file: 'lightbox.html', title: 'Lightbox', doc: 'lightbox', needs: 'ids',
    blurb: tr('La pagina di pagamento Fabrick in un pop-up sovrapposto al tuo checkout, con redirect automatico o callback.',
              'The Fabrick payment page in a pop-up over your checkout, with automatic redirect or a callback.'),
    icon: line('<rect x="2.5" y="4" width="19" height="16" rx="2"/><rect x="7" y="8" width="10" height="8" rx="1.2"/>') },
  { id: 'apionly', file: 'apionly.html', title: 'API Only', doc: 'apionly', needs: 'ids',
    blurb: tr('Nessuna pagina Fabrick: un form carta tuo che invia i dati con payment/submit e gestisce l’autenticazione.',
              'No Fabrick page: a card form of your own that posts the data with payment/submit and handles authentication.'),
    icon: line('<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>') },
  { id: 'buttons', file: 'buttons.html', title: tr('Pulsanti APM', 'APM Buttons'), doc: 'apm', needs: 'link',
    blurb: tr('Klarna, PayPal, Satispay e Amazon Pay: il pulsante del brand costruito sul link di pagamento della tua richiesta.',
              'Klarna, PayPal, Satispay and Amazon Pay: the brand button built on the payment link of your request.'),
    icon: line('<rect x="3" y="7" width="18" height="10" rx="5"/><path d="M9 12h6"/>') },
]);


/* ═══════════════════════════════════════════════════════════════════════════
   2. UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* A JS string literal safe to embed in generated code. JSON.stringify handles
   quotes and backslashes; "<" becomes < because the generated file may be
   merged into a <script> block, where "</script>" inside a string would close
   the tag. */
const jsLiteral = (v) => JSON.stringify(String(v)).replace(/</g, '\\u003c');

/* Tokens are read credentials: they never appear in full in logs, because logs
   and screenshots end up in tickets. */
const maskToken = (t) => (t ? String(t).slice(0, 8) + '…(' + String(t).length + ' char)' : '');

/* Storage access is wrapped: private browsing or a disabled storage makes
   every call throw, and a test bench must keep working without persistence. */
function makeStore(getArea) {
  return {
    get(key) { try { return getArea().getItem(key) || ''; } catch (e) { return ''; } },
    set(key, value) {
      try {
        if (value) getArea().setItem(key, value); else getArea().removeItem(key);
        return true;
      } catch (e) { return false; }   /* includes QuotaExceededError */
    },
    getJson(key) { try { return JSON.parse(this.get(key) || '{}') || {}; } catch (e) { return {}; } },
    setJson(key, value) { return this.set(key, JSON.stringify(value)); },
  };
}
const local = makeStore(() => global.localStorage);
const session = makeStore(() => global.sessionStorage);

/* Copies text and gives feedback on the button itself. Without the Clipboard
   API (file://, old browsers) the fallback asks for a manual copy instead of
   failing silently. */
async function copyText(text, btn, selectFallback) {
  const original = btn ? btn.textContent : '';
  let done = false;
  try { await navigator.clipboard.writeText(text); done = true; } catch (e) { done = false; }
  if (!done && typeof selectFallback === 'function') selectFallback();
  if (btn) {
    btn.textContent = done ? tr('Copiato', 'Copied') : tr('Premi Ctrl/Cmd+C', 'Press Ctrl/Cmd+C');
    setTimeout(() => { btn.textContent = original; }, 1500);
  }
  return done;
}

function downloadText(fileName, mime, text) {
  const url = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Deferred: on some browsers an immediate revoke cancels the download. */
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  if (tag === 'button') n.type = 'button';
  return n;
};

const clock = () => new Date().toLocaleTimeString(LANG === 'en' ? 'en-GB' : 'it-IT', { hour12: false });


/* ═══════════════════════════════════════════════════════════════════════════
   3. LOGGER
   One readable line per event, details inside collapsed console groups. Each
   line carries a coloured badge, the time and, between startAttempt() and
   endAttempt(), the milliseconds elapsed since the attempt began — the number
   that tells a slow SDK from a slow network.
   Filter in DevTools by typing the prefix in the console filter box.
   ═══════════════════════════════════════════════════════════════════════════ */
function createLogger(prefix) {
  const LEVELS = {
    info: { label: 'INFO', bg: '#112bfc' },
    success: { label: 'OK', bg: '#2f8f12' },
    warn: { label: 'WARN', bg: '#b7791f' },
    error: { label: 'ERR', bg: '#c53030' },
    net: { label: 'NET', bg: '#0d1fb4' },
    dom: { label: 'DOM', bg: '#6b46c1' },
    msg: { label: 'MSG', bg: '#dd6b20' },
  };
  const badge = (bg) => 'background:' + bg + ';color:#fff;font-weight:700;padding:1px 6px;border-radius:3px';
  const MUTED = 'color:#a0aec0;font-weight:400';
  const TITLE = 'color:inherit;font-weight:600';

  let attempt = { id: 0, start: null };
  const stamp = () => new Date().toISOString().slice(11, 23);
  const elapsed = () => (attempt.start === null ? '' : ' +' + Math.round(performance.now() - attempt.start) + 'ms');
  const tag = () => (attempt.id ? ' #' + attempt.id : '');

  function header(level, title) {
    const l = LEVELS[level] || LEVELS.info;
    return ['%c' + prefix + ' ' + l.label + '%c ' + stamp() + tag() + elapsed() + ' %c' + title, badge(l.bg), MUTED, TITLE];
  }
  const isFlat = (o) => Object.values(o).every((v) => v === null || typeof v !== 'object');

  /* Flat objects print as a table, which aligns the values; anything nested
     prints as key → value so the console keeps it expandable. */
  function printDetails(details) {
    if (!details) return;
    if (typeof details === 'function') { details(); return; }
    Object.entries(details).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && isFlat(value)) {
        console.log(key + ':');
        console.table(value);
      } else {
        console.log(key + ':', value);
      }
    });
  }

  function event(level, title, details, opts) {
    const expanded = !!(opts && opts.expanded);
    const hasDetails = details && (typeof details === 'function' || Object.keys(details).length);
    const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    if (!hasDetails) { out.apply(console, header(level, title)); return; }
    (expanded ? console.group : console.groupCollapsed).apply(console, header(level, title));
    try { printDetails(details); } finally { console.groupEnd(); }
  }

  return {
    info: (t, d, o) => event('info', t, d, o),
    success: (t, d, o) => event('success', t, d, o),
    warn: (t, d, o) => event('warn', t, d, o),
    /* Errors open by themselves: nobody should have to hunt for them. */
    error: (t, d, o) => event('error', t, d, Object.assign({ expanded: true }, o)),
    net: (t, d, o) => event('net', t, d, o),
    dom: (t, d, o) => event('dom', t, d, o),
    msg: (t, d, o) => event('msg', t, d, o),
    startAttempt(title, details) {
      attempt = { id: attempt.id + 1, start: performance.now() };
      console.log('%c' + '─'.repeat(60), MUTED);
      event('info', title, details, { expanded: true });
    },
    endAttempt() { attempt.start = null; },
  };
}


/* ═══════════════════════════════════════════════════════════════════════════
   4. THEME, I18N
   ═══════════════════════════════════════════════════════════════════════════ */
const THEME_KEY = 'fbk:bench:theme';
const LANG_KEY = 'fbk:bench:lang';

const Theme = {
  get: () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'),
  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    local.set(THEME_KEY, theme);
    /* Pages that render theme-dependent third-party content listen to this. */
    document.dispatchEvent(new CustomEvent('bench:theme', { detail: { theme } }));
  },
  toggle() { Theme.set(Theme.get() === 'dark' ? 'light' : 'dark'); },
};

/* Switching language reloads the page. Every string was chosen with tr() when
   its module ran; re-rendering all of it in place would need each page to
   rebuild its whole state for no gain. The payment data survives the reload,
   it lives in sessionStorage. */
function setLang(lang) {
  if (lang === LANG) return;
  local.set(LANG_KEY, lang);
  global.location.reload();
}

/* Static markup is Italian. For English, every element carrying data-t gets
   its content from the dictionary in i18n.en.js (constant markup, same trust
   level as the HTML files). Direct <input> and <svg> children are kept: a chip
   is "<input> text", a button can be "<svg> text", and the dictionary holds
   only the text. Runs first in boot(), before any page script wires events. */
function applyI18n() {
  const root = document.documentElement;
  if (LANG === 'en') {
    const dict = global.BENCH_EN || {};
    document.querySelectorAll('[data-t]').forEach((node) => {
      const value = dict[node.dataset.t];
      if (value === undefined) return;   /* untranslated: the Italian stays */
      const kept = Array.from(node.children).filter((c) => /^(input|svg)$/i.test(c.tagName));
      /* Leading = nothing but whitespace before it: it goes back in front. */
      const isLead = (c) => { for (let n = c.previousSibling; n; n = n.previousSibling) { if (n.nodeType === 1 || n.textContent.trim()) return false; } return true; };
      const lead = kept.filter(isLead);
      node.innerHTML = value;
      kept.forEach((c) => (lead.indexOf(c) >= 0 ? node.prepend(c) : node.append(c)));
    });
    document.querySelectorAll('[data-t-attr]').forEach((node) => {
      /* data-t-attr="placeholder:key,aria-label:key" */
      node.dataset.tAttr.split(',').forEach((pair) => {
        const [attr, key] = pair.split(':');
        if (dict[key] !== undefined) node.setAttribute(attr.trim(), dict[key]);
      });
    });
  }
  root.classList.add('t-ready');
}


/* ═══════════════════════════════════════════════════════════════════════════
   5. SHELL
   Navbar, breadcrumbs and footer are rendered here so seven documents share
   one definition. All markup below is constant text from this file.

   The navbar follows the documentation's: logo, then the product name as a
   menu of sections, then on the right a text link and a row of icons —
   API reference, status page, support — followed by language and theme.
   ═══════════════════════════════════════════════════════════════════════════ */

/* The Fabrick logo is not redistributed: it is fetched from the documentation
   site, the same file its navbar uses. If the request fails (offline, blocked,
   path changed) a text wordmark takes its place, so the bar never shows a
   broken image. */
const LOGO = Object.freeze({
  light: 'https://docs.fabrick.com/img/fabrick/logo/logo.svg',
  dark: 'https://docs.fabrick.com/img/fabrick/logo/logo-dark.svg',
});

function mountLogo(slot) {
  const img = el('img', 'navbar__logo');
  img.alt = 'Fabrick';
  img.addEventListener('error', () => { slot.replaceChildren(el('span', 'navbar__wordmark', 'fabrick')); });
  img.src = LOGO[Theme.get()];
  slot.replaceChildren(img);
  document.addEventListener('bench:theme', (ev) => { if (img.isConnected) img.src = LOGO[ev.detail.theme]; });
}

/* rel="noopener noreferrer": the opened page gets no window.opener and no
   Referer, which could otherwise carry test parameters from the query string. */
const EXT = ' target="_blank" rel="noopener noreferrer"';

/* A menu opens on hover and on keyboard focus through CSS alone. Touch has no
   hover: there a tap on the trigger toggles .is-open instead. */
function wireMenu(root) {
  const trigger = root.querySelector('[data-menu-trigger]');
  if (!trigger) return;
  trigger.addEventListener('click', (ev) => {
    if (global.matchMedia('(hover: hover)').matches) return;   /* mouse: the link or button acts normally */
    ev.preventDefault();
    const open = root.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (ev) => { if (!root.contains(ev.target)) root.classList.remove('is-open'); });
}

function renderNavbar(pageId) {
  const host = $('navbar');
  if (!host) return;

  const pages = PAGES.map((p) =>
    '<a class="menu__item" role="menuitem" href="' + p.file + '"' + (p.id === pageId ? ' aria-current="page"' : '') + '>' +
      '<span class="menu__icon">' + p.icon + '</span>' + p.title + '</a>'
  ).join('');

  const iconLink = (href, icon, label) =>
    '<a class="icon-btn" href="' + href + '"' + EXT + ' aria-label="' + label + '" title="' + label + '">' + icon + '</a>';

  const langItem = (code, flag, name) =>
    '<button type="button" class="menu__item" role="menuitemradio" data-lang="' + code + '" aria-checked="' + (LANG === code) + '" title="' + name + '">' +
      flag + '<span>' + code.toUpperCase() + '</span></button>';

  host.className = 'navbar';
  host.innerHTML =
    '<a class="navbar__brand" href="index.html" aria-label="Fabrick Sandbox Bench, home"><span id="navLogo"></span></a>' +
    '<span class="navbar__sep" aria-hidden="true"></span>' +
    '<div class="menu" id="navPages">' +
      '<a class="navbar__product" href="index.html" data-menu-trigger aria-haspopup="true">Sandbox Bench' + ICONS.chevron + '</a>' +
      '<div class="menu__panel" role="menu" aria-label="' + tr('Integrazioni', 'Integrations') + '">' + pages + '</div>' +
    '</div>' +
    '<div class="navbar__end">' +
      '<span class="env-badge" title="' + tr('Gli endpoint sono costanti e puntano solo alla sandbox', 'Endpoints are constants and point at the sandbox only') + '">Sandbox</span>' +
      '<a class="navbar__link" href="' + DOCS.home + '"' + EXT + '>' + tr('Documentazione', 'Documentation') + '</a>' +
      iconLink(DOCS.apiReference, ICONS.code, 'API reference') +
      iconLink(DOCS.status, ICONS.pulse, tr('Stato dei servizi', 'Service status')) +
      iconLink(DOCS.support, ICONS.support, tr('Supporto', 'Support')) +
      '<div class="menu menu--end" id="navLang">' +
        '<button type="button" class="icon-btn" data-menu-trigger aria-haspopup="true" aria-label="' + tr('Lingua', 'Language') + '">' + ICONS.translate + '</button>' +
        '<div class="menu__panel menu__panel--compact" role="menu" aria-label="' + tr('Lingua', 'Language') + '">' +
          langItem('it', ICONS.flagIt, 'Italiano') + langItem('en', ICONS.flagUs, 'English') +
        '</div>' +
      '</div>' +
      '<button type="button" class="icon-btn" id="themeToggle" aria-label="' + tr('Cambia tema chiaro o scuro', 'Switch between light and dark theme') + '">' + ICONS.moon + ICONS.sun + '</button>' +
    '</div>';

  mountLogo($('navLogo'));
  wireMenu($('navPages'));
  wireMenu($('navLang'));
  $('themeToggle').addEventListener('click', Theme.toggle);
  host.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
}

function renderBreadcrumbs(page) {
  const host = $('crumbs');
  if (!host || !page) return;
  host.innerHTML =
    '<ol class="breadcrumbs">' +
      '<li><a href="index.html" aria-label="Home">' + ICONS.home + '</a></li>' +
      '<li><a href="index.html#integrazioni">' + tr('Integrazioni', 'Integrations') + '</a></li>' +
      '<li><span aria-current="page">' + page.title + '</span></li>' +
    '</ol>';
}

/* One centred line: the credit, the build, the repository. Reference links
   live in the navbar; repeating them here would be noise. */
function renderFooter() {
  const host = $('footer');
  if (!host) return;
  host.className = 'footer';
  host.innerHTML =
    '<p class="footer__credits">' +
      tr('Progettato da <strong>M2NDLAB</strong>, scritto da <strong>Claude</strong>', 'Designed by <strong>M2NDLAB</strong>, written by <strong>Claude</strong>') +
      '<span class="footer__build" title="Build">' + BUILD + '</span></p>' +
    '<a class="footer__repo" href="' + REPO_URL + '"' + EXT + ' aria-label="' + tr('Repository su GitHub', 'Repository on GitHub') + '" title="GitHub">' + ICONS.github + '</a>';
}

/* Anchors written in the HTML as <a data-doc="lightbox">…</a> receive their
   href here: page markup never hard-codes a documentation URL. */
function wireDocLinks(root) {
  (root || document).querySelectorAll('a[data-doc]').forEach((a) => {
    const href = DOCS[a.dataset.doc];
    if (!href) return;
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (a.hasAttribute('data-icon') && !a.querySelector('svg')) a.insertAdjacentHTML('beforeend', ICONS.external);
  });
}

/* Admonitions written directly in the HTML carry a bare title; the icon is
   added here so they match the ones built by admonition(). */
function decorateAdmonitions() {
  document.querySelectorAll('.admonition__title').forEach((t) => {
    if (!t.querySelector('svg')) t.insertAdjacentHTML('afterbegin', ICONS.info);
  });
}

function boot(pageId) {
  const page = PAGES.find((p) => p.id === pageId) || null;
  applyI18n();
  if (page) document.title = page.title + ' — Fabrick Sandbox Bench';
  renderNavbar(pageId);
  renderBreadcrumbs(page);
  renderFooter();
  wireDocLinks();
  decorateAdmonitions();
  return page;
}


/* ═══════════════════════════════════════════════════════════════════════════
   6. HTTP
   fetch() has no default timeout and reports every network-level failure as
   the same TypeError. This wrapper adds the timeout and sorts the outcome into
   a `kind` the pages can explain:
     network  no response at all (offline, CORS, blocked by an extension)
     http     a response with a non-2xx status
     parse    a 2xx response whose body is not JSON
     api      valid JSON where Fabrick reports error.code other than "0"
     ok       valid JSON, error.code "0"
   Fabrick answers HTTP 200 for many application errors, hence the last split.
   ═══════════════════════════════════════════════════════════════════════════ */
async function callApi(path, opts) {
  const o = opts || {};
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs || 20000);
  const t0 = performance.now();
  const base = { url: SANDBOX.api + path, status: 0, body: null, text: '' };
  const done = (extra) => Object.assign(base, { ms: Math.round(performance.now() - t0) }, extra);

  try {
    const res = await fetch(base.url, {
      method: o.method || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, o.headers),
      body: o.body ? JSON.stringify(o.body) : undefined,
      signal: ctrl.signal,
    });
    base.status = res.status;
    base.text = await res.text();
    try { base.body = JSON.parse(base.text); } catch (e) { base.body = null; }

    const apiError = base.body && base.body.error;
    const code = apiError && apiError.code != null ? String(apiError.code) : '';
    const apiText = code && code !== '0' ? tr('Errore ', 'Error ') + code + ': ' + (apiError.description || '') : '';

    /* An HTTP error whose body is a Fabrick error object is reported with the
       Fabrick code: "HTTP 401" alone says less than "error 1142: …". */
    if (!res.ok) return done({ kind: 'http', error: 'HTTP ' + res.status + (apiText ? ' — ' + apiText : '') });
    if (base.body === null) return done({ kind: 'parse', error: tr('La risposta non è JSON.', 'The response is not JSON.') });
    if (apiText) return done({ kind: 'api', error: apiText });
    return done({ kind: 'ok' });
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    const secs = Math.round((o.timeoutMs || 20000) / 1000);
    return done({
      kind: 'network',
      error: aborted
        ? tr('Nessuna risposta entro ' + secs + ' secondi.', 'No response within ' + secs + ' seconds.')
        : tr('La richiesta non ha ricevuto risposta. Cause tipiche: rete assente, blocco CORS, estensione del browser che filtra le richieste.',
             'The request got no response. Usual causes: no network, a CORS block, a browser extension filtering requests.'),
    });
  } finally {
    clearTimeout(timer);
  }
}

/* Status line. Transient messages ("opening…") disappear on their own; results
   stay until the next message replaces them, because an outcome that vanishes
   after five seconds has to be read from the console instead. */
function statusLine(node) {
  let timer = null;
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.hidden = true;
  return function show(message, type, opts) {
    clearTimeout(timer);
    if (!message) { node.hidden = true; return; }
    node.textContent = message;
    node.className = 'status status--' + (type || 'info');
    node.hidden = false;
    if (opts && opts.transient) timer = setTimeout(() => { node.hidden = true; }, 5000);
  };
}

/* Renders a JSON value in a wrapped code block. */
function jsonBlock(title, value) {
  const block = el('div', 'codeblock codeblock--wrap codeblock--tall');
  if (title) block.append(el('div', 'codeblock__title', title));
  const scroller = el('div', 'scroll-x');
  const pre = el('pre');
  pre.append(el('code', null, typeof value === 'string' ? value : JSON.stringify(value, null, 2)));
  scroller.append(pre);
  block.append(scroller);
  return block;
}

function kvList(pairs) {
  const dl = el('dl', 'kv');
  pairs.forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    dl.append(el('dt', null, k), el('dd', null, String(v)));
  });
  return dl;
}

/* Builds an admonition from constant strings. `html` is markup written in the
   source; never pass user or API data here. */
function admonition(tone, title, html) {
  const box = el('div', 'admonition' + (tone ? ' admonition--' + tone : ''));
  const head = el('div', 'admonition__title');
  head.innerHTML = ICONS.info;
  head.append(title);
  const body = el('div');
  body.innerHTML = html;
  box.append(head, body);
  wireDocLinks(box);
  return box;
}


/* ═══════════════════════════════════════════════════════════════════════════
   7. SESSION — the "Dati pagamento" block
   Every integration starts from the same three values. This block offers the
   two ways of getting them, as tabs:

     create   write the body of payment/create (pre-filled per integration,
              freely editable), send it to the sandbox for real, and use the
              response: paymentID, paymentToken, userRedirect.href, qrCode
     manual   paste values obtained elsewhere (Postman, a back-end log)

   WHY THE API KEY IS IN A BROWSER HERE
   payment/create is a server-side call and the documentation says so. A test
   bench is the one place where sending it from the page is the point: it is
   what turns "edit the body, see what Fabrick answers" into one click. The key
   is therefore accepted, under three constraints: it is kept in sessionStorage
   only (gone with the tab), it is sent to the frozen sandbox endpoint only,
   and it never appears in logs, generated code or the response panel.

   STORAGE (all sessionStorage)
     fbk:bench:cred          shopLogin, apiKey         shared by every page
     fbk:bench:manual        pasted values             shared by every page
     fbk:bench:page:<id>     mode, body, last result   one per page

   A created transaction is deliberately NOT shared between pages: a request
   built for the hosted page (with paymentChannel) is the wrong one for the
   Lightbox (which needs none), and reusing it silently would produce errors
   that look like bugs of the integration.

   values().types tells the pages what the request declared in paymentType:
     array       the methods listed
     null        the field is absent: every enabled method
     undefined   unknown (pasted values, or a body that does not parse)
   ═══════════════════════════════════════════════════════════════════════════ */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PBL_RE = /\/pbl\/a\/([^/]+)\/b\/([^/]+)\/c\/([^/?#]+)/;

const Session = (() => {
  const CRED_KEY = 'fbk:bench:cred';
  const MANUAL_KEY = 'fbk:bench:manual';

  /* Pasted-value fields, grouped the way pages ask for them. */
  const MANUAL_FIELDS = {
    paymentID: { label: 'Payment ID', placeholder: '1881129911957',
      hint: tr('payload.paymentID dalla risposta di payment/create', 'payload.paymentID from the payment/create response') },
    paymentToken: { label: 'Payment Token', placeholder: 'f0419188-8a78-4918-913c-a491e4e78084',
      hint: tr('payload.paymentToken dalla risposta di payment/create', 'payload.paymentToken from the payment/create response') },
    link: { label: tr('Link di pagamento', 'Payment link'), placeholder: 'https://sandbox-web.axerve.com/orchestra/checkout/…',
      hint: tr('payload.userRedirect.href dalla risposta di payment/create', 'payload.userRedirect.href from the payment/create response') },
    qrCode: { label: 'qrCode (Base64)', placeholder: 'iVBORw0KGgoAAAANSUhEUgAA…', area: true,
      hint: tr('payload.qrCode dalla risposta: la stringa pura o un data URI', 'payload.qrCode from the response: the bare string or a data URI') },
  };
  const GROUPS = { ids: ['paymentID', 'paymentToken'], link: ['link'], qr: ['qrCode'] };

  let cfg = null;
  let pageKey = '';
  let page = { mode: 'create', body: '', result: null };
  const ui = { manual: {} };

  const emit = () => document.dispatchEvent(new CustomEvent('bench:session'));
  const savePage = () => session.setJson(pageKey, page);
  const saveCred = () => session.setJson(CRED_KEY, { shopLogin: ui.shop.value.trim(), apiKey: ui.apiKey ? ui.apiKey.value.trim() : (session.getJson(CRED_KEY).apiKey || '') });
  const saveManual = () => {
    const stored = session.getJson(MANUAL_KEY);
    Object.keys(ui.manual).forEach((k) => { stored[k] = ui.manual[k].value.trim(); });
    session.setJson(MANUAL_KEY, stored);
  };

  function field(id, label, control, hint) {
    const wrap = el('div', 'field');
    const lab = el('label', null, label);
    lab.htmlFor = id;
    control.id = id;
    wrap.append(lab, control);
    if (hint) wrap.append(el('small', 'hint', hint));
    return wrap;
  }
  function textInput(placeholder, value) {
    const input = el('input', 'input');
    input.type = 'text';
    input.placeholder = placeholder || '';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = value || '';
    return input;
  }

  function parseBody() {
    if (!ui.body) return null;
    try {
      const o = JSON.parse(ui.body.value);
      return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
    } catch (e) { return null; }
  }
  function setBody(obj) {
    ui.body.value = JSON.stringify(obj, null, 2);
    page.body = ui.body.value;
    markStale();
    savePage();
    emit();
  }
  /* The body is patched as an object, not regenerated: whatever the tester
     added by hand survives a change made through a control. */
  function patchBody(fn) {
    const obj = parseBody();
    if (!obj) return false;
    fn(obj);
    setBody(obj);
    return true;
  }
  const typesOf = (body) => (Array.isArray(body.paymentType) ? body.paymentType.map(String) : null);
  const channelsOf = (body) => (body.paymentChannel && Array.isArray(body.paymentChannel.channelType) ? body.paymentChannel.channelType.map(String) : []);

  /* A result describes the request that produced it. Once the body changes,
     the values on screen belong to the previous request: say so. */
  function markStale() {
    if (ui.stale) ui.stale.hidden = !(page.result && page.result.sentBody !== ui.body.value);
  }

  function renderResult(failed) {
    ui.result.replaceChildren();
    const r = page.result;
    if (r) {
      ui.result.append(kvList([
        ['paymentID', r.paymentID],
        ['paymentToken', r.paymentToken],
        ['userRedirect.href', r.link || tr('(assente nella risposta)', '(not in the response)')],
        ['qrCode', r.qrCode ? tr('presente, ', 'present, ') + r.qrCode.length + tr(' caratteri', ' characters') : ''],
      ]));
      ui.result.append(jsonBlock(tr('Risposta payment/create', 'payment/create response'), r.response));
    } else if (failed && (failed.body || failed.text)) {
      ui.result.append(jsonBlock(tr('Risposta payment/create', 'payment/create response'), failed.body || failed.text.slice(0, 4000)));
    }
    ui.result.hidden = !ui.result.children.length;
    markStale();
  }

  async function send() {
    const show = ui.show;
    let body;
    try { body = JSON.parse(ui.body.value); } catch (e) {
      show(tr('Il body non è JSON valido: ', 'The body is not valid JSON: ') + e.message, 'error');
      return;
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) { show(tr('Il body deve essere un oggetto JSON.', 'The body must be a JSON object.'), 'error'); return; }
    const key = ui.apiKey.value.trim();
    if (!key) { show(tr('Inserisci l’API key della sandbox.', 'Enter the sandbox API key.'), 'error'); ui.apiKey.focus(); return; }
    if (!body.shopLogin) { show(tr('Nel body manca shopLogin.', 'shopLogin is missing from the body.'), 'error'); return; }

    /* The body is what gets sent, so its shopLogin is the true one: the field
       above follows it rather than silently disagreeing. */
    if (String(body.shopLogin) !== ui.shop.value.trim()) { ui.shop.value = String(body.shopLogin); saveCred(); }

    ui.send.disabled = true;
    show(tr('Invio di payment/create in corso…', 'Sending payment/create…'), 'info');
    /* Trailing slash as in the Fabrick REST reference for this endpoint. */
    const res = await callApi('/payment/create/', { method: 'POST', headers: { Authorization: 'apikey ' + key }, body });
    ui.send.disabled = false;

    if (res.kind === 'ok') {
      const p = res.body.payload || {};
      page.result = {
        shopLogin: String(body.shopLogin),
        paymentID: p.paymentID ? String(p.paymentID) : '',
        paymentToken: p.paymentToken ? String(p.paymentToken) : '',
        link: (p.userRedirect && p.userRedirect.href) || '',
        qrCode: p.qrCode || '',
        types: typesOf(body),
        channels: channelsOf(body),
        sentBody: ui.body.value,
        response: res.body,
      };
      show(page.result.paymentID
        ? tr('Richiesta accettata in ' + res.ms + ' ms: transazione ' + page.result.paymentID + ' creata.', 'Request accepted in ' + res.ms + ' ms: transaction ' + page.result.paymentID + ' created.')
        : tr('Risposta senza errori ma senza paymentID: controlla il contenuto qui sotto.', 'The response has no error but no paymentID either: check its content below.'),
        page.result.paymentID ? 'success' : 'warning');
      renderResult();
    } else {
      page.result = null;
      show(tr('Richiesta rifiutata. ', 'Request rejected. ') + res.error, 'error');
      renderResult(res);
    }
    savePage();
    emit();
  }

  function setMode(mode) {
    page.mode = mode;
    if (ui.panels.create) ui.panels.create.hidden = mode !== 'create';
    if (ui.panels.manual) ui.panels.manual.hidden = mode !== 'manual';
    (ui.tabs || []).forEach((t) => t.setAttribute('aria-selected', String(t.dataset.mode === mode)));
    savePage();
    emit();
  }

  /* options:
       page      page id, keys the per-page storage
       modes     ['create'], ['create','manual'] …   first is the default
       manual    field groups for the manual tab: 'ids', 'link', 'qr'
       manualLabel  tab label, when "Ho già i valori" does not describe it
       template  (shopLogin) → the default body for this integration        */
  function mount(host, options) {
    cfg = options;
    pageKey = 'fbk:bench:page:' + cfg.page;
    const cred = session.getJson(CRED_KEY);
    const stored = session.getJson(pageKey);
    page = {
      mode: cfg.modes.indexOf(stored.mode) >= 0 ? stored.mode : cfg.modes[0],
      body: typeof stored.body === 'string' ? stored.body : '',
      result: stored.result && typeof stored.result === 'object' ? stored.result : null,
    };
    ui.panels = {};

    ui.shop = textInput('GESPAY12345', cred.shopLogin);
    host.append(field('shopLogin', 'Shop Login', ui.shop, tr('Codice esercente rilasciato da Fabrick', 'Merchant code issued by Fabrick')));
    ui.shop.addEventListener('input', () => {
      saveCred();
      /* Keeps the body in step; a body that does not parse is left alone.
         patchBody() notifies the page itself when it succeeds. */
      const shop = ui.shop.value.trim();
      if (!(ui.body && shop && patchBody((o) => { o.shopLogin = shop; }))) emit();
    });

    if (cfg.modes.length > 1) {
      const bar = el('div', 'tabs');
      bar.setAttribute('role', 'tablist');
      const labels = {
        create: tr('Crea la richiesta', 'Create the request'),
        manual: cfg.manualLabel || tr('Ho già i valori', 'I already have the values'),
      };
      ui.tabs = cfg.modes.map((m) => {
        const b = el('button', 'tabs__item', labels[m]);
        b.setAttribute('role', 'tab');
        b.dataset.mode = m;
        b.addEventListener('click', () => setMode(m));
        return b;
      });
      bar.append(...ui.tabs);
      host.append(bar);
    }

    if (cfg.modes.indexOf('create') >= 0) {
      const panel = el('div');
      ui.panels.create = panel;

      ui.apiKey = textInput('', cred.apiKey);
      ui.apiKey.type = 'password';
      const keyRow = el('div', 'input-row');
      const eye = el('button', 'btn btn--secondary');
      eye.innerHTML = ICONS.eye;
      eye.setAttribute('aria-label', tr('Mostra o nascondi l’API key', 'Show or hide the API key'));
      eye.addEventListener('click', () => { ui.apiKey.type = ui.apiKey.type === 'password' ? 'text' : 'password'; });
      const keyField = field('apiKey', tr('API key (sandbox)', 'API key (sandbox)'), ui.apiKey,
        tr('Serve per inviare payment/create. Resta in questa scheda del browser e parte solo verso sandbox.gestpay.net. Mai una chiave di produzione.',
           'Needed to send payment/create. It stays in this browser tab and is sent to sandbox.gestpay.net only. Never a production key.'));
      keyRow.append(ui.apiKey, eye);
      keyField.insertBefore(keyRow, keyField.children[1]);
      ui.apiKey.addEventListener('input', saveCred);
      panel.append(keyField);

      /* Where a page puts the controls that compose the body (channels,
         validity, brand). */
      ui.slot = el('div', 'session__slot');
      panel.append(ui.slot);

      ui.body = el('textarea', 'code-editor code-editor--body');
      ui.body.spellcheck = false;
      ui.body.autocomplete = 'off';
      ui.body.value = page.body || JSON.stringify(cfg.template(ui.shop.value.trim() || 'GESPAY12345'), null, 2);
      const bodyField = field('createBody', tr('Body di payment/create', 'payment/create body'), ui.body,
        tr('Precompilato per questa integrazione: puoi aggiungere o togliere campi prima di inviare.', 'Pre-filled for this integration: add or remove fields before sending.'));
      ui.body.addEventListener('input', () => { page.body = ui.body.value; markStale(); savePage(); emit(); });
      panel.append(bodyField);

      const actions = el('div', 'actions');
      ui.send = el('button', 'btn btn--primary', tr('Invia payment/create', 'Send payment/create'));
      ui.send.addEventListener('click', send);
      const reset = el('button', 'btn btn--secondary', tr('Ripristina il body', 'Reset the body'));
      reset.addEventListener('click', () => resetBody());
      actions.append(ui.send, reset);
      panel.append(actions);

      const status = el('div');
      ui.show = statusLine(status);
      ui.stale = el('p', 'small muted session__stale', tr('Il body è cambiato dopo l’invio: i valori qui sotto sono quelli della richiesta precedente. Invia di nuovo per aggiornarli.',
                                                         'The body changed after sending: the values below belong to the previous request. Send again to refresh them.'));
      ui.stale.hidden = true;
      ui.result = el('div', 'stack session__result');
      panel.append(status, ui.stale, ui.result);
      host.append(panel);
      renderResult();
    }

    if (cfg.modes.indexOf('manual') >= 0) {
      const panel = el('div');
      ui.panels.manual = panel;
      const saved = session.getJson(MANUAL_KEY);
      (cfg.manual || ['ids']).forEach((group) => GROUPS[group].forEach((name) => {
        const def = MANUAL_FIELDS[name];
        const control = def.area ? el('textarea', 'textarea') : textInput(def.placeholder, saved[name]);
        if (def.area) { control.placeholder = def.placeholder; control.rows = 4; control.spellcheck = false; control.value = saved[name] || ''; }
        ui.manual[name] = control;
        /* Ids match the names used in generated code and in the tests. */
        panel.append(field(name === 'link' ? 'paymentLink' : name === 'qrCode' ? 'qrInput' : name, def.label, control, def.hint));
      }));
      panel.addEventListener('input', () => { saveManual(); emit(); });
      host.append(panel);
    }

    const foot = el('div', 'session__foot');
    const clearBtn = el('button', 'link-btn', tr('Svuota i dati della transazione', 'Clear the transaction data'));
    clearBtn.addEventListener('click', clear);
    foot.append(clearBtn);
    host.append(foot);

    setMode(page.mode);
  }

  function resetBody() { setBody(cfg.template(ui.shop.value.trim() || 'GESPAY12345')); }

  function values() {
    const shop = ui.shop ? ui.shop.value.trim() : (session.getJson(CRED_KEY).shopLogin || '');
    const out = { shopLogin: shop, paymentID: '', paymentToken: '', link: '', qrCode: '', origin: page.mode === 'create' ? 'created' : 'manual', sent: false, types: undefined, channels: [] };
    if (!cfg) return out;

    if (page.mode === 'create') {
      const r = page.result;
      if (r) return Object.assign(out, { shopLogin: r.shopLogin, paymentID: r.paymentID, paymentToken: r.paymentToken, link: r.link, qrCode: r.qrCode, sent: true, types: r.types, channels: r.channels || [] });
      const draft = parseBody();
      if (draft) Object.assign(out, { types: typesOf(draft), channels: channelsOf(draft) });
      return out;
    }

    Object.keys(ui.manual).forEach((k) => { out[k] = ui.manual[k].value.trim(); });
    /* A Pay By Link URL carries the identifiers in its path: reading them back
       lets "Verifica esito" work from a pasted link alone. */
    const m = out.link && out.link.match(PBL_RE);
    if (m) {
      if (!out.paymentID) out.paymentID = decodeURIComponent(m[2]);
      if (!out.paymentToken) out.paymentToken = decodeURIComponent(m[3]);
      if (!out.shopLogin) out.shopLogin = decodeURIComponent(m[1]);
    }
    return out;
  }

  /* Validation for the pages that need the three identifiers. */
  function validateIds(v) {
    if (v.origin === 'created' && !v.sent) return [tr('invia prima la richiesta payment/create', 'send the payment/create request first')];
    const errors = [];
    if (!v.shopLogin) errors.push(tr('Shop Login è obbligatorio', 'Shop Login is required'));
    if (!v.paymentID) errors.push(tr('Payment ID è obbligatorio', 'Payment ID is required'));
    if (!v.paymentToken) errors.push(tr('Payment Token è obbligatorio', 'Payment Token is required'));
    else if (!UUID_RE.test(v.paymentToken)) errors.push(tr('Payment Token non sembra un UUID valido', 'Payment Token does not look like a valid UUID'));
    return errors;
  }

  /* Loads values that arrived from outside (return banner): they are pasted
     values by nature, so the manual tab is where they go. */
  function fill(found) {
    if (!cfg) return;
    if (found.shopLogin) { ui.shop.value = found.shopLogin; saveCred(); }
    if (ui.panels.manual) {
      Object.keys(ui.manual).forEach((k) => { if (found[k]) ui.manual[k].value = found[k]; });
      saveManual();
      setMode('manual');
    } else {
      emit();
    }
  }

  /* Shop Login, API key and body are kept: they are setup, not transaction. */
  function clear() {
    Object.values(ui.manual).forEach((n) => { n.value = ''; });
    saveManual();
    page.result = null;
    if (ui.result) renderResult();
    if (ui.show) ui.show('');
    savePage();
    emit();
  }

  return {
    mount, values, validateIds, fill, clear,
    getBody: parseBody, setBody, patchBody, resetBody,
    get slot() { return ui.slot || null; },
    get mode() { return page.mode; },
  };
})();


/* ═══════════════════════════════════════════════════════════════════════════
   8. LINKS
   ═══════════════════════════════════════════════════════════════════════════ */

/* A URL is accepted only if it is https and points at a sandbox host. This is
   the sandbox-only rule applied to data: without it the bench would happily
   open a production payment page. */
function checkSandboxUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { return { ok: false, error: tr('Il link non è un URL valido.', 'The link is not a valid URL.') }; }
  if (u.protocol !== 'https:') return { ok: false, error: tr('Il link deve usare https.', 'The link must use https.') };
  if (SANDBOX.hosts.indexOf(u.hostname) < 0) {
    return { ok: false, error: tr('Solo sandbox: l’host «' + u.hostname + '» non è ammesso. Host accettati: ', 'Sandbox only: host “' + u.hostname + '” is not allowed. Accepted hosts: ') + SANDBOX.hosts.join(', ') + '.' };
  }
  return { ok: true, url: u.href };
}

/* Order of preference, and what `source` reports:
     response  userRedirect.href returned by a request sent from this page
     pasted    a link typed in the manual tab
     built     rebuilt from the identifiers, on the shape of the documentation
               examples: …/checkout/pbl/a/{shopLogin}/b/{paymentID}/c/{token}
   The rebuilt shape is inferred from examples, not from a specification, and
   it does not cover the direct-redirect links of a single paymentType, whose
   path is an opaque hash. */
function resolveLink(v) {
  if (v.link) {
    const chk = checkSandboxUrl(v.link);
    return chk.ok ? { ok: true, url: chk.url, source: v.origin === 'created' ? 'response' : 'pasted' } : chk;
  }
  if (v.shopLogin && v.paymentID && v.paymentToken) {
    const enc = encodeURIComponent;
    return { ok: true, source: 'built', url: SANDBOX.checkout + '/pbl/a/' + enc(v.shopLogin) + '/b/' + enc(v.paymentID) + '/c/' + enc(v.paymentToken) };
  }
  return {
    ok: false,
    error: v.origin === 'created'
      ? tr('Invia la richiesta payment/create per ottenere il link.', 'Send the payment/create request to get the link.')
      : tr('Inserisci il link di pagamento.', 'Enter the payment link.'),
  };
}


/* ═══════════════════════════════════════════════════════════════════════════
   9. WIDGETS
   ═══════════════════════════════════════════════════════════════════════════ */

/* Read-only code viewer with file tabs. `getFiles` returns
   [{ name, mime, code }] and is called again on refresh(), so the code always
   matches the form next to it. */
function codeCard(host, getFiles) {
  const tabs = el('div', 'tabs tabs--files');
  tabs.setAttribute('role', 'tablist');
  const block = el('div', 'codeblock codeblock--tall');
  const scroller = el('div', 'scroll-x');
  const pre = el('pre');
  const code = el('code');
  pre.append(code);
  scroller.append(pre);
  block.append(scroller);

  const actions = el('div', 'actions');
  const copyLabel = tr('Copia', 'Copy');
  const dlLabel = tr('Scarica', 'Download');
  const copyBtn = el('button', 'btn btn--secondary btn--sm', copyLabel);
  const dlBtn = el('button', 'btn btn--secondary btn--sm', dlLabel);
  actions.append(copyBtn, dlBtn);
  host.append(tabs, block, actions);

  let files = [];
  let current = 0;

  function paint() {
    if (current >= files.length) current = 0;
    tabs.replaceChildren(...files.map((f, i) => {
      const b = el('button', 'tabs__item', f.name);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === current));
      b.addEventListener('click', () => { current = i; paint(); });
      return b;
    }));
    tabs.hidden = files.length < 2;
    const f = files[current];
    code.textContent = f ? f.code : '';
    dlBtn.textContent = f ? dlLabel + ' ' + f.name : dlLabel;
  }

  copyBtn.addEventListener('click', () => {
    const f = files[current];
    if (!f) return;
    copyText(f.code, copyBtn, () => {
      const range = document.createRange();
      range.selectNodeContents(code);
      const sel = global.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
  });
  dlBtn.addEventListener('click', () => {
    const f = files[current];
    if (f) downloadText(f.name, f.mime || 'text/plain', f.code);
  });

  const api = { refresh() { files = getFiles() || []; paint(); } };
  api.refresh();
  return api;
}

/* transactionResult values as documented for payment/detail, mapped to the
   three states the redirect URL uses (OK, KO, XX). */
const RESULT_STATES = Object.freeze({
  APPROVED: { state: 'OK', tone: 'success', text: tr('pagamento approvato', 'payment approved') },
  AUTHENTICATED: { state: 'OK', tone: 'success', text: tr('pagamento autenticato', 'payment authenticated') },
  OK: { state: 'OK', tone: 'success', text: tr('pagamento completato', 'payment completed') },
  DECLINED: { state: 'KO', tone: 'error', text: tr('pagamento rifiutato', 'payment declined') },
  KO: { state: 'KO', tone: 'error', text: tr('pagamento non riuscito', 'payment failed') },
  PENDING: { state: 'XX', tone: 'pending', text: tr('in attesa di conferma', 'awaiting confirmation') },
  WAITING: { state: 'XX', tone: 'pending', text: tr('pagamento in corso', 'payment in progress') },
  UNSUBMITTED: { state: 'XX', tone: 'pending', text: tr('pagamento non ancora iniziato', 'payment not started yet') },
});

/* "Verifica esito": GET payment/detail authenticated with the PaymentToken.
   The front-end outcome of any integration is never authoritative; this is the
   call the documentation points to after every flow. Authenticated this way it
   is rate-limited per transaction (5 calls in sandbox, within 24 hours of the
   authorisation — source: the REST swagger), so the card counts the calls made
   from this tab and says so instead of letting the sixth one fail unexplained. */
const DETAIL_BUDGET = 5;

function detailCard(host) {
  host.innerHTML =
    '<h2>' + tr('Verifica esito', 'Check the outcome') + '</h2>' +
    '<p class="card-sub">' + tr(
      'Chiama <code>GET payment/detail</code> con il Payment Token e mostra lo stato reale della transazione. L’esito visto a frontend non è mai definitivo: fa fede questa chiamata, insieme alla notifica server-to-server.',
      'Calls <code>GET payment/detail</code> with the Payment Token and shows the real state of the transaction. The outcome seen by a front-end is never final: this call is, together with the server-to-server notification.') + '</p>' +
    '<div class="row"><button type="button" class="btn btn--secondary" data-role="go">' + tr('Chiama payment/detail', 'Call payment/detail') + '</button>' +
    '<span class="small muted" data-role="budget"></span></div>' +
    '<div data-role="status"></div><div class="stack mt" data-role="out" hidden></div>';

  const goBtn = host.querySelector('[data-role="go"]');
  const budget = host.querySelector('[data-role="budget"]');
  const out = host.querySelector('[data-role="out"]');
  const show = statusLine(host.querySelector('[data-role="status"]'));

  const countKey = (id) => 'fbk:bench:detail-calls:' + id;
  const paintBudget = () => {
    const id = Session.values().paymentID;
    const used = id ? Number(session.get(countKey(id))) || 0 : 0;
    budget.textContent = id
      ? tr('Chiamate da questa scheda per questo Payment ID: ' + used + ' di ' + DETAIL_BUDGET + ' (limite sandbox con Payment Token).',
           'Calls from this tab for this Payment ID: ' + used + ' of ' + DETAIL_BUDGET + ' (sandbox limit with a Payment Token).')
      : '';
  };
  document.addEventListener('bench:session', paintBudget);
  paintBudget();

  goBtn.addEventListener('click', async () => {
    const v = Session.values();
    if (!v.paymentID || !v.paymentToken) {
      show(tr('Servono Payment ID e Payment Token: crea la richiesta o inserisci i valori.', 'Payment ID and Payment Token are needed: create the request or enter the values.'), 'error');
      return;
    }

    goBtn.disabled = true;
    show(tr('Chiamata in corso…', 'Calling…'), 'info');
    const res = await callApi('/payment/detail/' + encodeURIComponent(v.paymentID), { headers: { PaymentToken: v.paymentToken } });
    goBtn.disabled = false;

    if (res.kind !== 'network') {
      session.set(countKey(v.paymentID), String((Number(session.get(countKey(v.paymentID))) || 0) + 1));
      paintBudget();
    }

    out.replaceChildren();
    out.hidden = false;
    if (res.kind === 'ok') {
      const p = res.body.payload || {};
      const known = RESULT_STATES[p.transactionResult];
      show(
        known ? 'transactionResult ' + p.transactionResult + ' — ' + known.text + ' (' + known.state + ')'
              : tr('Risposta ricevuta, transactionResult: ', 'Response received, transactionResult: ') + (p.transactionResult || tr('(assente)', '(absent)')),
        known ? known.tone : 'warning'
      );
      out.append(kvList([
        ['transactionResult', p.transactionResult],
        ['transactionState', p.transactionState],
        ['transactionErrorCode', p.transactionErrorCode],
        ['transactionErrorDescription', p.transactionErrorDescription],
        ['shopTransactionID', p.shopTransactionID],
        ['paymentMethod', p.paymentMethod],
        ['company', p.company],
        ['authorizationCode', p.authorizationCode],
        [tr('Tempo di risposta', 'Response time'), res.ms + ' ms'],
      ]));
    } else if (res.kind === 'http' && res.status === 403) {
      /* 403 with a PaymentToken has two usual causes, both worth naming. */
      show(tr('HTTP 403: il Payment Token non è più valido per questa transazione. È scaduto (24 ore dall’autorizzazione) oppure sono state superate le ' + DETAIL_BUDGET + ' chiamate consentite in sandbox.',
              'HTTP 403: the Payment Token is no longer valid for this transaction. It has expired (24 hours after authorisation) or the ' + DETAIL_BUDGET + ' calls allowed in sandbox have been used up.'), 'error');
    } else {
      show(res.error, 'error');
    }
    if (res.body) out.append(jsonBlock(tr('Risposta payment/detail', 'payment/detail response'), res.body));
    else if (res.text) out.append(jsonBlock(tr('Risposta (non JSON)', 'Response (not JSON)'), res.text.slice(0, 4000)));
  });
}

/* Return from a redirect. When responseURLs point back at the bench, Fabrick
   appends a, Status, paymentID and paymentToken to the URL. The banner shows
   them, offers to load them into the form, and then removes the query string
   from the address bar: a PaymentToken left there ends up in history,
   bookmarks and in every screenshot of the page. */
const STATUS_TEXT = Object.freeze({
  OK: { tone: 'tip', text: tr('pagamento completato con esito positivo', 'payment completed successfully') },
  KO: { tone: 'danger', text: tr('pagamento completato con esito negativo', 'payment completed with a negative outcome') },
  XX: { tone: 'warning', text: tr('pagamento sospeso, in attesa dell’esito finale: non evadere l’ordine', 'payment suspended, awaiting the final outcome: do not fulfil the order') },
});

function returnBanner(host) {
  if (!host) return;
  const q = new URLSearchParams(global.location.search);
  const status = q.get('Status');
  const found = { shopLogin: q.get('a') || '', paymentID: q.get('paymentID') || '', paymentToken: q.get('paymentToken') || '' };
  if (!status && !found.paymentID) return;

  const info = STATUS_TEXT[status] || { tone: 'info', text: tr('stato non riconosciuto', 'unrecognised status') };
  const box = el('div', 'admonition admonition--' + info.tone);
  const title = el('div', 'admonition__title');
  title.innerHTML = ICONS.info;
  title.append(tr('Ritorno da redirect', 'Back from a redirect'));
  const p = el('p');
  p.append(tr('La pagina è stata aperta da un redirect di Fabrick con ', 'This page was opened by a Fabrick redirect with '));
  p.append(el('code', null, 'Status=' + (status || tr('(assente)', '(absent)'))));
  p.append(': ' + info.text + '.');
  box.append(title, p, kvList([
    ['a (shopLogin)', found.shopLogin],
    ['paymentID', found.paymentID],
    ['paymentToken', maskToken(found.paymentToken)],
  ]));

  const actions = el('div', 'actions');
  const use = el('button', 'btn btn--secondary btn--sm', tr('Usa questi valori', 'Use these values'));
  use.addEventListener('click', () => { Session.fill(found); use.disabled = true; use.textContent = tr('Valori caricati', 'Values loaded'); });
  const close = el('button', 'btn btn--secondary btn--sm', tr('Chiudi', 'Close'));
  close.addEventListener('click', () => box.remove());
  actions.append(use, close);
  box.append(actions);
  host.append(box);

  try { global.history.replaceState(null, '', global.location.pathname); } catch (e) { /* file:// on some browsers */ }
}

/* How to come back to the bench after a flow that leaves the page (3DS, APM):
   point the transaction's result URLs at this very page, and returnBanner()
   picks up the outcome. The tip prints the URL to use, and can write it into
   the body being composed. */
function returnTip(host) {
  if (!host) return;
  const here = global.location.origin + global.location.pathname;
  const box = admonition('tip', tr('Tornare qui dopo il pagamento', 'Coming back here after the payment'), tr(
    '<p>Se nella <code>payment/create</code> valorizzi <code>responseURLs.buyerOK</code> e <code>responseURLs.buyerKO</code> con l’indirizzo di questa pagina, a fine flusso Fabrick riporta il buyer qui e il banco mostra <code>Status</code>, <code>paymentID</code> e <code>paymentToken</code> ricevuti. Vedi <a data-doc="responseAddress">Response address</a>.</p>',
    '<p>If you set <code>responseURLs.buyerOK</code> and <code>responseURLs.buyerKO</code> in <code>payment/create</code> to the address of this page, Fabrick brings the buyer back here at the end of the flow and the bench shows the <code>Status</code>, <code>paymentID</code> and <code>paymentToken</code> it received. See <a data-doc="responseAddress">Response address</a>.</p>'));
  const row = el('div', 'row');
  const copyBtn = el('button', 'btn btn--secondary btn--sm', tr('Copia indirizzo', 'Copy address'));
  copyBtn.addEventListener('click', () => copyText(here, copyBtn));
  const addBtn = el('button', 'btn btn--secondary btn--sm', tr('Aggiungi al body', 'Add to the body'));
  addBtn.addEventListener('click', () => {
    const done = Session.mode === 'create' && Session.patchBody((o) => {
      o.responseURLs = Object.assign({}, o.responseURLs, { buyerOK: here, buyerKO: here });
    });
    addBtn.textContent = done ? tr('Aggiunto', 'Added') : tr('Body non modificabile', 'Body not editable');
    setTimeout(() => { addBtn.textContent = tr('Aggiungi al body', 'Add to the body'); }, 1500);
  });
  row.append(el('code', null, here), copyBtn, addBtn);
  box.append(row);
  host.append(box);
}

/* The payment link, resolved from the session and ready to use: shown in full,
   with the three ways a tester needs to exercise it. The anchor receives an
   href only after resolveLink() has accepted the URL, so it can never point
   outside the sandbox hosts. */
const LINK_SOURCE = Object.freeze({
  response: { cls: 'pill', label: tr('Link restituito da Fabrick', 'Link returned by Fabrick') },
  pasted: { cls: 'pill pill--info', label: tr('Link incollato', 'Pasted link') },
  built: { cls: 'pill pill--warn', label: tr('Link ricostruito', 'Rebuilt link') },
});

function linkCard(host) {
  host.innerHTML =
    '<div class="codeblock codeblock--wrap">' +
      '<div class="codeblock__title"><span class="pill pill--muted" data-role="source"></span></div>' +
      '<div class="scroll-x"><pre><code data-role="url"></code></pre></div>' +
    '</div>' +
    '<div class="actions">' +
      '<a class="btn btn--primary" data-role="open" target="_blank" rel="noopener noreferrer">' + tr('Apri in una nuova scheda', 'Open in a new tab') + '</a>' +
      '<button type="button" class="btn btn--secondary" data-role="here">' + tr('Apri in questa scheda', 'Open in this tab') + '</button>' +
      '<button type="button" class="btn btn--secondary" data-role="copy">' + tr('Copia link', 'Copy link') + '</button>' +
    '</div>' +
    '<div data-role="note"></div>';

  const q = (role) => host.querySelector('[data-role="' + role + '"]');
  const source = q('source'), urlNode = q('url'), openA = q('open'), hereBtn = q('here'), copyBtn = q('copy'), note = q('note');
  let current = { ok: false };

  function refresh() {
    current = resolveLink(Session.values());
    note.replaceChildren();
    if (current.ok) {
      const src = LINK_SOURCE[current.source];
      urlNode.textContent = current.url;
      openA.href = current.url;
      openA.removeAttribute('aria-disabled');
      source.textContent = src.label;
      source.className = src.cls;
      if (current.source === 'built') {
        note.append(admonition('warning', tr('Link ricostruito, non restituito da Fabrick', 'Rebuilt link, not returned by Fabrick'), tr(
          '<p>La risposta non contiene <code>payload.userRedirect.href</code>, quindi il link è composto dal banco sullo schema degli esempi di documentazione: <code>/pbl/a/{shopLogin}/b/{paymentID}/c/{paymentToken}</code>. Fabrick restituisce il link solo se la richiesta include <code>paymentChannel.channelType</code>.</p>',
          '<p>The response has no <code>payload.userRedirect.href</code>, so the bench composed the link on the shape of the documentation examples: <code>/pbl/a/{shopLogin}/b/{paymentID}/c/{paymentToken}</code>. Fabrick returns the link only when the request includes <code>paymentChannel.channelType</code>.</p>')));
      }
    } else {
      urlNode.textContent = current.error;
      openA.removeAttribute('href');
      openA.setAttribute('aria-disabled', 'true');
      source.textContent = tr('In attesa dei dati', 'Waiting for data');
      source.className = 'pill pill--muted';
    }
    hereBtn.disabled = copyBtn.disabled = !current.ok;
  }

  hereBtn.addEventListener('click', () => { if (current.ok) global.location.assign(current.url); });
  copyBtn.addEventListener('click', () => { if (current.ok) copyText(current.url, copyBtn); });
  openA.addEventListener('click', (ev) => { if (!current.ok) ev.preventDefault(); });

  document.addEventListener('bench:session', refresh);
  refresh();
  return { get: () => current, refresh };
}


global.Bench = Object.freeze({
  BUILD, REPO_URL, LANG, SANDBOX, DOCS, PAGES, ICONS, RESULT_STATES,
  $, el, esc, jsLiteral, maskToken, clock, tr,
  local, session, copyText, downloadText,
  createLogger, Theme, boot, wireDocLinks,
  Session, checkSandboxUrl, resolveLink, callApi,
  statusLine, codeCard, jsonBlock, kvList, detailCard, returnBanner, returnTip, linkCard, admonition,
});

})(window);
