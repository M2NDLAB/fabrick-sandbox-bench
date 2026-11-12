/* ═══════════════════════════════════════════════════════════════════════════
   webcomponents.js — webcomponents.html

   A DECLARATIVE REGISTRY
   COMPONENTS is a transcription of the "Componenti disponibili" tables of the
   Web Components documentation: tag, attributes, allowed values, defaults. The
   page is generated from it — picker, attribute controls, mounted element and
   generated code — so a new component or attribute is one entry here and
   nothing else.

   WHAT THE COMPONENT DOES NOT HAVE
   No callback. The current documentation is explicit: the component carries
   the whole flow through and Fabrick redirects the buyer at the end. The only
   thing the page can listen to is the fbk-elements-error event, for errors
   that do not interrupt the transaction.

   WHY REMOUNT INSTEAD OF setAttribute
   A custom element reads its attributes when it is connected to the DOM and is
   not guaranteed to observe later changes. Changing an attribute on a mounted
   component and seeing nothing happen looks like a bug in the bench; replacing
   the element makes every change visible.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

const B = window.Bench;
const $ = B.$;
const tr = B.tr;
const Logger = B.createLogger('FABRICK-WC');

B.boot('webcomponents');
B.Session.mount($('sessionFields'), {
  page: 'webcomponents',
  modes: ['create', 'manual'],
  manual: ['ids'],
  /* No paymentChannel: the component needs paymentID and paymentToken only. */
  template: (shopLogin) => ({ shopLogin, amount: '100', currency: 'EUR', shopTransactionID: 'FBK_OrderID' }),
});
B.returnBanner($('returnHost'));
B.detailCard($('detailCard'));

const showMessage = B.statusLine($('statusMessage'));

/* ═══════════════════════════════════════════════════════════════════════════
   1. REGISTRY
   `wallet` marks an attribute that styles an Apple Pay or Google Pay button:
   those buttons are drawn only after the wallet has been configured for the
   domain, and the control says so, because an attribute with no visible effect
   is otherwise read as broken.
   ═══════════════════════════════════════════════════════════════════════════ */
const APPLE_STYLES = ['black', 'white', 'white-outline'];
const GOOGLE_STYLES = ['black', 'white'];
const BUTTON_TYPES = ['plain', 'buy', 'pay'];
const LAYOUT = { name: 'layout', values: ['horizontal', 'vertical'], def: 'horizontal', about: tr('Struttura del form carta', 'Layout of the card form') };

const COMPONENTS = Object.freeze({
  'fbk-checkout': {
    about: tr('Tutti i metodi abilitati sullo Shop Login in un’unica interfaccia. È il componente consigliato.', 'Every method enabled on the Shop Login in a single interface. This is the recommended component.'),
    attrs: [
      LAYOUT,
      { name: 'apple-button-style', values: APPLE_STYLES, def: 'black', about: tr('Aspetto del pulsante Apple Pay', 'Appearance of the Apple Pay button'), wallet: true },
      { name: 'apple-button-type', values: BUTTON_TYPES, def: 'plain', about: tr('Etichetta del pulsante Apple Pay', 'Label of the Apple Pay button'), wallet: true },
      { name: 'google-button-style', values: GOOGLE_STYLES, def: 'black', about: tr('Aspetto del pulsante Google Pay', 'Appearance of the Google Pay button'), wallet: true },
      { name: 'google-button-type', values: BUTTON_TYPES, def: 'plain', about: tr('Etichetta del pulsante Google Pay', 'Label of the Google Pay button'), wallet: true },
    ],
  },
  'fbk-card': {
    about: tr('Dati carta e Click to Pay, se abilitato. Per il pagamento con carta senza Apple Pay e Google Pay.', 'Card data and Click to Pay, if enabled. For card payments without Apple Pay and Google Pay.'),
    attrs: [LAYOUT],
  },
  'fbk-apple-pay': {
    about: tr('Pulsante Apple Pay standalone. Su dispositivi non Apple il pagamento prosegue con un QR Code.', 'Standalone Apple Pay button. On non-Apple devices the payment continues with a QR code.'),
    attrs: [
      { name: 'button-style', values: APPLE_STYLES, def: 'black', about: tr('Aspetto del pulsante', 'Appearance of the button'), wallet: true },
      { name: 'button-type', values: BUTTON_TYPES, def: 'plain', about: tr('Etichetta del pulsante', 'Label of the button'), wallet: true },
    ],
  },
  'fbk-google-pay': {
    about: tr('Pulsante Google Pay standalone.', 'Standalone Google Pay button.'),
    attrs: [
      { name: 'button-style', values: GOOGLE_STYLES, def: 'black', about: tr('Aspetto del pulsante', 'Appearance of the button'), wallet: true },
      { name: 'button-type', values: BUTTON_TYPES, def: 'plain', about: tr('Etichetta del pulsante', 'Label of the button'), wallet: true },
    ],
  },
});
const TAGS = Object.keys(COMPONENTS);

/* ═══════════════════════════════════════════════════════════════════════════
   2. STATE
   Kept in sessionStorage: a 3DS challenge or an APM leaves the page and comes
   back through a redirect, and the tester should find the configuration they
   left, not the defaults.
   ═══════════════════════════════════════════════════════════════════════════ */
const CONFIG_KEY = 'fbk:bench:wc:config';

const state = { tag: TAGS[0], attrs: {}, shopMode: 'js', width: '100%', surface: 'auto', mounted: false };
TAGS.forEach((t) => {
  state.attrs[t] = {};
  COMPONENTS[t].attrs.forEach((a) => { state.attrs[t][a.name] = a.def; });
});

(function restore() {
  let saved;
  try { saved = JSON.parse(B.session.get(CONFIG_KEY) || 'null'); } catch (e) { saved = null; }
  if (!saved) return;
  /* Every restored value is checked against the registry: a stale or
     hand-edited entry must not put an unknown tag or value on the page. */
  if (TAGS.indexOf(saved.tag) >= 0) state.tag = saved.tag;
  if (saved.shopMode === 'attr') state.shopMode = 'attr';
  if (['100%', '480px', '360px'].indexOf(saved.width) >= 0) state.width = saved.width;
  if (['auto', 'light', 'dark'].indexOf(saved.surface) >= 0) state.surface = saved.surface;
  TAGS.forEach((t) => COMPONENTS[t].attrs.forEach((a) => {
    const v = saved.attrs && saved.attrs[t] && saved.attrs[t][a.name];
    if (a.values.indexOf(v) >= 0) state.attrs[t][a.name] = v;
  }));
})();

const persist = () => B.session.set(CONFIG_KEY, JSON.stringify({
  tag: state.tag, attrs: state.attrs, shopMode: state.shopMode, width: state.width, surface: state.surface,
}));

/* Attributes that differ from the documented default: the only ones worth
   writing on the tag and in the generated code. */
const customAttrs = () => COMPONENTS[state.tag].attrs
  .filter((a) => state.attrs[state.tag][a.name] !== a.def)
  .map((a) => [a.name, state.attrs[state.tag][a.name]]);

/* ═══════════════════════════════════════════════════════════════════════════
   3. EVENT LOG
   ═══════════════════════════════════════════════════════════════════════════ */
const logList = $('eventLog');

function paintEmptyLog() {
  if (!logList.children.length) logList.append(B.el('li', 'log__empty', tr('Nessun evento. Monta un componente per iniziare.', 'No events. Mount a component to begin.')));
}
function logEvent(text, tone) {
  const empty = logList.querySelector('.log__empty');
  if (empty) empty.remove();
  const li = B.el('li');
  li.append(B.el('time', null, B.clock()), B.el('span', 'msg' + (tone ? ' is-' + tone : ''), text));
  logList.append(li);
}
$('clearLog').addEventListener('click', () => { logList.replaceChildren(); paintEmptyLog(); });
paintEmptyLog();

/* Registered once at start-up, not on mount: an error emitted while the
   component is still initialising would otherwise be missed. event.detail
   comes from the SDK and is written with textContent. */
window.addEventListener('fbk-elements-error', (event) => {
  const d = event.detail || {};
  logEvent('fbk-elements-error · ' + [d.code, d.title, d.message].filter(Boolean).join(' · '), 'error');
  Logger.error('fbk-elements-error', { detail: d });
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. MOUNT / UNMOUNT
   ═══════════════════════════════════════════════════════════════════════════ */
const mountBox = $('mount');
const mountInner = $('mountInner');

function paintPlaceholder() {
  const box = B.el('div', 'mount__empty');
  box.innerHTML = B.ICONS.cube;
  box.append(B.el('span', null, tr('Crea la richiesta o inserisci i valori, poi premi «Monta componente»', 'Create the request or enter the values, then press “Mount component”')));
  mountInner.replaceChildren(box);
}

function unmount(silent) {
  if (state.mounted && !silent) logEvent('<' + state.mountedTag + '> ' + tr('smontato', 'unmounted'));
  state.mounted = false;
  state.mountedTag = null;
  paintPlaceholder();
}

function mount() {
  const v = B.Session.values();
  const errors = B.Session.validateIds(v);
  if (errors.length) { showMessage(tr('Non posso montare il componente: ', 'Cannot mount the component: ') + errors.join(', ') + '.', 'error'); return false; }

  /* The script in the <head> registers the elements. If it was blocked or
     failed to load, creating the tag would give an inert unknown element and
     an empty box with no explanation. */
  if (!window.customElements || !customElements.get(state.tag)) {
    showMessage(tr('Il componente <' + state.tag + '> non è registrato: lo script fbk-elements.js non è stato caricato. Controlla la rete, un eventuale blocco del browser e la console.', 'The <' + state.tag + '> component is not registered: the fbk-elements.js script did not load. Check the network, any browser blocking and the console.'), 'error');
    Logger.error('Custom element non registrato', { tag: state.tag, script: B.SANDBOX.elementsSdk });
    return false;
  }

  unmount(true);
  mountInner.replaceChildren();

  /* shopLogin must be in place BEFORE the element is connected. In "js" mode
     it goes on the object the SDK exposes; in "attr" mode it travels on the
     tag and the global is left alone, so the test really exercises the
     attribute. */
  if (state.shopMode === 'js') {
    window['fbk-elements'] = window['fbk-elements'] || {};
    window['fbk-elements'].shop = v.shopLogin;
  }

  const node = document.createElement(state.tag);
  if (state.shopMode === 'attr') node.setAttribute('shop-login', v.shopLogin);
  node.setAttribute('payment-id', v.paymentID);
  node.setAttribute('payment-token', v.paymentToken);
  const extras = customAttrs();
  extras.forEach(([name, value]) => node.setAttribute(name, value));

  mountInner.append(node);
  state.mounted = true;
  state.mountedTag = state.tag;
  mountedFor = v.paymentID + '|' + v.paymentToken;

  logEvent('<' + state.tag + '> ' + (extras.length ? tr('montato con ', 'mounted with ') + extras.map((e) => e[0] + '="' + e[1] + '"').join(' ') : tr('montato con gli attributi di default', 'mounted with the default attributes')), 'ok');
  Logger.info('<' + state.tag + '> montato', {
    'Parametri': { shopLogin: v.shopLogin, paymentID: v.paymentID, paymentToken: B.maskToken(v.paymentToken), shopMode: state.shopMode },
    'Attributi non di default': Object.fromEntries(extras),
  });
  showMessage(tr('Componente montato. Completa il pagamento nell’anteprima con una carta di test.', 'Component mounted. Complete the payment in the preview with a test card.'), 'info', { transient: true });
  return true;
}

/* A change made while a component is on the page is applied by remounting. */
const remountIfMounted = () => { if (state.mounted) mount(); };

/* A component on screen belongs to one transaction. When the payment data
   changes underneath it — new request, cleared values, other tab — it is
   taken down: left there, it would look like the new transaction's component. */
let mountedFor = '';
document.addEventListener('bench:session', () => {
  const v = B.Session.values();
  if (state.mounted && mountedFor !== v.paymentID + '|' + v.paymentToken) { unmount(false); showMessage(''); }
});

$('mountBtn').addEventListener('click', mount);
$('unmountBtn').addEventListener('click', () => { unmount(false); showMessage(''); });

/* ═══════════════════════════════════════════════════════════════════════════
   5. CONTROLS
   ═══════════════════════════════════════════════════════════════════════════ */
function renderPicker() {
  const host = $('componentPicker');
  host.replaceChildren(...TAGS.map((tag) => {
    const label = B.el('label', 'chip');
    const input = B.el('input');
    input.type = 'radio';
    input.name = 'component';
    input.value = tag;
    input.checked = tag === state.tag;
    input.addEventListener('change', () => {
      state.tag = tag;
      persist();
      renderAttrs();
      code.refresh();
      remountIfMounted();
    });
    label.append(input, B.el('code', null, '<' + tag + '>'));
    return label;
  }));
}

function renderAttrs() {
  const def = COMPONENTS[state.tag];
  $('componentAbout').textContent = def.about;

  $('attrFields').replaceChildren(...def.attrs.map((a) => {
    const wrap = B.el('div', 'field');
    const id = 'attr-' + a.name;
    const label = B.el('label');
    label.htmlFor = id;
    label.append(B.el('code', null, a.name));
    const select = B.el('select', 'select');
    select.id = id;
    a.values.forEach((value) => {
      const opt = B.el('option', null, value + (value === a.def ? ' (default)' : ''));
      opt.value = value;
      select.append(opt);
    });
    select.value = state.attrs[state.tag][a.name];
    select.addEventListener('change', () => {
      state.attrs[state.tag][a.name] = select.value;
      persist();
      code.refresh();
      remountIfMounted();
    });
    wrap.append(label, select, B.el('small', 'hint', a.about + (a.wallet ? tr(' · richiede la configurazione del wallet', ' · needs the wallet to be configured') : '')));
    return wrap;
  }));
}

document.querySelectorAll('input[name="shopMode"]').forEach((radio) => {
  radio.checked = radio.value === state.shopMode;
  radio.addEventListener('change', () => {
    state.shopMode = radio.value;
    persist();
    code.refresh();
    remountIfMounted();
  });
});

/* Segmented controls: one handler, the data attribute names the state key. */
function wireSeg(hostId, key, apply) {
  const buttons = Array.from($(hostId).querySelectorAll('.seg__btn'));
  const paint = () => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[key] === state[key])));
  buttons.forEach((b) => b.addEventListener('click', () => {
    state[key] = b.dataset[key];
    persist();
    paint();
    apply();
  }));
  paint();
  apply();
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. GENERATED CODE
   Two shapes, matching the two ways the documentation sets the shopLogin.
   Comments in generated code are English, like all code in this project.
   ═══════════════════════════════════════════════════════════════════════════ */
function generate() {
  const v = B.Session.values();
  const shop = v.shopLogin || 'GESPAY12345';
  const id = v.paymentID || 'PAYMENT_ID';
  const token = v.paymentToken || 'PAYMENT_TOKEN';
  const tag = state.tag;
  const extras = customAttrs();
  const sized = state.width !== '100%';
  const open = sized ? '    <div style="max-width: ' + state.width + '">\n' : '';
  const close = sized ? '    </div>\n' : '';
  const pad = sized ? '      ' : '    ';
  const errorListener =
    '      // Errors that do not interrupt the transaction: show them to the buyer.\n' +
    '      window.addEventListener("fbk-elements-error", (event) => {\n' +
    '        const { code, title, message } = event.detail;\n' +
    '        console.warn(code, title, message);\n' +
    '      });\n';
  const head =
    '<!DOCTYPE html>\n<html lang="it">\n  <head>\n' +
    '    <meta charset="UTF-8" />\n' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    '    <title>Checkout — Fabrick Web Components</title>\n\n';

  let html;
  if (state.shopMode === 'attr') {
    /* Static tag: the shopLogin travels on the element itself. */
    const attrLines = [['shop-login', shop], ['payment-id', id], ['payment-token', token]].concat(extras)
      .map(([n, val]) => pad + '  ' + n + '="' + B.esc(val) + '"').join('\n');
    html = head +
      '    <!-- Fabrick script in the <head>: it registers the components before the tag is parsed.\n' +
      '         Production: https://web.axerve.com/orchestra/checkout/assets/elements/fbk-elements.js -->\n' +
      '    <script src="' + B.SANDBOX.elementsSdk + '"><\/script>\n\n' +
      '    <script>\n' + errorListener + '    <\/script>\n' +
      '  </head>\n  <body>\n' +
      '    <!-- payment-id and payment-token come from your server (payment/create). -->\n' +
      open +
      pad + '<' + tag + '\n' + attrLines + '>\n' +
      pad + '</' + tag + '>\n' +
      close +
      '  </body>\n</html>\n';
  } else {
    /* Script-created element: shopLogin on window['fbk-elements'] once the
       SDK has loaded, then the component is created and attached. */
    const setLines = [['payment-id', 'paymentID'], ['payment-token', 'paymentToken']]
      .map(([n, variable]) => '        component.setAttribute("' + n + '", ' + variable + ');')
      .concat(extras.map(([n, val]) => '        component.setAttribute("' + n + '", ' + B.jsLiteral(val) + ');'))
      .join('\n');
    html = head +
      '    <script>\n' +
      '      // Runs once fbk-elements.js has loaded\n' +
      '      function initFabrickElements() {\n' +
      '        // shopLogin must be set before the component is mounted\n' +
      '        window["fbk-elements"].shop = ' + B.jsLiteral(shop) + ';\n\n' +
      '        if (document.readyState === "loading") {\n' +
      '          document.addEventListener("DOMContentLoaded", mountComponent);\n' +
      '        } else {\n' +
      '          mountComponent();\n' +
      '        }\n' +
      '      }\n\n' +
      '      function mountComponent() {\n' +
      '        // Sample values: in production they come from your server (payment/create)\n' +
      '        const paymentID    = ' + B.jsLiteral(id) + ';\n' +
      '        const paymentToken = ' + B.jsLiteral(token) + ';\n\n' +
      '        const component = document.createElement("' + tag + '");\n' +
      setLines + '\n' +
      '        document.getElementById("payment-container").appendChild(component);\n' +
      '      }\n\n' +
      errorListener +
      '    <\/script>\n\n' +
      '    <!-- Fabrick script with onload.\n' +
      '         Production: https://web.axerve.com/orchestra/checkout/assets/elements/fbk-elements.js -->\n' +
      '    <script\n' +
      '      src="' + B.SANDBOX.elementsSdk + '"\n' +
      '      onload="initFabrickElements()">\n' +
      '    <\/script>\n' +
      '  </head>\n  <body>\n' +
      '    <div id="payment-container"' + (sized ? ' style="max-width: ' + state.width + '"' : '') + '></div>\n' +
      '  </body>\n</html>\n';
  }
  return [{ name: 'checkout.html', mime: 'text/html', code: html }];
}

const code = B.codeCard($('codeHost'), generate);
document.addEventListener('bench:session', () => code.refresh());

/* ═══════════════════════════════════════════════════════════════════════════
   START
   ═══════════════════════════════════════════════════════════════════════════ */
renderPicker();
renderAttrs();
paintPlaceholder();
/* Wired last: both handlers run once immediately to apply the restored state,
   and the width handler refreshes the code card, which must already exist. */
wireSeg('widthSeg', 'width', () => { mountInner.style.maxWidth = state.width; code.refresh(); });
wireSeg('surfaceSeg', 'surface', () => { mountBox.dataset.surface = state.surface; });

Logger.info('Fabrick Web Components Test pronta', {
  'Script': B.SANDBOX.elementsSdk,
  'Componenti registrati': Object.fromEntries(TAGS.map((t) => [t, !!(window.customElements && customElements.get(t))])),
});

})();
