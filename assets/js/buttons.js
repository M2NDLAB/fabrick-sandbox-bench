/* ═══════════════════════════════════════════════════════════════════════════
   buttons.js — buttons.html

   A DECLARATIVE REGISTRY
   METHODS describes each brand: paymentType, the request that reaches it,
   height band, controls, how the button is built, the snippet that reproduces
   it, the notes that depend on the current choices, the standing rules and
   their sources. The engine below knows nothing about Klarna or PayPal: it
   reads that shape. A fifth brand is one object, not one more branch.

   WHICH BRANDS ARE AVAILABLE
   A button is only as good as the link under it, and the link reaches a brand
   directly only when the request named that brand in paymentType. So:
     - request created here  → a brand is available if paymentType lists it
     - values pasted by hand → every brand is shown, with a note that the bench
                               cannot verify what the link was created for

   ONE GEOMETRY FOR SCREEN AND SNIPPET
   Each brand computes its declarations once (style()), and both the specimen
   and the generated markup are produced from that map.

   SOURCE STATUS — brand pages last read on 2026-11-12
     Klarna      guidelines read in full. Klarna publishes a stylesheet for an
                 "official" button, but the markup that goes inside it sits in
                 a collapsed block that is not readable; without it the button
                 renders as bare text. That rendering was removed: the bench
                 draws the button itself around Klarna's official badge.
     PayPal      the public designer guide covers "Log in with PayPal"; colours
                 and heights of the payment button come from the SDK reference.
                 Only one logo URL is confirmed.
     Satispay    no public style guide; one ready-made SVG, en/red confirmed.
     Amazon Pay  four official assets with direct URLs and a written usage rule.
   `sure: false` on an asset means the URL was inferred from a naming pattern.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

const B = window.Bench;
const $ = B.$;
const tr = B.tr;
const CHECKED = tr('12 novembre 2026', '12 November 2026');

/* ═══════════════════════════════════════════════════════════════════════════
   1. SHARED HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
const radiusFor = (shape, h) => (shape === 'pill' ? Math.round(h / 2) : shape === 'sharp' ? 0 : 4);
const fontFor = (h) => Math.max(13, Math.round(h * 0.31));
const logoHeight = (h, ratio, cap) => Math.round(Math.min(h * ratio, cap));
const cssText = (map) => Object.entries(map).map(([k, v]) => k + ':' + v).join(';');
const cssAttr = (map, indent) => Object.entries(map).map(([k, v]) => k + ': ' + v).join(';\n' + indent);

/* An image that replaces itself with a text marker when the asset is missing. */
function brandImage(src, alt, heightPx) {
  const img = B.el('img');
  img.alt = alt;
  img.style.height = heightPx + 'px';
  img.addEventListener('error', () => img.replaceWith(B.el('span', 'apm-missing', '[' + alt + ': ' + tr('asset non disponibile', 'asset not available') + ']')));
  img.src = src;
  return img;
}

function drawnButton(map, label) {
  const b = B.el('button', 'apm-btn');
  b.style.cssText = cssText(map);
  b.setAttribute('aria-label', label);
  return b;
}

/* Navigation is an anchor, not a button with a click handler: it works without
   JavaScript, can be opened in a new tab, and needs no inline script. */
function anchorSnippet(map, url, label, inner) {
  const base = {
    display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center', gap: '9px',
    width: '100%', padding: '0 20px', 'box-sizing': 'border-box',
    'font-family': 'system-ui, sans-serif', 'font-weight': '600', 'white-space': 'nowrap', 'text-decoration': 'none',
    border: '1px solid',
  };
  return '<a href="' + B.esc(url) + '"\n' +
    '   aria-label="' + label + '"\n' +
    '   style="' + cssAttr(Object.assign(base, map), '          ') + '">\n' +
    inner +
    '</a>\n';
}

/* The request that reaches a brand: the documentation's skeleton, the LINK
   channel and a single paymentType. `extra` carries the fields a brand makes
   mandatory. */
const requestFor = (paymentType, amount, extra) => (shopLogin) => Object.assign({
  shopLogin,
  amount,
  currency: 'EUR',
  shopTransactionID: 'FBK_OrderID',
  paymentType: [paymentType],
  paymentChannel: { channelType: ['LINK'] },
}, extra);

/* ═══════════════════════════════════════════════════════════════════════════
   2. ASSETS
   ═══════════════════════════════════════════════════════════════════════════ */
const AMAZON_BASE = 'https://m.media-amazon.com/images/G/01/amazonpayments/documentation/AmazonPay_BrandAssets/Logos/';

const ASSETS = Object.freeze({
  klarnaBadge: { url: 'https://x.klarnacdn.net/payment-method/assets/badges/generic/klarna.svg', sure: true },
  paypal: {
    color: { url: 'https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-200px.png', sure: true },
    white: { url: 'https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-white.svg', sure: false },
  },
  amazon: {
    light: { url: AMAZON_BASE + 'amazonpay-logo_clr.svg', sure: true },       /* primary logo, light backgrounds */
    dark: { url: AMAZON_BASE + 'amazonpay-logo-rgb_rev.svg', sure: true },    /* secondary logo, dark backgrounds */
  },
});

/* ═══════════════════════════════════════════════════════════════════════════
   3. METHOD REGISTRY
   Every method exposes:
     name, paymentType, docKey      identity and the documentation page
     request(shopLogin)             the default payment/create body
     band { min, rec, max, rule }   allowed heights and where the rule is from
     controls [ { id, label, value, options | text } ]
     build(c, h)                    → the button node for the specimen
     snippet(c, h, url)             → the markup to copy
     notes(c, ctx)                  → [{ tone, text }] for the current choices
     rules [ { tone, title, html } ]  standing rules, constant markup
     sources [ { url, note } ]
   ═══════════════════════════════════════════════════════════════════════════ */
const METHODS = {

  klarna: {
    name: 'Klarna', paymentType: 'KLARNA', docKey: 'klarna',
    /* Klarna is the one method here with mandatory fields: the billing country
       and the product lines, whose prices add up to the amount. Values from
       the "Campi obbligatori" example of the Fabrick documentation. */
    request: requestFor('KLARNA', '294.90', {
      OrderDetails: {
        BillingAddress: { CountryCode: 'IT' },
        ProductDetails: [
          { Name: 'Zaino Explorer', UnitPrice: '180.00', Quantity: '1' },
          { Name: 'Runner Pro', UnitPrice: '89.90', Quantity: '1' },
          { Name: 'Spedizione', UnitPrice: '25', Quantity: '1' },
        ],
      },
    }),
    band: { min: 40, rec: 48, max: null, rule: tr('Klarna indica 48 px come altezza consigliata e 40 px come minimo.', 'Klarna gives 48 px as the recommended height and 40 px as the minimum.') },
    controls: [
      { id: 'theme', label: tr('Tema', 'Theme'), value: 'dark', options: [['dark', 'dark'], ['light', 'light'], ['outlined', 'outlined']] },
      { id: 'shape', label: tr('Forma', 'Shape'), value: 'default', options: [['default', 'default'], ['pill', 'pill'], ['rect', 'rect']] },
      { id: 'copy', label: tr('Testo del pulsante', 'Button text'), value: tr('Paga con', 'Pay with'), text: true },
    ],
    /* The three themes are the ones named in the Klarna guidelines; the hex
       values are NOT official, they are this bench's reading of them. */
    palette: {
      dark: { bg: '#0b051d', fg: '#ffffff', border: '#0b051d' },
      light: { bg: '#ffffff', fg: '#0b051d', border: '#ffffff' },
      outlined: { bg: 'transparent', fg: '#0b051d', border: '#0b051d' },
    },
    style(c, h) {
      const p = this.palette[c.theme];
      const radius = c.shape === 'pill' ? Math.round(h / 2) : c.shape === 'rect' ? 0 : 8;
      return { height: h + 'px', background: p.bg, color: p.fg, 'border-color': p.border, 'border-radius': radius + 'px', 'font-size': fontFor(h) + 'px' };
    },
    build(c, h) {
      const b = drawnButton(this.style(c, h), (c.copy + ' Klarna').trim());
      if (c.copy.trim()) b.append(B.el('span', null, c.copy));
      b.append(brandImage(ASSETS.klarnaBadge.url, 'Klarna', logoHeight(h, 0.5, 28)));
      return b;
    },
    snippet(c, h, url) {
      return anchorSnippet(this.style(c, h), url, B.esc((c.copy + ' Klarna').trim()),
        (c.copy.trim() ? '  <span>' + B.esc(c.copy) + '</span>\n' : '') +
        '  <img src="' + ASSETS.klarnaBadge.url + '" alt="Klarna" height="' + logoHeight(h, 0.5, 28) + '" />\n');
    },
    notes(c, ctx) {
      const out = [];
      /* The contrast rule is Klarna's own; outlined is not named by it but is
         transparent with dark ink, so on a dark page it simply disappears. */
      if (ctx.surface === 'dark' && c.theme === 'dark') out.push({ tone: 'danger', text: tr('Klarna vieta il tema dark su fondi neri o scuri: il contrasto è insufficiente.', 'Klarna forbids the dark theme on black or dark backgrounds: the contrast is insufficient.') });
      if (ctx.surface === 'dark' && c.theme === 'outlined') out.push({ tone: 'danger', text: tr('Il tema outlined è trasparente con bordo e testo scuri: su un fondo scuro sparisce. Usa il tema light.', 'The outlined theme is transparent with dark border and text: on a dark background it disappears. Use the light theme.') });
      if (ctx.surface === 'light' && c.theme === 'light') out.push({ tone: 'danger', text: tr('Klarna vieta il tema light su fondi bianchi o chiari: il contrasto è insufficiente.', 'Klarna forbids the light theme on white or light backgrounds: the contrast is insufficient.') });
      out.push({ tone: 'info', text: tr('Il testo del pulsante va preso dai descriptor approvati da Klarna per il mercato, non tradotto a mano: verifica «' + c.copy + '» prima di pubblicare.', 'The button text must come from the descriptors Klarna approved for the market, not from a hand translation: check “' + c.copy + '” before publishing.') });
      return out;
    },
    rules: [
      { tone: 'info', title: tr('Temi e contrasto', 'Themes and contrast'), html: tr('<p>Tre temi: <code>dark</code>, <code>light</code>, <code>outlined</code>. Il tema dark non va usato su fondi scuri e il tema light non va usato su fondi chiari.</p>', '<p>Three themes: <code>dark</code>, <code>light</code>, <code>outlined</code>. The dark theme must not be used on dark backgrounds, nor the light theme on light ones.</p>') },
      { tone: 'info', title: tr('Dimensioni', 'Size'), html: tr('<p>Altezza consigliata 48 px, minima 40 px, allineata agli altri pulsanti di pagamento della pagina.</p>', '<p>Recommended height 48 px, minimum 40 px, aligned with the other payment buttons on the page.</p>') },
      { tone: 'warning', title: tr('Cosa è ufficiale e cosa no', 'What is official and what is not'), html: tr(
        '<p>Il badge è l’asset distribuito da Klarna. Il pulsante attorno è disegnato dal banco: i colori di fondo sono indicativi, non valori ufficiali. Klarna pubblica anche un foglio di stile per un pulsante «ufficiale», ma il markup da metterci dentro non è leggibile nella documentazione pubblica: senza, il pulsante mostra solo il testo. Per quello fedele chiedi il markup al tuo referente Klarna.</p>',
        '<p>The badge is the asset Klarna distributes. The button around it is drawn by the bench: the background colours are indicative, not official values. Klarna also publishes a stylesheet for an “official” button, but the markup that goes inside is not readable in the public documentation: without it the button shows the text only. For the faithful one, ask your Klarna contact for the markup.</p>') },
      { tone: 'warning', title: tr('Campi obbligatori nella richiesta', 'Mandatory fields in the request'), html: tr(
        '<p>Klarna richiede <code>OrderDetails.BillingAddress.CountryCode</code> e <code>OrderDetails.ProductDetails</code> con <code>Name</code>, <code>UnitPrice</code> e <code>Quantity</code>. In sandbox servono inoltre l’abilitazione del metodo e i dati cliente di esempio di Klarna: vedi la <a data-doc="klarna">pagina Klarna</a>.</p>',
        '<p>Klarna requires <code>OrderDetails.BillingAddress.CountryCode</code> and <code>OrderDetails.ProductDetails</code> with <code>Name</code>, <code>UnitPrice</code> and <code>Quantity</code>. In sandbox you also need the method enabled and Klarna’s sample customer data: see the <a data-doc="klarna">Klarna page</a>.</p>') },
    ],
    sources: [
      { url: 'https://docs.klarna.com/acquirer/klarna/web-payments/additional-resources/checkout-styling/', note: tr('Temi, forme, altezze, badge e regole di contrasto.', 'Themes, shapes, heights, badge and contrast rules.') },
      { url: 'https://docs.klarna.com/acquirer/klarna/web-payments/additional-resources/ux-guidelines/payment-descriptors/', note: tr('Testi approvati per mercato.', 'Approved copy per market.') },
    ],
  },

  paypal: {
    name: 'PayPal', paymentType: 'PAYPAL', docKey: 'paypal',
    request: requestFor('PAYPAL', '100'),
    band: { min: 25, rec: 45, max: 55, rule: tr('L’SDK PayPal ammette altezze da 25 a 55 px.', 'The PayPal SDK allows heights from 25 to 55 px.') },
    controls: [
      { id: 'color', label: tr('Colore', 'Colour'), value: 'gold', options: [['gold', tr('oro', 'gold')], ['blue', tr('blu', 'blue') + ' · #0070BA'], ['silver', tr('argento', 'silver') + ' · #EEEEEE'], ['white', tr('bianco', 'white')], ['black', tr('nero', 'black')]] },
      { id: 'shape', label: tr('Forma', 'Shape'), value: 'pill', options: [['pill', 'pill · ' + tr('consigliata', 'recommended')], ['rect', 'rect'], ['sharp', 'sharp']] },
      { id: 'label', label: tr('Etichetta', 'Label'), value: tr('Paga con', 'Pay with'), text: true },
    ],
    /* `sure` = hex confirmed by the PayPal guide; the others are read from the
       button the SDK generates. */
    palette: {
      gold: { bg: '#ffc439', fg: '#003087', border: '#ffc439', tone: 'light', sure: false },
      blue: { bg: '#0070ba', fg: '#ffffff', border: '#0070ba', tone: 'dark', sure: true },
      silver: { bg: '#eeeeee', fg: '#000000', border: '#eeeeee', tone: 'light', sure: true },
      white: { bg: '#ffffff', fg: '#000000', border: '#cccccc', tone: 'light', sure: false },
      black: { bg: '#2c2e2f', fg: '#ffffff', border: '#2c2e2f', tone: 'dark', sure: false },
    },
    /* PayPal prescribes the white icon on coloured or dark buttons and the
       colour icon on white or light ones. */
    asset(c) { return this.palette[c.color].tone === 'dark' ? ASSETS.paypal.white : ASSETS.paypal.color; },
    style(c, h) {
      const p = this.palette[c.color];
      return { height: h + 'px', background: p.bg, color: p.fg, 'border-color': p.border, 'border-radius': radiusFor(c.shape, h) + 'px', 'font-size': fontFor(h) + 'px' };
    },
    build(c, h) {
      const b = drawnButton(this.style(c, h), (c.label + ' PayPal').trim());
      if (c.label.trim()) b.append(B.el('span', null, c.label));
      b.append(brandImage(this.asset(c).url, 'PayPal', logoHeight(h, 0.42, 24)));
      return b;
    },
    snippet(c, h, url) {
      return anchorSnippet(this.style(c, h), url, B.esc((c.label + ' PayPal').trim()),
        (c.label.trim() ? '  <span>' + B.esc(c.label) + '</span>\n' : '') +
        '  <img src="' + this.asset(c).url + '" alt="PayPal" height="' + logoHeight(h, 0.42, 24) + '" />\n');
    },
    notes(c, ctx) {
      const p = this.palette[c.color];
      const out = [];
      if (!this.asset(c).sure) out.push({ tone: 'warning', text: tr('Il logo bianco usato su questo colore ha un indirizzo dedotto, non pubblicato da PayPal in una pagina tecnica. Se non compare, scaricalo dal Logo Center PayPal e ospitalo tu.', 'The white logo used on this colour has an inferred address, not one PayPal publishes on a technical page. If it does not show, download it from the PayPal Logo Center and host it yourself.') });
      if (!p.sure) out.push({ tone: 'info', text: tr('Questo colore è ricavato dal pulsante generato dall’SDK, non da una pagina di specifica: confermati dalla guida sono il blu #0070BA e l’argento #EEEEEE.', 'This colour is read from the button the SDK generates, not from a specification page: the guide confirms blue #0070BA and silver #EEEEEE.') });
      if (ctx.surface === 'dark') out.push({ tone: 'warning', text: tr('PayPal raccomanda di collocare il pulsante su fondi bianchi o chiari.', 'PayPal recommends placing the button on white or light backgrounds.') });
      if (fontFor(ctx.height) < 17) out.push({ tone: 'info', text: tr('PayPal indica 13 pt come corpo minimo, circa 17 px: con questa altezza il testo è ' + fontFor(ctx.height) + ' px.', 'PayPal gives 13 pt as the minimum type size, about 17 px: at this height the text is ' + fontFor(ctx.height) + ' px.') });
      if (/accedi|log ?in|sign ?in/i.test(c.label)) out.push({ tone: 'danger', text: tr('Questa è un’etichetta di accesso, non di pagamento: appartiene al flusso «Log in with PayPal».', 'This is a sign-in label, not a payment one: it belongs to the “Log in with PayPal” flow.') });
      return out;
    },
    rules: [
      { tone: 'info', title: tr('Colori e forma', 'Colours and shape'), html: tr('<p>Confermati dalla guida: grigio <code>#EEEEEE</code> e blu <code>#0070BA</code>, testo bianco su fondo scuro e nero su fondo chiaro, forma pill consigliata.</p>', '<p>Confirmed by the guide: grey <code>#EEEEEE</code> and blue <code>#0070BA</code>, white text on dark and black on light, pill shape recommended.</p>') },
      { tone: 'info', title: tr('Icona', 'Icon'), html: tr('<p>Icona bianca su pulsante colorato o scuro, a colori su pulsante bianco o chiaro. Icone diverse, datate o rielaborate non sono ammesse.</p>', '<p>White icon on a coloured or dark button, colour icon on a white or light one. Different, outdated or reworked icons are not allowed.</p>') },
      { tone: 'warning', title: tr('Origine della guida', 'Where the guide comes from'), html: tr('<p>La guida pubblica è quella del pulsante <em>Log in with PayPal</em>: valgono contrasti e tipografia, non le etichette. Per il pulsante di pagamento la documentazione Fabrick rimanda alle <a data-doc="paypal">linee guida PayPal</a>.</p>', '<p>The public guide is the one for the <em>Log in with PayPal</em> button: contrast and typography apply, labels do not. For the payment button the Fabrick documentation points to the <a data-doc="paypal">PayPal guidelines</a>.</p>') },
    ],
    sources: [
      { url: 'https://developer.paypal.com/log-in/designer-guide', note: tr('Colori confermati, regola sull’icona, corpo minimo, forma consigliata.', 'Confirmed colours, icon rule, minimum type size, recommended shape.') },
      { url: 'https://developer.paypal.com/docs/multiparty/checkout/standard/customize/buttons-style-guide/', note: tr('Colori, forme e altezze del pulsante generato dall’SDK.', 'Colours, shapes and heights of the SDK-generated button.') },
      { url: 'https://www.paypal.com/webapps/mpp/logos-buttons', note: tr('Logo Center: origine autorevole delle icone.', 'Logo Center: the authoritative source of the icons.') },
    ],
  },

  satispay: {
    name: 'Satispay', paymentType: 'SATISPAY', docKey: 'satispay',
    request: requestFor('SATISPAY', '100'),
    band: { min: null, rec: 50, max: null, rule: tr('Satispay non dichiara un’altezza: l’esempio ufficiale usa 50 px.', 'Satispay states no height: the official example uses 50 px.') },
    controls: [
      { id: 'lang', label: tr('Lingua dell’asset', 'Asset language'), value: 'en', options: [['en', 'en · ' + tr('confermata', 'confirmed')], ['it', 'it'], ['fr', 'fr'], ['de', 'de']] },
      { id: 'tint', label: tr('Colore dell’asset', 'Asset colour'), value: 'red', options: [['red', 'red · ' + tr('confermato', 'confirmed')], ['white', 'white'], ['black', 'black']] },
    ],
    asset: (c) => 'https://online.satispay.com/images/' + c.lang + '-pay-' + c.tint + '.svg',
    build(c, h) {
      const b = B.el('button', 'apm-plate');
      b.style.height = h + 'px';
      b.setAttribute('aria-label', tr('Paga con Satispay', 'Pay with Satispay'));
      b.append(brandImage(this.asset(c), 'Pay with Satispay', h));
      return b;
    },
    snippet(c, h, url) {
      return '<a href="' + B.esc(url) + '" aria-label="' + tr('Paga con Satispay', 'Pay with Satispay') + '">\n' +
        '  <img src="' + this.asset(c) + '" alt="Pay with Satispay" style="height: ' + h + 'px" />\n' +
        '</a>\n';
    },
    notes(c) {
      return (c.lang === 'en' && c.tint === 'red') ? []
        : [{ tone: 'warning', text: tr('Variante dedotta dal nome del file: confermata è solo la combinazione en/red. Se l’asset non compare, questa variante non esiste.', 'Variant inferred from the file name: only the en/red combination is confirmed. If the asset does not show, this variant does not exist.') }];
    },
    rules: [
      { tone: 'info', title: tr('Il pulsante è un’immagine', 'The button is an image'), html: tr('<p>Satispay non pubblica una guida di stile: fornisce un asset SVG pronto, usato come immagine cliccabile. Per il materiale grafico ufficiale e le condizioni d’uso la <a data-doc="satispay">documentazione Fabrick</a> rimanda al referente Satispay.</p>', '<p>Satispay publishes no style guide: it provides a ready-made SVG asset, used as a clickable image. For official artwork and terms of use the <a data-doc="satispay">Fabrick documentation</a> refers you to your Satispay contact.</p>') },
      { tone: 'info', title: tr('Lo script Satispay non serve', 'The Satispay script is not needed'), html: tr('<p><code>web-button.js</code> pilota un flusso Satispay proprio: con il redirect Fabrick basta il link sotto l’immagine.</p>', '<p><code>web-button.js</code> drives a Satispay flow of its own: with the Fabrick redirect, the link under the image is enough.</p>') },
    ],
    sources: [
      { url: 'https://developers.satispay.com/docs/web-button-pay', note: tr('L’asset SVG del pulsante, con altezza 50 px e testo alternativo.', 'The SVG asset of the button, with 50 px height and alternative text.') },
    ],
  },

  amazonpay: {
    name: 'Amazon Pay', paymentType: 'AMAZONPAY', docKey: 'apm',
    request: requestFor('AMAZONPAY', '100'),
    band: { min: null, rec: 48, max: null, rule: tr('Nessuna altezza ufficiale reperita per il pulsante web Amazon Pay.', 'No official height found for the Amazon Pay web button.') },
    controls: [
      { id: 'color', label: tr('Variante', 'Variant'), value: 'gold', options: [['gold', tr('oro', 'gold') + ' · #FFD814'], ['squidInk', 'squid ink · #232F3E'], ['white', tr('bianco', 'white')]] },
      { id: 'shape', label: tr('Angoli', 'Corners'), value: 'rect', options: [['rect', '4 px'], ['sharp', tr('vivi', 'square')], ['pill', 'pill']] },
    ],
    palette: {
      gold: { bg: '#ffd814', fg: '#232f3e', border: '#ffd814', tone: 'light' },
      squidInk: { bg: '#232f3e', fg: '#ffffff', border: '#232f3e', tone: 'dark' },
      white: { bg: '#ffffff', fg: '#232f3e', border: '#232f3e', tone: 'light' },
    },
    /* Primary logo on light buttons, secondary on dark: Amazon's own rule. The
       acceptance marks are deliberately not offered — they must not be used as
       a checkout button. */
    asset(c) { return ASSETS.amazon[this.palette[c.color].tone]; },
    style(c, h) {
      const p = this.palette[c.color];
      return { height: h + 'px', background: p.bg, color: p.fg, 'border-color': p.border, 'border-radius': radiusFor(c.shape, h) + 'px' };
    },
    build(c, h) {
      const b = drawnButton(this.style(c, h), 'Amazon Pay');
      b.append(brandImage(this.asset(c).url, 'Amazon Pay', logoHeight(h, 0.42, 24)));
      return b;
    },
    snippet(c, h, url) {
      return anchorSnippet(this.style(c, h), url, 'Amazon Pay',
        '  <img src="' + this.asset(c).url + '" alt="Amazon Pay" height="' + logoHeight(h, 0.42, 24) + '" />\n');
    },
    notes() {
      return [{ tone: 'warning', text: tr('Amazon consente l’uso dei propri pulsanti senza pre-approvazione solo se non vengono modificati. Colori e angoli qui servono alla prova: prima di pubblicare verifica con il supporto Amazon Pay.', 'Amazon allows its buttons to be used without pre-approval only if they are not modified. Colours and corners here are for testing: check with Amazon Pay support before publishing.') }];
    },
    rules: [
      { tone: 'danger', title: tr('Non modificare, non scambiare gli asset', 'Do not modify, do not swap the assets'), html: tr('<p>I pulsanti si possono usare senza pre-approvazione a condizione che non vengano modificati. L’<strong>acceptance mark</strong> non va usato come pulsante di checkout: per questo il banco propone solo i due loghi.</p>', '<p>The buttons may be used without pre-approval provided they are not modified. The <strong>acceptance mark</strong> must not be used as a checkout button: that is why the bench offers the two logos only.</p>') },
      { tone: 'info', title: tr('Colori', 'Colours'), html: tr('<p>Oro <code>#FFD814</code>, squid ink <code>#232F3E</code>, bianco. Logo primario sui fondi chiari, secondario sui fondi scuri.</p>', '<p>Gold <code>#FFD814</code>, squid ink <code>#232F3E</code>, white. Primary logo on light backgrounds, secondary on dark ones.</p>') },
    ],
    sources: [
      { url: 'https://developer.amazon.com/docs/amazon-pay-checkout/take-your-integration-live.html', note: tr('I quattro asset ufficiali con indirizzo diretto e regola d’uso.', 'The four official assets with direct address and usage rule.') },
      { url: 'https://amazonpaylegacyintegrationguide.s3.amazonaws.com/docs/amazon-pay-automatic/style-guidelines.html', note: tr('L’uso senza pre-approvazione è subordinato a non modificare i pulsanti.', 'Use without pre-approval is conditional on not modifying the buttons.') },
    ],
  },
};
const IDS = Object.keys(METHODS);
const byType = (paymentType) => IDS.find((id) => METHODS[id].paymentType === paymentType);

/* ═══════════════════════════════════════════════════════════════════════════
   4. STATE AND SESSION
   ═══════════════════════════════════════════════════════════════════════════ */
const state = { method: IDS[0], cfg: {}, height: METHODS[IDS[0]].band.rec, width: 320, surface: 'light', target: 'tab' };
IDS.forEach((id) => {
  state.cfg[id] = {};
  METHODS[id].controls.forEach((c) => { state.cfg[id][c.id] = c.value; });
});
const cur = () => METHODS[state.method];
const cfg = () => state.cfg[state.method];

B.boot('buttons');
B.Session.mount($('sessionFields'), {
  page: 'buttons',
  modes: ['create', 'manual'],
  manual: ['link', 'ids'],
  template: (shopLogin) => METHODS[state.method].request(shopLogin),
});
B.returnBanner($('returnHost'));
B.detailCard($('detailCard'));
const showMessage = B.statusLine($('statusMessage'));

/* The brand picker of the "create" tab. Choosing a brand rewrites the body
   with that brand's request: unlike a channel or a date, a brand changes which
   fields are mandatory, so patching one key would leave a broken request. */
const brandSelect = B.el('select', 'select');
(function buildBrandPicker() {
  const wrap = B.el('div', 'field');
  const label = B.el('label');
  label.htmlFor = 'brandSelect';
  label.append(tr('Metodo', 'Method') + ' (', B.el('code', null, 'paymentType'), ')');
  brandSelect.id = 'brandSelect';
  IDS.forEach((id) => brandSelect.append(Object.assign(B.el('option', null, METHODS[id].name + ' · ' + METHODS[id].paymentType), { value: id })));
  wrap.append(label, brandSelect, B.el('small', 'hint', tr('Cambiare metodo riscrive il body con la richiesta di quel brand.', 'Changing method rewrites the body with that brand’s request.')));
  B.Session.slot.append(wrap);
  brandSelect.addEventListener('change', () => {
    selectMethod(brandSelect.value);
    B.Session.resetBody();
  });
})();

/* Whether a brand can be shown for the current session, and why not. */
function availability(id) {
  const v = B.Session.values();
  if (v.origin === 'manual' || v.types === undefined) return { ok: true, verified: false };
  if (v.types === null) return { ok: false, why: tr('La richiesta non ha paymentType: il link porta alla pagina di selezione, non a un brand.', 'The request has no paymentType: the link leads to the selection page, not to a brand.') };
  return v.types.indexOf(METHODS[id].paymentType) >= 0
    ? { ok: true, verified: true, shared: v.types.length > 1 }
    : { ok: false, why: tr('paymentType della richiesta non contiene ', 'paymentType of the request does not include ') + METHODS[id].paymentType + '.' };
}

function selectMethod(id) {
  if (id === state.method) return;
  state.method = id;
  state.height = METHODS[id].band.rec;
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. ENGINE
   ═══════════════════════════════════════════════════════════════════════════ */
const PLACEHOLDER_URL = 'https://sandbox-web.axerve.com/orchestra/checkout/a/…';

function go() {
  const resolved = B.resolveLink(B.Session.values());
  if (!resolved.ok) { showMessage(resolved.error, 'error'); return; }
  showMessage('');
  if (state.target === 'self') window.location.assign(resolved.url);
  else window.open(resolved.url, '_blank', 'noopener,noreferrer');
}

function renderTabs() {
  $('methodTabs').replaceChildren(...IDS.map((id) => {
    const a = availability(id);
    const b = B.el('button', 'tabs__item', METHODS[id].name);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(id === state.method && a.ok));
    b.disabled = !a.ok;
    if (!a.ok) b.title = a.why;
    b.addEventListener('click', () => { selectMethod(id); renderAll(); });
    return b;
  }));
}

function renderControls() {
  $('controls').replaceChildren(...cur().controls.map((c) => {
    const wrap = B.el('div', 'field');
    const id = 'ctl-' + c.id;
    const label = B.el('label', null, c.label);
    label.htmlFor = id;
    let input;
    if (c.text) {
      input = B.el('input', 'input input--sans');
      input.type = 'text';
      input.maxLength = 40;
    } else {
      input = B.el('select', 'select');
      c.options.forEach(([value, text]) => input.append(Object.assign(B.el('option', null, text), { value })));
    }
    input.id = id;
    input.value = cfg()[c.id];
    input.addEventListener('input', () => { cfg()[c.id] = input.value; renderOutput(); });
    wrap.append(label, input);
    return wrap;
  }));
}

function renderSpecimen(a) {
  if (!a.ok) {
    const empty = B.el('div', 'mount__empty');
    empty.innerHTML = B.ICONS.cube;   /* constant markup */
    empty.append(B.el('span', null, tr('Nessun pulsante per questa richiesta. ', 'No button for this request. ') + a.why));
    $('specimen').replaceChildren(empty);
    return;
  }
  const node = cur().build(cfg(), state.height);
  const slot = B.el('div', 'specimen__slot');
  slot.style.width = state.width + 'px';
  slot.append(node);
  node.addEventListener('click', go);
  $('specimen').replaceChildren(slot);
}

function renderNotes(a) {
  const m = cur();
  const h = state.height;
  const v = B.Session.values();
  const notes = a.ok ? m.notes(cfg(), { surface: state.surface, height: h }) : [];
  if (a.ok && ((m.band.min !== null && h < m.band.min) || (m.band.max !== null && h > m.band.max))) {
    notes.unshift({ tone: 'danger', text: tr('Altezza fuori dai limiti del brand. ', 'Height outside the brand’s limits. ') + m.band.rule });
  }
  if (a.ok && !a.verified) {
    notes.unshift({ tone: 'warning', text: tr('Non verificabile: con valori inseriti a mano il banco non sa per quale metodo è stato creato il link. Il pulsante ' + m.name + ' è corretto solo se la richiesta aveva paymentType ' + m.paymentType + '.',
                                              'Cannot be verified: with values entered by hand the bench does not know which method the link was created for. The ' + m.name + ' button is right only if the request had paymentType ' + m.paymentType + '.') });
  }
  if (a.ok && a.shared) {
    notes.unshift({ tone: 'warning', text: tr('paymentType contiene più metodi: il link porta alla pagina di selezione Fabrick, non direttamente a ' + m.name + '. Per il redirect diretto lascia un solo valore.',
                                              'paymentType lists several methods: the link leads to the Fabrick selection page, not straight to ' + m.name + '. For a direct redirect keep a single value.') });
  }
  if (a.ok && v.origin === 'created' && !v.sent) {
    notes.unshift({ tone: 'info', text: tr('Il pulsante è un’anteprima: invia la richiesta payment/create per ottenere il link da metterci sotto.', 'The button is a preview: send the payment/create request to get the link that goes under it.') });
  }
  /* Note text interpolates what the tester typed (the button copy): it is
     written with textContent, never as markup. */
  $('notes').replaceChildren(...notes.map((n) => {
    const box = B.el('div', 'admonition admonition--' + n.tone);
    box.append(B.el('p', null, n.text));
    return box;
  }));
}

function renderMeta() {
  const m = cur();
  const resolved = B.resolveLink(B.Session.values());
  const linkState = !resolved.ok ? tr('link non ancora disponibile', 'link not available yet')
    : resolved.source === 'response' ? tr('link restituito da Fabrick', 'link returned by Fabrick')
    : resolved.source === 'pasted' ? tr('link incollato', 'pasted link')
    : tr('link ricostruito', 'rebuilt link');
  $('methodLine').replaceChildren('paymentType ', B.el('code', null, m.paymentType), ' · ' + linkState);
  $('heightHint').textContent = m.band.rule;
  $('height').value = state.height;
  $('heightValue').textContent = state.height;
  $('widthValue').textContent = state.width;
}

function renderRules() {
  const m = cur();
  $('rulesTitle').textContent = tr('Linee guida ', 'Guidelines: ') + m.name;
  /* Rules are constant markup from the registry above. */
  $('rules').replaceChildren(...m.rules.map((r) => B.admonition(r.tone, r.title, r.html)));
  $('sources').replaceChildren(...m.sources.map((s) => {
    const li = B.el('li');
    const a = B.el('a', 'break', s.url);
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    li.append(a, B.el('br'), s.note);
    return li;
  }));
  const fabrick = B.el('li');
  const doc = B.el('a', null, tr('Documentazione Fabrick del metodo', 'Fabrick documentation for the method'));
  doc.href = B.DOCS[m.docKey];
  doc.target = '_blank';
  doc.rel = 'noopener noreferrer';
  fabrick.append(doc);
  $('sources').append(fabrick, B.el('li', 'muted', tr('Pagine dei brand lette l’ultima volta il ' + CHECKED + ': le regole possono essere cambiate.', 'Brand pages last read on ' + CHECKED + ': the rules may have changed.')));
}

const code = B.codeCard($('codeHost'), () => {
  const resolved = B.resolveLink(B.Session.values());
  return [{
    name: state.method + '-button.html', mime: 'text/html',
    code: cur().snippet(cfg(), state.height, resolved.ok ? resolved.url : PLACEHOLDER_URL),
  }];
});

/* What changes with every option; controls and rules change only with the brand. */
function renderOutput() {
  const a = availability(state.method);
  renderSpecimen(a);
  renderNotes(a);
  renderMeta();
  code.refresh();
}
function renderAll() {
  renderTabs();
  renderControls();
  renderRules();
  renderOutput();
}

/* The session decides which brands exist. When the one on screen stops being
   available — the body now names another method — the page follows the
   request instead of showing a button the link cannot serve. */
let lastTypes = null;
function onSession() {
  const v = B.Session.values();
  const signature = v.origin + '|' + JSON.stringify(v.types);
  if (signature !== lastTypes) {
    lastTypes = signature;
    if (!availability(state.method).ok) {
      const first = IDS.find((id) => availability(id).ok);
      if (first) selectMethod(first);
    }
    /* Keeps the picker in step with a paymentType typed by hand. */
    if (Array.isArray(v.types) && v.types.length === 1 && byType(v.types[0])) brandSelect.value = byType(v.types[0]);
    renderAll();
    return;
  }
  renderOutput();
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. WIRING
   ═══════════════════════════════════════════════════════════════════════════ */
$('height').addEventListener('input', (e) => { state.height = Number(e.target.value); renderOutput(); });
$('width').addEventListener('input', (e) => { state.width = Number(e.target.value); renderOutput(); });

const surfaceButtons = Array.from($('surfaceSeg').querySelectorAll('.seg__btn'));
surfaceButtons.forEach((b) => b.addEventListener('click', () => {
  state.surface = b.dataset.surface;
  surfaceButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $('mount').dataset.surface = state.surface;
  renderOutput();
}));

document.querySelectorAll('input[name="target"]').forEach((r) => r.addEventListener('change', () => { state.target = r.value; }));
document.addEventListener('bench:session', onSession);

/* On load the page follows whatever the stored body already names. */
(function initialMethod() {
  const v = B.Session.values();
  const known = Array.isArray(v.types) ? v.types.map(byType).filter(Boolean) : [];
  if (known.length) { state.method = known[0]; state.height = METHODS[known[0]].band.rec; }
  brandSelect.value = state.method;
})();
onSession();

})();
