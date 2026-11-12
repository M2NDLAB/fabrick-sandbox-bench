/* ═══════════════════════════════════════════════════════════════════════════
   lightbox.js — lightbox.html

   SECTIONS
     1. Masking         the payment token never appears whole in a log
     2. SDK loader      default script, custom https URL, or pasted code
     3. Custom JS       the dialog that edits the pasted SDK
     4. Probes          passive observers of what the SDK does
     5. Form            validation, open(), callback, watchdog
     6. Integration     the back of the card: generated, editable code

   Console filter: type "FABRICK-LB" in the DevTools console filter box.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

const B = window.Bench;
const $ = B.$;
const tr = B.tr;
const Logger = B.createLogger('FABRICK-LB');

B.boot('lightbox');
B.Session.mount($('sessionFields'), {
  page: 'lightbox',
  modes: ['create', 'manual'],
  manual: ['ids'],
  /* No paymentChannel: with it Fabrick prepares a hosted link, and the
     Lightbox needs only paymentID and paymentToken. */
  template: (shopLogin) => ({ shopLogin, amount: '100', currency: 'EUR', shopTransactionID: 'FBK_OrderID' }),
});
B.returnBanner($('returnHost'));
B.detailCard($('detailCard'));

const showMessage = B.statusLine($('statusMessage'));

/* ═══════════════════════════════════════════════════════════════════════════
   1. MASKING
   The token is masked wherever it shows up: as a value and inside URLs.
   ═══════════════════════════════════════════════════════════════════════════ */
let currentToken = null;
const maskToken = B.maskToken;
const maskInText = (text) => (currentToken && text ? String(text).split(currentToken).join(maskToken(currentToken)) : text);

/* Splits a URL into readable parts: the fastest way to spot "/a/undefined/". */
function describeUrl(rawUrl) {
  try {
    const u = new URL(rawUrl, window.location.href);
    return {
      origin: u.origin,
      path: maskInText(u.pathname),
      query: maskInText(u.search) || '(nessuna)',
      segments: u.pathname.split('/').filter(Boolean).map(maskInText).join(' / '),
    };
  } catch (e) { return { raw: maskInText(rawUrl) }; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. SDK LOADER
   Three modes, in priority order:
     1. Custom JS   code pasted or uploaded through the dialog, run inline
     2. Custom URL  an https URL typed in the "Script SDK" field
     3. Default     the sandbox Lightbox script from the documentation

   Why this page loads the SDK from script instead of a static <script> tag:
   the point of the page is to compare SDK builds, and the choice has to be
   made before the script runs. The pay button stays disabled until loading
   has finished, which gives the same guarantee as a tag in the <head>.

   Everything is stored in localStorage and NEVER read from the query string:
   a link crafted by a third party (?sdk=https://evil/x.js) must not be able to
   run arbitrary code on this page's origin.
   ═══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_SDK_URL = B.SANDBOX.lightboxSdk;
const SDK_URL_KEY = 'fbk:bench:lb:sdkUrl';
const CUSTOM_JS_KEY = 'fbk:bench:lb:customJs';
const CUSTOM_JS_SOURCE_URL = 'fabrick-lb-custom-sdk.js';   /* name shown in DevTools → Sources */

/* Absolute https URLs only: rules out http (mixed content), javascript:,
   data: and relative paths. */
function isValidSdkUrl(value) {
  try { return new URL(value).protocol === 'https:'; } catch (e) { return false; }
}

const customJs = B.local.get(CUSTOM_JS_KEY);
const customSdkUrl = B.local.get(SDK_URL_KEY);
const SDK_MODE = customJs ? 'customJs' : (customSdkUrl && isValidSdkUrl(customSdkUrl)) ? 'customUrl' : 'default';
const ACTIVE_SDK_URL = SDK_MODE === 'customUrl' ? customSdkUrl : SDK_MODE === 'default' ? DEFAULT_SDK_URL : null;
/* One description of the source, used both in the UI and in the logs. */
const SDK_SOURCE_LABEL = SDK_MODE === 'customJs'
  ? 'Custom JS inline (' + (customJs.length / 1024).toFixed(1) + ' KB)'
  : ACTIVE_SDK_URL;

const sdkUrlInput = $('sdkUrl');
const sdkCurrent = $('sdkCurrent');
sdkUrlInput.placeholder = DEFAULT_SDK_URL;
sdkUrlInput.value = SDK_MODE === 'customUrl' ? ACTIVE_SDK_URL : '';

/* Which script is running is always visible: it is the one fact every test
   screenshot needs. */
function renderSdkStatus(state) {
  const pill = state === 'error' ? B.el('span', 'pill pill--err', tr('Errore', 'Error'))
    : SDK_MODE === 'customJs' ? B.el('span', 'pill pill--warn', 'Custom JS')
    : SDK_MODE === 'customUrl' ? B.el('span', 'pill pill--warn', 'Custom URL')
    : B.el('span', 'pill', 'Default');
  const suffix = state === 'loading' ? tr(' (caricamento…)', ' (loading…)') : state === 'error' ? tr(' (non caricato)', ' (not loaded)') : '';
  sdkCurrent.replaceChildren(pill, tr('In uso: ', 'In use: '), B.el('code', null, SDK_SOURCE_LABEL), suffix);
}

/* "Applica" makes the URL the active choice and removes the custom JS, which
   would otherwise keep winning on priority without the tester noticing. */
$('sdkApply').addEventListener('click', () => {
  const value = sdkUrlInput.value.trim();
  if (value && !isValidSdkUrl(value)) {
    Logger.warn('URL SDK rifiutato', { valore: value, motivo: 'deve essere un URL assoluto https' });
    showMessage(tr('URL SDK non valido: deve essere un URL assoluto https', 'Invalid SDK URL: it must be an absolute https URL'), 'error');
    return;
  }
  if (!B.local.set(SDK_URL_KEY, value) || !B.local.set(CUSTOM_JS_KEY, '')) {
    Logger.error('localStorage non disponibile: impossibile salvare la configurazione SDK');
    showMessage(tr('Impossibile salvare: localStorage non disponibile', 'Cannot save: localStorage is not available'), 'error');
    return;
  }
  window.location.reload();   /* mandatory: window.axerve cannot be replaced at runtime */
});

/* "Default" clears both the custom URL and the custom JS. */
$('sdkReset').addEventListener('click', () => {
  B.local.set(SDK_URL_KEY, '');
  B.local.set(CUSTOM_JS_KEY, '');
  window.location.reload();
});

function loadSdkFromUrl(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = false;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Impossibile caricare lo script SDK: ' + url));
    document.head.appendChild(s);
  });
}

/* An inline <script> runs SYNCHRONOUSLY on insertion and fires neither onload
   nor onerror. Syntax errors and first-run exceptions surface instead as an
   "error" event on window, listened to only for the duration of the insert.
   sourceURL gives the code a name in DevTools → Sources, with working
   breakpoints and readable stack traces. */
function loadSdkFromCode(code) {
  return new Promise((resolve, reject) => {
    let captured = null;
    const onError = (ev) => { captured = ev.error || new Error(ev.message); ev.preventDefault(); };
    window.addEventListener('error', onError);
    const s = document.createElement('script');
    s.textContent = code + '\n//# sourceURL=' + CUSTOM_JS_SOURCE_URL;
    document.head.appendChild(s);
    window.removeEventListener('error', onError);
    if (captured) reject(new Error('Errore nel custom JS: ' + captured.message));
    else resolve();
  });
}

renderSdkStatus('loading');
const sdkLoadStart = performance.now();
const sdkReady = SDK_MODE === 'customJs' ? loadSdkFromCode(customJs) : loadSdkFromUrl(ACTIVE_SDK_URL);

/* ═══════════════════════════════════════════════════════════════════════════
   3. CUSTOM JS DIALOG
   Open  → shows the code currently saved (view, copy, edit).
   Save  → syntax check, store, reload.
   ═══════════════════════════════════════════════════════════════════════════ */
const jsDialog = $('customJsDialog');
const jsCode = $('customJsCode');
const jsMeta = $('customJsMeta');
const jsChecks = $('customJsChecks');
const jsFile = $('customJsFile');

/* Syntax check WITHOUT running: new Function compiles the body, never calls it. */
function checkSyntax(code) {
  try { new Function(code); return null; } catch (e) { return e; }   // eslint-disable-line no-new-func
}

/* Light static analysis: flags what changes the meaning of the test. */
function analyzeCode(code) {
  const checks = [];
  if (!code.trim()) return checks;

  const syntaxError = checkSyntax(code);
  checks.push(syntaxError
    ? { level: 'error', text: tr('Errore di sintassi: ', 'Syntax error: ') + syntaxError.message + tr('. Il codice non verrà salvato.', '. The code will not be saved.') }
    : { level: 'success', text: tr('Sintassi valida.', 'Valid syntax.') });

  if (/\/apple\/lightbox\//.test(code)) {
    checks.push({ level: 'info', text: tr('Versione legacy: contiene la route /apple/lightbox (apertura in nuova finestra su dispositivi Apple).', 'Legacy build: it contains the /apple/lightbox route (opens a new window on Apple devices).') });
  }
  if (!/axerve\.lightBox\.open\s*=/.test(code)) {
    checks.push({ level: 'warning', text: tr('Non trovo la definizione di axerve.lightBox.open: la pagina potrebbe non riuscire ad aprire la lightbox.', 'No definition of axerve.lightBox.open found: the page may be unable to open the lightbox.') });
  }
  const hosts = Array.from(new Set((code.match(/https:\/\/[a-z0-9.-]+/gi) || []).map((h) => h.toLowerCase())));
  if (hosts.length) checks.push({ level: 'info', text: tr('Host referenziati: ', 'Hosts referenced: ') + hosts.join(', ') });
  return checks;
}

function renderJsAnalysis() {
  const code = jsCode.value;
  const lines = code ? code.split('\n').length : 0;
  jsMeta.textContent = code
    ? (code.length / 1024).toFixed(1) + ' KB · ' + lines + tr(' righe', ' lines')
    : tr('Nessun codice. Salvando vuoto il custom JS viene rimosso.', 'No code. Saving it empty removes the custom JS.');
  /* textContent throughout: the pasted code is never interpreted as HTML. */
  jsChecks.replaceChildren(...analyzeCode(code).map((c) => B.el('div', 'status status--' + c.level, c.text)));
}

/* Debounced: the analysis compiles the code, which is not something to do on
   every keystroke of a large file. */
let analysisTimer = null;
jsCode.addEventListener('input', () => {
  clearTimeout(analysisTimer);
  analysisTimer = setTimeout(renderJsAnalysis, 250);
});

$('customJsOpen').addEventListener('click', () => {
  jsCode.value = B.local.get(CUSTOM_JS_KEY);   /* always reopens on the saved code, not on unsaved edits */
  renderJsAnalysis();
  jsDialog.showModal();
  jsCode.focus();
});

const closeDialog = () => jsDialog.close();
$('customJsClose').addEventListener('click', closeDialog);
$('customJsCancel').addEventListener('click', closeDialog);

$('customJsFileBtn').addEventListener('click', () => jsFile.click());
jsFile.addEventListener('change', async () => {
  const file = jsFile.files && jsFile.files[0];
  if (!file) return;
  jsCode.value = await file.text();
  jsFile.value = '';   /* lets the same file be loaded again */
  renderJsAnalysis();
  Logger.info('Custom JS: file caricato nella modale (' + file.name + ', ' + (file.size / 1024).toFixed(1) + ' KB)');
});

$('customJsCopy').addEventListener('click', (e) => {
  B.copyText(jsCode.value, e.currentTarget, () => jsCode.select());
});

$('customJsRemove').addEventListener('click', () => {
  B.local.set(CUSTOM_JS_KEY, '');
  window.location.reload();
});

$('customJsSave').addEventListener('click', () => {
  const code = jsCode.value;
  if (code.trim()) {
    const syntaxError = checkSyntax(code);
    if (syntaxError) {
      renderJsAnalysis();
      Logger.warn('Custom JS non salvato: errore di sintassi', { errore: syntaxError.message });
      return;   /* the dialog stays open with the error in view */
    }
  }
  if (!B.local.set(CUSTOM_JS_KEY, code.trim() ? code : '')) {
    jsChecks.prepend(B.el('div', 'status status--error', tr('Salvataggio fallito: localStorage non disponibile o spazio esaurito.', 'Save failed: localStorage is unavailable or full.')));
    return;
  }
  window.location.reload();   /* same reason as the URL: window.axerve must be defined from scratch */
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. PROBES
   They watch what the SDK does without changing its behaviour, and answer the
   questions support asks first:
     - which configuration did the server return (OrchestraHPPEnabled)?  fetch
     - which URL was the iframe created with (is shop set)?              DOM
     - did the legacy fallback axerve-gestpay.js kick in?                DOM
     - what did the lightbox send through postMessage?                   message
   ═══════════════════════════════════════════════════════════════════════════ */

/* fetch probe: intercepts PaymentPageConfiguration only and hands the original
   Response back untouched. */
if (typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function debugFetch(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (url.indexOf('PaymentPageConfiguration') < 0) return originalFetch(input, init);

    const t0 = performance.now();
    try {
      const response = await originalFetch(input, init);
      /* clone(): the body is read on a copy, so the SDK still receives a
         response it can read. */
      response.clone().json().then((body) => {
        const hpp = !!(body && body.payload && body.payload.OrchestraHPPEnabled);
        const title = 'PaymentPageConfiguration → HTTP ' + response.status + ' · OrchestraHPPEnabled=' + hpp + ' (' + Math.round(performance.now() - t0) + 'ms)';
        (response.ok ? Logger.net : Logger.warn)(title, {
          'URL': describeUrl(url),
          'Ramo SDK previsto': hpp ? 'iframe Orchestra (/sdk/lightbox)' : 'fallback legacy (axerve-gestpay.js)',
          'Body risposta': body,
        });
      }).catch(() => Logger.warn('PaymentPageConfiguration → HTTP ' + response.status + ', body non JSON'));
      return response;
    } catch (err) {
      Logger.error('PaymentPageConfiguration → errore di rete', {
        URL: describeUrl(url),
        errore: err && err.message,
        'Possibili cause': 'CORS, blocco rete/adblock, host errato per l’ambiente',
      });
      throw err;   /* rethrown: the SDK must see the failure exactly as it would without the probe */
    }
  };
}

/* DOM probe: logs creation and removal of the lightbox and of the legacy fallback. */
new MutationObserver((mutations) => {
  mutations.forEach((m) => {
    m.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      const iframe = node.id === 'lightBox_Iframe' ? node : node.querySelector && node.querySelector('#lightBox_Iframe');
      if (iframe) {
        const shopMissing = /\/a\/(undefined|null)?\//.test(iframe.src);
        (shopMissing ? Logger.error : Logger.dom)(
          shopMissing ? 'Iframe creato con SHOP MANCANTE (/a/undefined/): atteso 404' : 'Iframe lightbox creato',
          { 'URL iframe': describeUrl(iframe.src), 'allow': iframe.getAttribute('allow') }
        );
      }
      if (node.id === 'axerve_gestpay') Logger.dom('Fallback legacy: iniettato axerve-gestpay.js', { src: node.src });
    });
    m.removedNodes.forEach((node) => {
      if (node instanceof Element && node.id === 'axerve_lightBox') Logger.dom('Overlay lightbox rimosso');
    });
  });
}).observe(document.documentElement, { childList: true, subtree: true });

/* postMessage probe: a passive listener. It never calls the callback and does
   not interfere with the SDK's own receiver. */
const PAYMENT_HOSTS = /(^|\.)(axerve\.com|gestpay\.net|sella\.it)$/;
window.addEventListener('message', (ev) => {
  let host = '';
  try { host = new URL(ev.origin).hostname; } catch (e) { /* origin "null" or invalid */ }
  const trusted = PAYMENT_HOSTS.test(host);
  let parsed = ev.data;
  if (typeof ev.data === 'string') { try { parsed = JSON.parse(ev.data); } catch (e) { /* not JSON */ } }
  (trusted ? Logger.msg : Logger.info)(
    'postMessage da ' + ev.origin + (trusted ? '' : ' (host non di pagamento, ignorato dall’SDK)'),
    { origin: ev.origin, 'data (raw)': typeof ev.data === 'string' ? maskInText(ev.data) : ev.data, 'data (parsed)': parsed }
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   5. FORM
   ═══════════════════════════════════════════════════════════════════════════ */
const form = $('paymentForm');
const payButton = $('payButton');
const buttonText = $('buttonText');

let callbackTimeoutId = null;
const CALLBACK_TIMEOUT_MS = 60000;
let callbackEnabled = true;

function setLoading(isLoading) {
  payButton.disabled = isLoading;
  if (isLoading) buttonText.replaceChildren(B.el('span', 'spinner'), tr(' Apertura in corso…', ' Opening…'));
  else buttonText.textContent = tr('Apri Lightbox', 'Open Lightbox');
}

document.querySelectorAll('input[name="callbackMode"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    callbackEnabled = e.target.value === 'enabled';
    Logger.info('Callback JS ' + (callbackEnabled ? 'ABILITATA' : 'DISABILITATA (redirect Fabrick)'));
  });
});


/* Passed to open() as third argument. Returning false matches the reference
   page this module was ported from. */
function onLightboxResult(response) {
  if (callbackTimeoutId) { clearTimeout(callbackTimeoutId); callbackTimeoutId = null; }
  handleLightboxCallback(response);
  Logger.endAttempt();
  return false;
}

function handleLightboxCallback(responseOrEvent) {
  const isMessageEvent = responseOrEvent && typeof responseOrEvent === 'object' && 'data' in responseOrEvent && 'origin' in responseOrEvent;
  const response = isMessageEvent ? responseOrEvent.data : responseOrEvent;

  if (!response) {
    Logger.warn('Callback ricevuta senza payload', { response });
    showMessage(tr('Callback ricevuta ma payload vuoto', 'Callback received with an empty payload'), 'warning');
    return;
  }

  const status = response.status;
  /* The documentation spells it paymentId; both spellings are accepted because
     SDK builds have used either. */
  const paymentId = response.paymentId || response.paymentID;
  const err = response.error;
  const orAbsent = (v) => (v === undefined || v === null ? '(assente)' : v);

  const details = Object.assign({
    'Sintesi': {
      status: orAbsent(status),
      paymentId: orAbsent(paymentId),
      responseURL: orAbsent(response.responseURL),
      'error.code': orAbsent(err && err.code),
      'error.description': orAbsent(err && err.description),
    },
    'Response completa': response,
  },
  isMessageEvent ? { 'Origin evento': responseOrEvent.origin } : {},
  paymentId ? { 'Passo successivo': 'Verifica server-side con GET /payment/detail (paymentId ' + paymentId + ')' } : {});

  if (status === 'OK') {
    Logger.success('Callback: pagamento completato (OK)', details, { expanded: true });
    showMessage(tr('Pagamento completato con successo (OK). Conferma l’esito con «Verifica esito».', 'Payment completed successfully (OK). Confirm it with “Check the outcome”.'), 'success');
  } else if (status === 'KO') {
    const errMsg = (err && err.description) ? err.description : 'Pagamento rifiutato (KO)';
    Logger.error('Callback: pagamento fallito (KO) · ' + errMsg, details);
    showMessage(tr('Pagamento fallito: ', 'Payment failed: ') + errMsg, 'error');
  } else if (status === 'XX') {
    Logger.warn('Callback: pagamento in attesa di conferma (XX)', details, { expanded: true });
    showMessage(tr('Pagamento in attesa di conferma (XX): l’esito definitivo arriva con la notifica server-to-server.', 'Payment awaiting confirmation (XX): the final outcome arrives with the server-to-server notification.'), 'pending');
  } else if (err && err.code) {
    /* SDK errors (9991 unsupported browser, 9992 iframe not created,
       configuration errors) arrive without a status. */
    Logger.error('Callback: errore SDK ' + err.code + ' · ' + (err.description || ''), details);
    showMessage(tr('Errore ', 'Error ') + err.code + ': ' + (err.description || ''), 'error');
  } else {
    Logger.warn('Callback: status inatteso (' + String(status) + ')', details, { expanded: true });
    showMessage(tr('Status inatteso: ', 'Unexpected status: ') + String(status), 'warning');
  }
}

function openLightbox(shopLogin, paymentID, paymentToken) {
  const ax = window.axerve;
  if (!ax || !ax.lightBox || typeof ax.lightBox.open !== 'function') {
    throw new Error('Libreria Lightbox non caricata o incompleta. Controlla lo script SDK.');
  }

  ax.lightBox.shop = shopLogin;

  Logger.info('axerve.lightBox.open() invocato', {
    'Parametri': { shopLogin, paymentID, paymentToken: maskToken(paymentToken), callback: callbackEnabled ? 'onLightboxResult' : 'null (redirect)' },
    /* A snapshot, not the live object: the log must not change if the SDK
       mutates its state afterwards. */
    'Stato axerve.lightBox prima dell’apertura': {
      shop: ax.lightBox.shop,
      OrchestraHPPEnabled: ax.lightBox.OrchestraHPPEnabled,
      listenerAttached: ax.lightBox.listenerAttached,
      url: maskInText(ax.lightBox.url),
    },
  });

  /* Watchdog. A callback that never arrives has opposite causes — the buyer is
     still inside the pop-up, or the flow failed — and neither raises an error. */
  if (callbackTimeoutId) clearTimeout(callbackTimeoutId);
  callbackTimeoutId = setTimeout(() => {
    Logger.warn('Nessuna callback entro ' + CALLBACK_TIMEOUT_MS / 1000 + 's', {
      'Possibili cause': [
        'Callback disabilitata: l’esito arriva via redirect',
        'Utente ancora nella lightbox',
        'Lightbox in errore (controllare i gruppi NET/DOM sopra)',
        'Configurazione backoffice dello shop',
      ],
    });
    showMessage(tr('Nessuna callback entro ' + CALLBACK_TIMEOUT_MS / 1000 + ' secondi. Se il pop-up è ancora aperto è normale; altrimenti controlla la console.', 'No callback within ' + CALLBACK_TIMEOUT_MS / 1000 + ' seconds. That is normal if the pop-up is still open; otherwise check the console.'), 'warning');
  }, CALLBACK_TIMEOUT_MS);

  ax.lightBox.open(paymentID, paymentToken, callbackEnabled ? onLightboxResult : null);
  showMessage(tr('Lightbox aperta: completa il pagamento nel pop-up.', 'Lightbox open: complete the payment in the pop-up.'), 'info', { transient: true });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = B.Session.values();
  const errors = B.Session.validateIds(v);
  if (errors.length) {
    Logger.warn('Validazione fallita (' + errors.length + ' errori)', { errori: errors });
    showMessage(tr('Non posso aprire la Lightbox: ', 'Cannot open the Lightbox: ') + errors.join(', ') + '.', 'error');
    return;
  }

  currentToken = v.paymentToken;   /* from here on the token is masked inside logged URLs too */
  Logger.startAttempt('Nuovo tentativo di apertura lightbox', {
    'Contesto': {
      'SDK': SDK_SOURCE_LABEL,
      'SDK modalità': SDK_MODE,
      'Origin pagina': window.location.origin,
      'Callback': callbackEnabled ? 'abilitata' : 'disabilitata',
    },
  });

  try {
    setLoading(true);
    openLightbox(v.shopLogin, v.paymentID, v.paymentToken);
  } catch (err) {
    Logger.error('Apertura lightbox fallita', { messaggio: err && err.message, stack: err && err.stack });
    showMessage(tr('Errore: ', 'Error: ') + (err && err.message ? err.message : String(err)), 'error');
    Logger.endAttempt();
    if (callbackTimeoutId) { clearTimeout(callbackTimeoutId); callbackTimeoutId = null; }
  } finally {
    setLoading(false);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   6. INTEGRATION CODE (back of the "Dati pagamento" card)

   Shows the integration page matching what is being tested: shopLogin,
   paymentID, paymentToken, callback or redirect mode, and the SDK in use. The
   code follows the pattern of the Lightbox documentation: Fabrick script in
   the <head>, axerve.lightBox.shop set before open(), optional callback as
   third parameter.

   LIFECYCLE
     generated  the code rewrites itself as the form changes
     dirty      the text was edited: automatic regeneration stops, otherwise it
                would wipe the edits
     saved      stored in localStorage, survives a reload

   STRUCTURE
     File separati  index.html + style.css + app.js, three tabs
     File unico     one index.html with inline <style> and <script>
     The conversion works both ways. Pasting a complete page with inline
     CSS/JS into the HTML tab switches the view to "File unico" by itself.

   None of the code in this editor is executed by the page: it is text.
   ═══════════════════════════════════════════════════════════════════════════ */
const Integration = (() => {
  const STORAGE_KEY = 'fbk:bench:lb:integration';
  const FILE_NAMES = { html: 'index.html', css: 'style.css', js: 'app.js' };
  const MIME = { html: 'text/html', css: 'text/css', js: 'text/javascript' };
  const DOC_URL = B.DOCS.lightbox;

  const els = {
    flipper: $('payFlipper'),
    front: $('payFront'),
    back: $('payBack'),
    toggle: $('flipToggle'),
    toggleText: $('flipToggleText'),
    title: $('payCardTitle'),
    tabs: Array.from(document.querySelectorAll('#payBack [role="tab"]')),
    structureBtns: Array.from(document.querySelectorAll('#payBack [data-structure]')),
    editors: { html: $('code-html'), css: $('code-css'), js: $('code-js') },
    state: $('codeState'),
    meta: $('codeMeta'),
    note: $('codeNote'),
    copy: $('codeCopy'),
    download: $('codeDownload'),
    regenerate: $('codeRegenerate'),
    save: $('codeSave'),
  };

  const state = {
    mode: 'split',          /* 'split' | 'single' */
    tab: 'html',            /* 'html' | 'css' | 'js' */
    source: 'generated',    /* 'generated' | 'saved' */
    dirty: false,
    savedAt: null,
  };

  /* ── Text utilities ── */

  const escAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const indent = (text, spaces) => {
    const pad = ' '.repeat(spaces);
    return text.split('\n').map((l) => (l.trim() ? pad + l : l)).join('\n');
  };

  /* Removes the common indentation: content pulled out of a nested <style>
     should not carry four leading spaces on every line. */
  const dedent = (text) => {
    const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
    const widths = lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
    const min = widths.length ? Math.min.apply(null, widths) : 0;
    return lines.map((l) => l.slice(min)).join('\n');
  };

  /* ── Generation from the form ── */

  /* The values of the current transaction, or the documentation's sample
     values while there is none: the code must be readable from the start. */
  function formValues() {
    const v = B.Session.values();
    const ready = !!(v.paymentID && v.paymentToken);
    return {
      shop: v.shopLogin || 'GESPAY12345',
      id: ready ? v.paymentID : '1881129911957',
      token: ready ? v.paymentToken : 'f0419188-8a78-4918-913c-a491e4e78084',
      isExample: !ready || !v.shopLogin,
      callback: callbackEnabled,
    };
  }

  /* With a Custom JS the test page runs pasted code, which has no URL: the
     generated integration points at the default script instead. */
  function sdkForIntegration() {
    return SDK_MODE === 'customJs'
      ? { url: DEFAULT_SDK_URL, note: 'The test page runs a pasted Custom JS: the default script is shown here.' }
      : { url: ACTIVE_SDK_URL, note: SDK_MODE === 'customUrl' ? 'Custom SDK script set on the test page.' : '' };
  }

  /* Comments in the generated files are English, like all code in this
     project; the few strings the sample page shows to a buyer follow the
     language of the bench. */
  function generateHtml(v) {
    const sdk = sdkForIntegration();
    return [
      '<!DOCTYPE html>',
      '<html lang="' + B.LANG + '">',
      '<head>',
      '  <meta charset="UTF-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '  <title>Checkout — Fabrick Lightbox</title>',
      '  <link rel="stylesheet" href="style.css" />',
      '',
      '  <!-- Fabrick Lightbox library.',
      '       Always load it from the Fabrick URLs: a saved copy gets no updates.',
      '       A synchronous script in the <head> runs before app.js, so',
      '       window.axerve already exists when your code uses it.' + (sdk.note ? '\n       ' + sdk.note : ''),
      '       Reference: ' + DOC_URL + ' -->',
      '  <script src="' + escAttr(sdk.url) + '"><\/script>',
      '</head>',
      '<body>',
      '  <main class="checkout">',
      '    <h1>' + tr('Riepilogo ordine', 'Order summary') + '</h1>',
      '    <p class="checkout-note">' + tr('Il pagamento si apre in una finestra sovrapposta a questa pagina.', 'The payment opens in a window over this page.') + '</p>',
      '    <button type="button" id="payButton" class="pay-button">' + tr('Paga ora', 'Pay now') + '</button>' +
        (v.callback ? '\n    <p id="paymentResult" class="payment-result" role="status" aria-live="polite" hidden></p>' : ''),
      '  </main>',
      '',
      '  <script src="app.js"><\/script>',
      '</body>',
      '</html>',
    ].join('\n');
  }

  function generateCss(v) {
    const resultRules = !v.callback ? '' : [
      '',
      '',
      '.payment-result {',
      '  margin: 16px 0 0;',
      '  padding: 12px 14px;',
      '  border: 1px solid;',
      '  border-radius: 6px;',
      '  font-size: 14px;',
      '}',
      '.payment-result.ok { background: #e6f6e6; color: #003100; border-color: #009400; }',
      '.payment-result.ko { background: #ffebec; color: #4b1113; border-color: #e13238; }',
      '.payment-result.xx { background: #fff8e6; color: #4d3800; border-color: #e6a700; }',
    ].join('\n');

    return [
      '*,',
      '*::before,',
      '*::after {',
      '  box-sizing: border-box;',
      '}',
      '',
      'body {',
      '  margin: 0;',
      '  font-family: system-ui, -apple-system, \'Segoe UI\', sans-serif;',
      '  background: #f8fafc;',
      '  color: #0f172a;',
      '}',
      '',
      '.checkout {',
      '  max-width: 420px;',
      '  margin: 64px auto;',
      '  padding: 32px;',
      '  background: #ffffff;',
      '  border: 1px solid rgba(15, 23, 42, 0.1);',
      '  border-radius: 14px;',
      '}',
      '',
      '.checkout h1 {',
      '  margin: 0 0 8px;',
      '  font-size: 20px;',
      '}',
      '',
      '.checkout-note {',
      '  margin: 0 0 24px;',
      '  color: #475569;',
      '  font-size: 14px;',
      '}',
      '',
      '.pay-button {',
      '  width: 100%;',
      '  padding: 12px 16px;',
      '  border: 0;',
      '  border-radius: 12px;',
      '  background: #112bfc;',
      '  color: #ffffff;',
      '  font: inherit;',
      '  font-weight: 600;',
      '  cursor: pointer;',
      '}',
      '.pay-button:hover { background: #0f25d8; }',
      '.pay-button:focus-visible { outline: 3px solid #6f7efd; outline-offset: 2px; }',
    ].join('\n') + resultRules;
  }

  function generateJs(v) {
    const lit = B.jsLiteral;
    const head = [
      '/*',
      ' * Fabrick Lightbox integration',
      ' * ' + DOC_URL,
      ' *',
      ' * paymentID and paymentToken come from the response of POST /payment/create,',
      ' * called SERVER-SIDE with your API key. On a real page the server writes',
      ' * them into the template: the browser never creates or requests them.',
      ' */',
      '\'use strict\';',
      v.isExample ? '\n// NOTE: these are sample values — the bench has no transaction yet.' : '',
      'const SHOP_LOGIN    = ' + lit(v.shop) + ';',
      'const PAYMENT_ID    = ' + lit(v.id) + ';',
      'const PAYMENT_TOKEN = ' + lit(v.token) + ';',
      '',
      '// shopLogin must be set before the Lightbox is opened',
      'axerve.lightBox.shop = SHOP_LOGIN;',
      '',
      '// addEventListener instead of an inline onclick: markup stays separate from',
      '// behaviour and the page works under a Content-Security-Policy that',
      '// forbids inline scripts.',
      'document.getElementById(\'payButton\').addEventListener(\'click\', () => {',
    ];
    const open = v.callback ? [
      '  // Third argument: the callback. With it Fabrick does NOT redirect at the',
      '  // end of the payment: handling the outcome is up to handlePaymentResult.',
      '  axerve.lightBox.open(PAYMENT_ID, PAYMENT_TOKEN, handlePaymentResult);',
    ] : [
      '  // No callback: at the end of the payment Fabrick redirects the buyer to',
      '  // the positive or negative result URL configured for the transaction.',
      '  axerve.lightBox.open(PAYMENT_ID, PAYMENT_TOKEN);',
    ];
    const callback = !v.callback ? [] : [
      '',
      '/**',
      ' * Payment outcome returned by the Lightbox.',
      ' * response = { status, paymentId, responseURL, error: { code, description } }',
      ' *',
      ' * This outcome is for updating the interface, NOT for fulfilling the order:',
      ' * the authoritative outcome is the server-to-server notification, to be',
      ' * checked server-side with GET payment/detail.',
      ' */',
      'function handlePaymentResult(response) {',
      '  const box = document.getElementById(\'paymentResult\');',
      '  const status = response && response.status;',
      '  const error = (response && response.error) || {};',
      '',
      '  let text;',
      '  let tone;',
      '  if (status === \'OK\') {',
      '    text = ' + lit(tr('Pagamento completato.', 'Payment completed.')) + ';',
      '    tone = \'ok\';',
      '  } else if (status === \'KO\') {',
      '    text = ' + lit(tr('Pagamento non riuscito', 'Payment failed')) + ' + (error.description ? \': \' + error.description : \'.\');',
      '    tone = \'ko\';',
      '  } else if (status === \'XX\') {',
      '    // Not final (asynchronous methods): wait for the S2S notification.',
      '    text = ' + lit(tr('Pagamento in attesa di conferma.', 'Payment awaiting confirmation.')) + ';',
      '    tone = \'xx\';',
      '  } else {',
      '    text = ' + lit(tr('Esito non riconosciuto', 'Unrecognised outcome')) + ' + (error.code ? \' (\' + error.code + \')\' : \'\') + \'.\';',
      '    tone = \'ko\';',
      '  }',
      '',
      '  box.textContent = text;   // textContent: nothing from the response is parsed as HTML',
      '  box.className = \'payment-result \' + tone;',
      '  box.hidden = false;',
      '',
      '  // To reproduce the redirect behaviour:',
      '  // if (response.responseURL) window.location.assign(response.responseURL);',
      '}',
    ];
    return head.concat(open, ['});'], callback).join('\n') + '\n';
  }

  function generateParts() {
    const v = formValues();
    return { html: generateHtml(v), css: generateCss(v), js: generateJs(v) };
  }

  /* ── Split files ↔ single file ──
     Regular expressions, not a DOM parser: DOMParser would re-serialise the
     whole document and lose formatting and comments, which is exactly what
     whoever reads the code wants to keep. Known limit: a "</script>" string
     inside the JS closes the block — the same limit the browser has, so the
     behaviour matches. */

  const RE_LINK_CSS = /<link\b[^>]*\bhref\s*=\s*["']style\.css["'][^>]*>/i;
  const RE_SCRIPT_APP = /<script\b[^>]*\bsrc\s*=\s*["']app\.js["'][^>]*>\s*<\/script>/i;
  const RE_STYLE_BLOCK = /[ \t]*<style\b[^>]*>([\s\S]*?)<\/style>[ \t]*\n?/gi;
  /* Inline script = no src attribute. Data blocks (JSON, templates) excluded. */
  const RE_INLINE_SCRIPT = /[ \t]*<script\b(?![^>]*\bsrc\s*=)(?![^>]*\btype\s*=\s*["'](?:application\/(?:ld\+)?json|text\/template)["'])[^>]*>([\s\S]*?)<\/script>[ \t]*\n?/gi;

  function merge(parts) {
    let html = parts.html;
    const css = parts.css.trim();
    const js = parts.js.trim();

    /* Replacement functions, not strings: the JS contains "$", which a
       replacement string would interpret ($&, $1…). */
    if (css) {
      const block = '<style>\n' + indent(css, 4) + '\n  </style>';
      html = RE_LINK_CSS.test(html)
        ? html.replace(RE_LINK_CSS, () => block)
        : html.replace(/<\/head>/i, () => '  ' + block + '\n</head>');
    } else {
      html = html.replace(RE_LINK_CSS, () => '');
    }

    if (js) {
      const block = '<script>\n' + indent(js, 4) + '\n  <\/script>';
      html = RE_SCRIPT_APP.test(html)
        ? html.replace(RE_SCRIPT_APP, () => block)
        : html.replace(/<\/body>/i, () => '  ' + block + '\n</body>');
    } else {
      html = html.replace(RE_SCRIPT_APP, () => '');
    }
    return { html, css: '', js: '' };
  }

  function split(html) {
    const cssChunks = [];
    let firstStyle = true;
    let out = html.replace(RE_STYLE_BLOCK, (m, body) => {
      cssChunks.push(dedent(body));
      const replacement = firstStyle ? '  <link rel="stylesheet" href="style.css" />\n' : '';
      firstStyle = false;
      return replacement;
    });

    const jsChunks = [];
    let firstScript = true;
    out = out.replace(RE_INLINE_SCRIPT, (m, body) => {
      jsChunks.push(dedent(body));
      /* Every inline script lands in app.js at the position of the first:
         their relative order is preserved, the order against external scripts
         in between is not. Acceptable for a checkout page. */
      const replacement = firstScript ? '  <script src="app.js"><\/script>\n' : '';
      firstScript = false;
      return replacement;
    });

    return { html: out, css: cssChunks.join('\n\n'), js: jsChunks.join('\n\n') };
  }

  /* An all-in-one page has inline CSS or JS and no reference to external files. */
  function looksSingleFile(html) {
    const hasInline = /<style\b/i.test(html) || new RegExp(RE_INLINE_SCRIPT.source, 'i').test(html);
    const refsFiles = RE_LINK_CSS.test(html) || RE_SCRIPT_APP.test(html);
    return /<html\b|<!doctype/i.test(html) && hasInline && !refsFiles;
  }

  /* ── State I/O ── */

  const getParts = () => ({ html: els.editors.html.value, css: els.editors.css.value, js: els.editors.js.value });

  function setParts(parts) {
    els.editors.html.value = parts.html;
    els.editors.css.value = parts.css;
    els.editors.js.value = parts.js;
  }

  function loadSaved() {
    const raw = B.local.get(STORAGE_KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      /* Shape validation: a corrupt value, or one from an older version, must
         not break the page — it is simply ignored. */
      if (!data || typeof data.html !== 'string') return null;
      return {
        mode: data.mode === 'single' ? 'single' : 'split',
        html: data.html,
        css: typeof data.css === 'string' ? data.css : '',
        js: typeof data.js === 'string' ? data.js : '',
        savedAt: data.savedAt || null,
      };
    } catch (e) { return null; }
  }

  /* ── Rendering ── */

  function render() {
    const single = state.mode === 'single';
    if (single) state.tab = 'html';

    els.tabs.forEach((tab) => {
      const file = tab.dataset.file;
      const selected = file === state.tab;
      /* In single-file mode only index.html exists: the CSS/JS tabs go away. */
      tab.hidden = single && file !== 'html';
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      els.editors[file].hidden = !selected;
    });

    els.structureBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.structure === state.mode)));

    const fileName = FILE_NAMES[state.tab];
    els.download.textContent = tr('Scarica ', 'Download ') + fileName;

    let pill;
    let text;
    if (state.dirty) {
      pill = B.el('span', 'pill pill--warn', tr('Modificato', 'Edited'));
      text = tr(' Modifiche non salvate', ' Unsaved changes');
    } else if (state.source === 'saved') {
      pill = B.el('span', 'pill pill--info', tr('Salvato', 'Saved'));
      text = state.savedAt ? tr(' Salvato il ', ' Saved on ') + new Date(state.savedAt).toLocaleString(B.LANG === 'en' ? 'en-GB' : 'it-IT') : '';
    } else {
      pill = B.el('span', 'pill', tr('Generato', 'Generated'));
      text = tr(' Segue i dati del pagamento', ' Follows the payment data');
    }
    els.state.replaceChildren(pill, text);

    const code = els.editors[state.tab].value;
    const lines = code ? code.split('\n').length : 0;
    els.meta.textContent = fileName + ' · ' + lines + tr(' righe · ', ' lines · ') + (new Blob([code]).size / 1024).toFixed(1) + ' KB · ' + tr('Tab rientra, Esc poi Tab esce', 'Tab indents, Esc then Tab leaves');
  }

  function note(text) {
    els.note.textContent = text;
    els.note.hidden = !text;
  }

  /* ── Actions ── */

  function regenerateFromForm() {
    let parts = generateParts();
    if (state.mode === 'single') parts = merge(parts);
    setParts(parts);
    render();
  }

  /* Automatic regeneration only while nobody has touched the code: overwriting
     manual edits because a form field changed would be silent data loss. */
  function onFormChanged() {
    if (state.source === 'generated' && !state.dirty) regenerateFromForm();
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    const parts = getParts();
    setParts(mode === 'single' ? merge(parts) : split(parts.html));
    state.mode = mode;
    if (state.source === 'saved') state.dirty = true;   /* the saved structure was the other one */
    note(mode === 'single'
      ? tr('CSS e JavaScript sono stati inseriti in index.html come <style> e <script>.', 'CSS and JavaScript were placed in index.html as <style> and <script>.')
      : tr('CSS e JavaScript inline sono stati estratti in style.css e app.js.', 'Inline CSS and JavaScript were extracted into style.css and app.js.'));
    render();
  }

  function save() {
    const payload = Object.assign({ v: 1, mode: state.mode }, getParts(), { savedAt: new Date().toISOString() });
    if (!B.local.set(STORAGE_KEY, JSON.stringify(payload))) {
      note(tr('Salvataggio non riuscito: localStorage non disponibile o spazio esaurito.', 'Save failed: localStorage is unavailable or full.'));
      return false;
    }
    state.source = 'saved';
    state.dirty = false;
    state.savedAt = payload.savedAt;
    note('');
    render();
    Logger.info('Codice di integrazione salvato', { struttura: state.mode, byte: JSON.stringify(payload).length });
    return true;
  }

  /* "Rigenera" discards edits and the saved copy: it asks for confirmation
     with a second click rather than a modal confirm(), which breaks the flow
     and is suppressed by some browsers after repeated prompts. */
  let regenArmed = null;
  function disarmRegen() {
    clearTimeout(regenArmed);
    regenArmed = null;
    els.regenerate.textContent = tr('Rigenera dai dati', 'Regenerate from data');
    els.regenerate.classList.remove('btn--confirm');
  }
  function regenerate() {
    const destructive = state.dirty || state.source === 'saved';
    if (destructive && !regenArmed) {
      els.regenerate.textContent = tr('Conferma: sovrascrivi', 'Confirm: overwrite');
      els.regenerate.classList.add('btn--confirm');
      regenArmed = setTimeout(disarmRegen, 4000);
      return;
    }
    disarmRegen();
    B.local.set(STORAGE_KEY, '');
    state.source = 'generated';
    state.dirty = false;
    state.savedAt = null;
    note('');
    regenerateFromForm();
    Logger.info('Codice di integrazione rigenerato dai dati del form');
  }

  function copy() {
    const editor = els.editors[state.tab];
    B.copyText(editor.value, els.copy, () => { editor.focus(); editor.select(); });
  }

  function download() {
    B.downloadText(FILE_NAMES[state.tab], MIME[state.tab], els.editors[state.tab].value);
  }

  function selectTab(file, focusEditor) {
    if (state.mode === 'single' && file !== 'html') return;
    state.tab = file;
    render();
    if (focusEditor) els.editors[file].focus();
  }

  /* ── Flip ── */

  const isFlipped = () => els.flipper.classList.contains('is-flipped');

  function flip(showBack) {
    els.flipper.classList.toggle('is-flipped', showBack);
    els.front.toggleAttribute('inert', showBack);
    els.back.toggleAttribute('inert', !showBack);
    els.toggle.setAttribute('aria-pressed', String(showBack));
    els.toggleText.textContent = showBack ? tr('Dati', 'Data') : tr('Codice', 'Code');
    els.title.textContent = showBack ? tr('Codice di integrazione', 'Integration code') : tr('Dati pagamento', 'Payment data');
    if (showBack) {
      render();
      els.editors[state.tab].focus({ preventScroll: true });
    }
  }

  /* ── Keyboard in the editor ──
     Tab inserts two spaces instead of leaving the field, as a code editor is
     expected to. To avoid a focus trap, Esc releases it: the next Tab leaves
     normally. Shift+Tab always leaves. */
  let tabReleased = false;

  function insertAtCursor(textarea, text) {
    textarea.focus();
    /* execCommand is deprecated but is the only way to insert text while
       keeping the undo history (Ctrl+Z). The setRangeText fallback works
       everywhere and breaks undo. */
    let ok = false;
    try { ok = !!(document.execCommand && document.execCommand('insertText', false, text)); } catch (e) { ok = false; }
    if (!ok) {
      textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function onEditorKeydown(e) {
    if (e.key === 'Escape') { tabReleased = true; return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();   /* otherwise the browser opens "Save page as" */
      save();
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && !tabReleased) {
      e.preventDefault();
      insertAtCursor(e.currentTarget, '  ');
      return;
    }
    if (e.key !== 'Tab') tabReleased = false;
  }

  function onEditorInput() {
    state.dirty = true;
    disarmRegen();
    render();
  }

  /* Pasting a complete page with inline CSS/JS into the HTML tab switches to
     the single-file view, where everything is visible and editable in one
     place. The pasted text itself is not touched. */
  function onHtmlPaste() {
    setTimeout(() => {
      if (state.mode === 'split' && looksSingleFile(els.editors.html.value)) {
        const hadParts = els.editors.css.value.trim() || els.editors.js.value.trim();
        if (!hadParts) {
          state.mode = 'single';
          note(tr('Rilevata una pagina con CSS e JavaScript inline: vista a file unico. Usa «File separati» per estrarli.', 'A page with inline CSS and JavaScript was detected: single-file view. Use “Separate files” to extract them.'));
          render();
        }
      }
    }, 0);
  }

  /* Arrow-key navigation between tabs, per the WAI-ARIA tablist pattern. */
  function onTabKeydown(e) {
    const visible = els.tabs.filter((t) => !t.hidden);
    const i = visible.indexOf(e.currentTarget);
    let next = null;
    if (e.key === 'ArrowRight') next = visible[(i + 1) % visible.length];
    if (e.key === 'ArrowLeft') next = visible[(i - 1 + visible.length) % visible.length];
    if (e.key === 'Home') next = visible[0];
    if (e.key === 'End') next = visible[visible.length - 1];
    if (next) { e.preventDefault(); selectTab(next.dataset.file); next.focus(); }
  }

  function init() {
    const saved = loadSaved();
    if (saved) {
      state.mode = saved.mode;
      state.source = 'saved';
      state.savedAt = saved.savedAt;
      setParts(saved);
      render();
    } else {
      regenerateFromForm();
    }

    els.toggle.addEventListener('click', () => flip(!isFlipped()));
    els.tabs.forEach((tab) => {
      tab.addEventListener('click', () => selectTab(tab.dataset.file, true));
      tab.addEventListener('keydown', onTabKeydown);
    });
    els.structureBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.structure)));
    Object.values(els.editors).forEach((ed) => {
      ed.addEventListener('keydown', onEditorKeydown);
      ed.addEventListener('input', onEditorInput);
      ed.addEventListener('focus', () => { tabReleased = false; });
    });
    els.editors.html.addEventListener('paste', onHtmlPaste);
    els.copy.addEventListener('click', copy);
    els.download.addEventListener('click', download);
    els.regenerate.addEventListener('click', regenerate);
    els.save.addEventListener('click', save);

    /* bench:session fires on every edit of the three fields, and on clear/fill. */
    document.addEventListener('bench:session', onFormChanged);
    /* "change" reaches this listener after the one that updates
       callbackEnabled: the regenerated code already reflects the new mode. */
    document.querySelectorAll('input[name="callbackMode"]').forEach((r) => r.addEventListener('change', onFormChanged));

    /* Warn before closing or reloading with unsaved edits. Relevant because
       "Applica" and "Custom JS" reload the page. */
    window.addEventListener('beforeunload', (e) => {
      if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  return { init };
})();

Integration.init();

/* ═══════════════════════════════════════════════════════════════════════════
   START
   The pay button stays disabled until the SDK script has loaded.
   ═══════════════════════════════════════════════════════════════════════════ */
Logger.info('Fabrick Lightbox Test pronta', {
  'Ambiente pagina': {
    origin: window.location.origin,
    userAgent: navigator.userAgent,
    lingua: navigator.language,
    cookieAbilitati: navigator.cookieEnabled,
  },
  'Suggerimento': 'filtra la console con "FABRICK-LB"',
}, { expanded: true });

payButton.disabled = true;
sdkReady
  .then(() => {
    renderSdkStatus('ok');
    payButton.disabled = false;
    const present = !!(window.axerve && window.axerve.lightBox);
    (present ? Logger.success : Logger.error)(
      'SDK caricato in ' + Math.round(performance.now() - sdkLoadStart) + 'ms (' + SDK_MODE + ')',
      SDK_MODE === 'customJs'
        ? {
            'Sorgente': SDK_SOURCE_LABEL,
            'Verifica': present ? 'axerve.lightBox presente' : 'axerve.lightBox ASSENTE',
            'Analisi': analyzeCode(customJs).map((c) => c.level + ': ' + c.text),
            'Debug': 'DevTools → Sources → cerca "' + CUSTOM_JS_SOURCE_URL + '"',
          }
        : {
            'URL': describeUrl(ACTIVE_SDK_URL),
            'Verifica': present ? 'axerve.lightBox presente' : 'axerve.lightBox ASSENTE',
            'Sorgente': 'DevTools → Sources → cerca "axerve.js"',
          }
    );
  })
  .catch((err) => {
    renderSdkStatus('error');
    Logger.error('Caricamento SDK fallito', SDK_MODE === 'customJs'
      ? { Sorgente: SDK_SOURCE_LABEL, errore: err.message, 'Cosa fare': 'Apri «Custom JS», correggi il codice e salva di nuovo' }
      : {
          URL: ACTIVE_SDK_URL,
          errore: err.message,
          'Possibili cause': ['URL errato o 404', 'Risposta non JavaScript (MIME text/html)', 'Blocco rete/adblock', 'CSP della pagina', 'Host non raggiungibile'],
        });
    showMessage(err.message, 'error');
  });

})();
