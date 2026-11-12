/* ═══════════════════════════════════════════════════════════════════════════
   home.js — index.html

   The six entry cards are generated from Bench.PAGES, the same registry that
   feeds the navbar: adding an integration is one object in core.js, and the
   home page, the navbar and the breadcrumbs follow.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

const B = window.Bench;
B.boot('home');

/* What the card footer says the page needs. Kept next to the rendering because
   it is presentation, not data about the integration. */
const NEEDS_LABEL = {
  ids: 'Payment ID + Payment Token',
  link: B.tr('Link di pagamento', 'Payment link'),
};
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

/* All strings come from the PAGES registry in core.js: constant source text,
   so innerHTML is safe here. */
B.$('tiles').innerHTML = B.PAGES.map((p) =>
  '<li><a class="tile" href="' + p.file + '">' +
    '<span class="tile__icon">' + p.icon + '</span>' +
    '<h3 class="tile__title">' + p.title + '</h3>' +
    '<p class="tile__text">' + p.blurb + '</p>' +
    '<span class="tile__foot">' +
      '<span class="tile__needs">' + NEEDS_LABEL[p.needs] + '</span>' +
      '<span class="tile__go">' + B.tr('Apri', 'Open') + ARROW + '</span>' +
    '</span>' +
  '</a></li>'
).join('');

})();
