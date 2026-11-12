/* ═══════════════════════════════════════════════════════════════════════════
   apionly.js — apionly.html

   API Only has no Fabrick front-end at all: the merchant collects the payment
   data and posts it with payment/submit, authenticated by the PaymentToken
   header. Being generic, the integration is reproduced here as what it is on
   a real site — a card form — and the page explains the response.

   CARD DATA HANDLING
   Sandbox test cards only, but handled as if they were not:
     - never written to sessionStorage or localStorage
     - masked in the on-screen request and in the console (first 6, last 4)
     - absent from the generated code, which reads the form at runtime
   A bench that is careless with test data teaches the habit for real data.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

const B = window.Bench;
const $ = B.$;
const tr = B.tr;
const Logger = B.createLogger('FABRICK-API');

B.boot('apionly');
B.Session.mount($('sessionFields'), {
  page: 'apionly',
  modes: ['create', 'manual'],
  manual: ['ids'],
  /* The documentation's API Only request: no paymentChannel, the method is
     chosen later by payment/submit. */
  template: (shopLogin) => ({ shopLogin, amount: '100', currency: 'EUR', shopTransactionID: 'FBK_OrderID' }),
});
B.returnBanner($('returnHost'));
B.returnTip($('returnTip'));
B.detailCard($('detailCard'));

const showMessage = B.statusLine($('statusMessage'));

/* ═══════════════════════════════════════════════════════════════════════════
   1. TEST CARDS
   Transcribed from the "Dati di test e credenziali" page of the documentation.
   The sandbox rejects any card that is not in this list.
   ═══════════════════════════════════════════════════════════════════════════ */
const TEST_CARDS = Object.freeze([
  { number: '4012000000003101', exp: '05/27', brand: 'Visa', scenario: '3DS2 — Challenge flow' },
  { number: '4012000000003010', exp: '05/27', brand: 'Visa', scenario: '3DS2 — Frictionless flow' },
  { number: '4012000000003036', exp: '05/27', brand: 'Visa', scenario: '3DS2 — Attempted' },
  { number: '4012000000003028', exp: '05/27', brand: 'Visa', scenario: '3DS2 — Failed authentication' },
  { number: '4761340000000050', exp: '05/27', brand: 'Visa', scenario: tr('3DS2 — Esente', '3DS2 — Exempt') },
  { number: '4012000000003077', exp: '05/27', brand: 'Visa', scenario: '3DS2 — NPA' },
  { number: '375987000169826', exp: '01/29', brand: 'Amex', scenario: '3DS2 — Frictionless flow' },
  { number: '5176009999999913', exp: '01/29', brand: 'Mastercard', scenario: '3DS2 — Frictionless flow' },
]);

const fields = { number: $('cardNumber'), month: $('expMonth'), year: $('expYear'), cvv: $('cvv'), token: $('cardToken') };
const testCard = $('testCard');

testCard.append(Object.assign(B.el('option', null, tr('Scegli una carta…', 'Pick a card…')), { value: '' }));
TEST_CARDS.forEach((c, i) => {
  testCard.append(Object.assign(B.el('option', null, c.brand + ' · ' + c.number + ' · ' + c.scenario), { value: String(i) }));
});
testCard.addEventListener('change', () => {
  const c = TEST_CARDS[Number(testCard.value)];
  if (!testCard.value || !c) return;
  fields.number.value = c.number;
  fields.month.value = c.exp.slice(0, 2);
  fields.year.value = c.exp.slice(3);
  /* The documentation accepts any numeric CVV: 3 digits, 4 for Amex. */
  fields.cvv.value = c.brand === 'Amex' ? '1234' : '123';
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. FORM
   ═══════════════════════════════════════════════════════════════════════════ */
let mode = 'card';
document.querySelectorAll('input[name="payMode"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    mode = radio.value;
    $('cardFields').hidden = mode !== 'card';
    $('tokenFields').hidden = mode !== 'token';
    code.refresh();
  });
});

const digits = (v) => v.replace(/[\s-]/g, '');
const maskPan = (pan) => (pan.length > 10 ? pan.slice(0, 6) + '•'.repeat(pan.length - 10) + pan.slice(-4) : '•'.repeat(pan.length));

/* Formal checks only: whether the card is accepted is the sandbox's answer,
   and reading that answer is the point of the page. */
function readPayment() {
  const errors = [];
  if (mode === 'token') {
    const token = fields.token.value.trim();
    if (!token) errors.push(tr('il token della carta è obbligatorio', 'the card token is required'));
    return { errors, creditcard: { token }, shown: { token } };
  }
  const number = digits(fields.number.value);
  const month = fields.month.value.trim();
  const year = fields.year.value.trim();
  const cvv = fields.cvv.value.trim();
  if (!/^\d{12,19}$/.test(number)) errors.push(tr('numero carta: da 12 a 19 cifre', 'card number: 12 to 19 digits'));
  if (!/^(0[1-9]|1[0-2])$/.test(month)) errors.push(tr('mese: due cifre, da 01 a 12', 'month: two digits, 01 to 12'));
  if (!/^\d{2}$/.test(year)) errors.push(tr('anno: due cifre', 'year: two digits'));
  if (!/^\d{3,4}$/.test(cvv)) errors.push(tr('CVV: 3 o 4 cifre', 'CVV: 3 or 4 digits'));
  return {
    errors,
    creditcard: { number, expMonth: month, expYear: year, CVV: cvv },
    /* What may be displayed and logged: the PAN masked, the CVV never. */
    shown: { number: maskPan(number), expMonth: month, expYear: year, CVV: '•'.repeat(cvv.length) },
  };
}

const submitBtn = $('submitBtn');
const submitText = $('submitText');
function setLoading(on) {
  submitBtn.disabled = on;
  if (on) submitText.replaceChildren(B.el('span', 'spinner'), tr(' Invio in corso…', ' Sending…'));
  else submitText.textContent = tr('Invia payment/submit', 'Send payment/submit');
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. RESPONSE
   The three scenarios of the documentation, told apart in the order that
   matters: an application error first, then the authentication request, then
   the immediate outcome.
   ═══════════════════════════════════════════════════════════════════════════ */
const SCA_REQUIRED = '8006';
const responseCard = $('responseCard');
const responseOut = $('responseOut');

function renderResponse(res, shownRequest) {
  responseOut.replaceChildren();
  responseCard.hidden = false;
  const payload = (res.body && res.body.payload) || {};
  const href = payload.userRedirect && payload.userRedirect.href;

  if (res.kind !== 'ok') {
    showMessage(res.error, 'error');
    if (res.kind === 'api') {
      responseOut.append(B.admonition('danger', tr('Errore', 'Error'), tr(
        '<p>Fabrick ha risposto con un errore applicativo: codice e descrizione sono nell’oggetto <code>error</code>. Consulta l’<a data-doc="apiErrors">elenco degli errori</a>.</p>',
        '<p>Fabrick answered with an application error: code and description are in the <code>error</code> object. See the <a data-doc="apiErrors">list of errors</a>.</p>')));
    }
  } else if (String(payload.transactionErrorCode) === SCA_REQUIRED) {
    showMessage(tr('Autenticazione richiesta (8006): il buyer va reindirizzato alla pagina della sua banca.', 'Authentication required (8006): the buyer must be redirected to their bank’s page.'), 'pending');
    const box = B.admonition('warning', tr('Autenticazione richiesta', 'Authentication required'), tr(
      '<p>Il pagamento non è concluso. Reindirizza il buyer a <code>payload.userRedirect.href</code>: al termine dell’autenticazione verrà riportato alla URL di esito della transazione.</p>',
      '<p>The payment is not complete. Redirect the buyer to <code>payload.userRedirect.href</code>: when authentication ends they are sent to the result URL of the transaction.</p>'));
    /* The redirect button is offered only for an https URL on a sandbox host:
       a response is external data, and a bench that follows any URL it is
       handed would break its own sandbox-only rule. */
    const chk = href ? B.checkSandboxUrl(href) : { ok: false, error: tr('La risposta non contiene userRedirect.href.', 'The response has no userRedirect.href.') };
    const actions = B.el('div', 'actions');
    if (chk.ok) {
      const here = B.el('button', 'btn btn--primary btn--sm', tr('Vai all’autenticazione', 'Go to authentication'));
      here.addEventListener('click', () => window.location.assign(chk.url));
      const tab = B.el('a', 'btn btn--secondary btn--sm', tr('Apri in una nuova scheda', 'Open in a new tab'));
      tab.href = chk.url;
      tab.target = '_blank';
      tab.rel = 'noopener noreferrer';
      actions.append(here, tab);
    } else {
      actions.append(B.el('span', 'small', chk.error));
    }
    box.append(actions);
    responseOut.append(box);
  } else {
    const known = B.RESULT_STATES[payload.transactionResult];
    showMessage(
      known ? tr('Esito immediato: transactionResult ', 'Immediate outcome: transactionResult ') + payload.transactionResult + ' — ' + known.text + '.'
            : tr('Risposta ricevuta, transactionResult: ', 'Response received, transactionResult: ') + (payload.transactionResult || tr('(assente)', '(absent)')) + '.',
      known ? known.tone : 'warning'
    );
  }

  responseOut.append(B.kvList([
    ['HTTP', res.status || '(nessuna risposta)'],
    [tr('Tempo di risposta', 'Response time'), res.ms + ' ms'],
    ['error.code', res.body && res.body.error && res.body.error.code],
    ['error.description', res.body && res.body.error && res.body.error.description],
    ['transactionResult', payload.transactionResult],
    ['transactionErrorCode', payload.transactionErrorCode],
    ['transactionErrorDescription', payload.transactionErrorDescription],
    ['authorizationCode', payload.authorizationCode],
    ['userRedirect.href', href],
  ]));
  if (res.body) responseOut.append(B.jsonBlock(tr('Risposta payment/submit', 'payment/submit response'), res.body));
  else if (res.text) responseOut.append(B.jsonBlock(tr('Risposta (non JSON)', 'Response (not JSON)'), res.text.slice(0, 4000)));
  responseOut.append(B.jsonBlock(tr('Richiesta inviata (dati carta mascherati)', 'Request sent (card data masked)'), shownRequest));
}

$('payForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = B.Session.values();
  const pay = readPayment();
  const errors = B.Session.validateIds(v).concat(pay.errors);
  if (errors.length) { showMessage(tr('Non posso inviare: ', 'Cannot send: ') + errors.join(', ') + '.', 'error'); return; }

  const envelope = (creditcard) => ({ shopLogin: v.shopLogin, paymentType: 'CREDITCARD', paymentTypeDetails: { creditcard } });
  const shownRequest = {
    method: 'POST',
    url: B.SANDBOX.api + '/payment/submit',
    headers: { PaymentToken: B.maskToken(v.paymentToken), 'Content-Type': 'application/json' },
    body: envelope(pay.shown),
  };

  setLoading(true);
  showMessage(tr('Chiamata in corso…', 'Calling…'), 'info');
  Logger.startAttempt('payment/submit', { 'Richiesta (mascherata)': shownRequest });

  const res = await B.callApi('/payment/submit', {
    method: 'POST',
    headers: { PaymentToken: v.paymentToken },
    body: envelope(pay.creditcard),
  });

  setLoading(false);
  (res.kind === 'ok' ? Logger.success : Logger.error)('payment/submit → ' + res.kind + ' (' + res.ms + 'ms)', { 'HTTP': res.status, 'Risposta': res.body || res.text });
  Logger.endAttempt();
  renderResponse(res, shownRequest);
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. GENERATED CODE
   Comments in generated code are English, like all code in this project.
   ═══════════════════════════════════════════════════════════════════════════ */
function generate() {
  const v = B.Session.values();
  const creditcard = mode === 'token'
    ? '        token: document.getElementById("cardToken").value.trim(),\n'
    : '        number: document.getElementById("cardNumber").value.replace(/\\s/g, ""),\n' +
      '        expMonth: document.getElementById("expMonth").value,\n' +
      '        expYear: document.getElementById("expYear").value,\n' +
      '        CVV: document.getElementById("cvv").value,\n';

  const js =
    '/*\n' +
    ' * API Only integration — payment/submit\n' +
    ' * ' + B.DOCS.apionly + '\n' +
    ' *\n' +
    ' * paymentToken comes from the response of POST /payment/create, called\n' +
    ' * SERVER-SIDE with your API key. Here it authenticates the call from the\n' +
    ' * browser: card data goes straight to Fabrick and never touches your systems.\n' +
    ' */\n' +
    'const API = "' + B.SANDBOX.api + '";   // production: https://ecomms2s.sella.it/api/v1\n' +
    'const SHOP_LOGIN    = ' + B.jsLiteral(v.shopLogin || 'GESPAY12345') + ';\n' +
    'const PAYMENT_TOKEN = ' + B.jsLiteral(v.paymentToken || 'PAYMENT_TOKEN') + ';\n\n' +
    'async function submitPayment() {\n' +
    '  const response = await fetch(API + "/payment/submit", {\n' +
    '    method: "POST",\n' +
    '    headers: { "Content-Type": "application/json", "PaymentToken": PAYMENT_TOKEN },\n' +
    '    body: JSON.stringify({\n' +
    '      shopLogin: SHOP_LOGIN,\n' +
    '      paymentType: "CREDITCARD",\n' +
    '      paymentTypeDetails: {\n' +
    '        creditcard: {\n' +
    creditcard.replace(/^ {8}/gm, '          ') +
    '        },\n' +
    '      },\n' +
    '    }),\n' +
    '  });\n' +
    '  const result = await response.json();\n\n' +
    '  // 1. Application error: Fabrick answers 200 with error.code other than "0"\n' +
    '  if (result.error && String(result.error.code) !== "0") {\n' +
    '    throw new Error(result.error.code + ": " + result.error.description);\n' +
    '  }\n\n' +
    '  // 2. Authentication required: redirect to the page of the buyer\'s bank\n' +
    '  if (String(result.payload.transactionErrorCode) === "8006") {\n' +
    '    window.location.assign(result.payload.userRedirect.href);\n' +
    '    return;\n' +
    '  }\n\n' +
    '  // 3. Immediate outcome. Update the interface, but fulfil the order only\n' +
    '  //    after the server-to-server notification or a server-side payment/detail.\n' +
    '  return result.payload.transactionResult;   // "OK" or "KO"\n' +
    '}\n';

  return [{ name: 'submit.js', mime: 'text/javascript', code: js }];
}

const code = B.codeCard($('codeHost'), generate);
document.addEventListener('bench:session', () => code.refresh());

Logger.info('Fabrick API Only Test pronta', { 'Endpoint': B.SANDBOX.api + '/payment/submit' });

})();
