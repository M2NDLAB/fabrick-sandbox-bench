/* ═══════════════════════════════════════════════════════════════════════════
   paybylink.js — paybylink.html

   Pay By Link is the hosted page plus three things, and the page follows them:
     1. Builder   channels and validity, written into the body of the request
     2. LINK      userRedirect.href of the response, ready to open
     3. QRCODE    payload.qrCode of the response, rendered as the image

   THE BUILDER DOES NOT OWN THE BODY
   The controls patch the paymentChannel object inside the body; they do not
   regenerate it. The tester can then edit the JSON by hand, and the summary is
   computed from the JSON actually in the editor — so what is described in
   words is what will be sent, whichever way it was written.

   The second tab takes a link or a QR string obtained elsewhere. With those
   there is nothing left to create, which is why that tab has no send button.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

const B = window.Bench;
const $ = B.$;
const tr = B.tr;

B.boot('paybylink');
B.Session.mount($('sessionFields'), {
  page: 'paybylink',
  modes: ['create', 'manual'],
  manual: ['link', 'qr'],
  manualLabel: tr('Ho già link o QR', 'I already have a link or QR'),
  template: (shopLogin) => ({
    shopLogin,
    amount: '100',
    currency: 'EUR',
    shopTransactionID: 'FBK_OrderID',
    paymentChannel: { channelType: ['LINK'] },
  }),
});
B.returnBanner($('returnHost'));
B.returnTip($('returnTip'));
B.detailCard($('detailCard'));
B.linkCard($('linkHost'));

/* ═══════════════════════════════════════════════════════════════════════════
   1. BUILDER
   Rules from the Pay By Link documentation:
     - channelType is the only mandatory parameter
     - EMAIL needs buyerEmail
     - validityStart and validityEnd take ONE parameter each
     - default validity 48 hours, maximum duration 49 hours
   ═══════════════════════════════════════════════════════════════════════════ */
const MAX_MINUTES = 49 * 60;
const UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const CHANNELS = ['LINK', 'QRCODE', 'EMAIL'];

/* The parameters each side of the period accepts, in the order they are
   offered. `numeric` decides validation and keyboard. */
const PARAMS = Object.freeze({
  minutesFromNow: { label: tr('Tra N minuti dalla richiesta', 'N minutes after the request'), numeric: true, placeholder: '10' },
  UTCDateTime: { label: tr('A una data e ora UTC', 'At a UTC date and time'), numeric: false, placeholder: '2026-12-31T13:14:00' },
  validityMinutes: { label: tr('Dopo N minuti dall’inizio', 'N minutes after the start'), numeric: true, placeholder: '50' },
});
const SIDES = Object.freeze({
  validityStart: { label: tr('Inizio validità', 'Validity start'), none: tr('Subito (non impostato)', 'Immediately (not set)'), params: ['minutesFromNow', 'UTCDateTime'] },
  validityEnd: { label: tr('Fine validità', 'Validity end'), none: tr('Predefinita: 48 ore', 'Default: 48 hours'), params: ['minutesFromNow', 'UTCDateTime', 'validityMinutes'] },
});

const ctl = { channels: {}, sides: {} };
let applying = false;   /* true while a control is writing to the body */

function buildControls(slot) {
  const chField = B.el('div', 'field');
  const chLabel = B.el('span', 'label');
  chLabel.append(tr('Canali', 'Channels') + ' (', B.el('code', null, 'channelType'), ')');
  const chips = B.el('div', 'chips');
  CHANNELS.forEach((name) => {
    const label = B.el('label', 'chip');
    const box = B.el('input');
    box.type = 'checkbox';
    box.value = name;
    ctl.channels[name] = box;
    label.append(box, name);
    chips.append(label);
  });
  chField.append(chLabel, chips);

  ctl.emailField = B.el('div', 'field');
  const emailLabel = B.el('label');
  emailLabel.htmlFor = 'buyerEmail';
  emailLabel.append(B.el('code', null, 'buyerEmail'));
  ctl.email = B.el('input', 'input');
  ctl.email.type = 'email';
  ctl.email.id = 'buyerEmail';
  ctl.email.autocomplete = 'off';
  ctl.email.placeholder = 'john.doe@example.com';
  ctl.emailField.append(emailLabel, ctl.email, B.el('small', 'hint', tr('Obbligatorio con il canale EMAIL: è l’indirizzo a cui Fabrick invia la richiesta di pagamento.', 'Required with the EMAIL channel: the address Fabrick sends the payment request to.')));

  slot.append(chField, ctl.emailField);

  Object.keys(SIDES).forEach((side) => {
    const def = SIDES[side];
    const grid = B.el('div', 'field-grid');
    const modeField = B.el('div', 'field');
    const modeLabel = B.el('label');
    modeLabel.htmlFor = side + 'Mode';
    modeLabel.append(def.label + ' (', B.el('code', null, side), ')');
    const mode = B.el('select', 'select');
    mode.id = side + 'Mode';
    mode.append(Object.assign(B.el('option', null, def.none), { value: '' }));
    def.params.forEach((p) => mode.append(Object.assign(B.el('option', null, PARAMS[p].label), { value: p })));
    modeField.append(modeLabel, mode);

    const valueField = B.el('div', 'field');
    const valueLabel = B.el('label');
    valueLabel.htmlFor = side + 'Value';
    const value = B.el('input', 'input');
    value.type = 'text';
    value.id = side + 'Value';
    value.autocomplete = 'off';
    valueField.append(valueLabel, value);

    grid.append(modeField, valueField);
    slot.append(grid);
    ctl.sides[side] = { mode, value, valueField, valueLabel };
  });

  slot.addEventListener('input', applyControls);
}

function paintSide(side) {
  const s = ctl.sides[side];
  const def = PARAMS[s.mode.value];
  s.valueField.hidden = !def;
  if (!def) return;
  s.valueLabel.replaceChildren(B.el('code', null, s.mode.value));
  s.value.placeholder = def.placeholder;
  s.value.inputMode = def.numeric ? 'numeric' : 'text';
}

/* Controls → body. Only paymentChannel and buyerEmail are touched. A side
   whose value is still empty is simply left out, so a half-typed control never
   writes an empty parameter into the request. */
function applyControls() {
  Object.keys(ctl.sides).forEach(paintSide);
  const channels = CHANNELS.filter((c) => ctl.channels[c].checked);
  ctl.emailField.hidden = channels.indexOf('EMAIL') < 0;

  applying = true;
  B.Session.patchBody((body) => {
    const channel = { channelType: channels };
    const period = {};
    Object.keys(ctl.sides).forEach((side) => {
      const s = ctl.sides[side];
      const v = s.value.value.trim();
      if (s.mode.value && v) period[side] = { [s.mode.value]: v };
    });
    if (Object.keys(period).length) channel.validityPeriod = period;
    body.paymentChannel = channel;

    const email = ctl.email.value.trim();
    if (channels.indexOf('EMAIL') >= 0 && email) body.buyerEmail = email;
    else delete body.buyerEmail;
  });
  applying = false;
}

/* The single valued parameter of one side, as written in the body. */
function readSide(body, side) {
  const obj = body.paymentChannel && body.paymentChannel.validityPeriod && body.paymentChannel.validityPeriod[side];
  if (!obj || typeof obj !== 'object') return { set: [] };
  const set = Object.keys(obj).filter((k) => obj[k] !== '' && obj[k] != null);
  return { set, param: set[0], value: set.length ? String(obj[set[0]]) : '' };
}

/* Body → controls, when the body was changed by hand, reset, or restored. */
function syncControls() {
  if (applying) return;
  const body = B.Session.getBody();
  if (!body) return;
  const channels = (body.paymentChannel && Array.isArray(body.paymentChannel.channelType)) ? body.paymentChannel.channelType : [];
  CHANNELS.forEach((c) => { ctl.channels[c].checked = channels.indexOf(c) >= 0; });
  ctl.emailField.hidden = channels.indexOf('EMAIL') < 0;
  if (document.activeElement !== ctl.email) ctl.email.value = body.buyerEmail ? String(body.buyerEmail) : '';
  Object.keys(ctl.sides).forEach((side) => {
    const s = ctl.sides[side];
    const read = readSide(body, side);
    /* A mode chosen but not yet given a value is pending, not absent: leave
       the control as the tester set it. */
    if (s.mode.value && !s.value.value.trim() && !read.param) { paintSide(side); return; }
    const known = read.param && SIDES[side].params.indexOf(read.param) >= 0;
    s.mode.value = known ? read.param : '';
    if (document.activeElement !== s.value) s.value.value = known ? read.value : '';
    paintSide(side);
  });
}

/* Everything said about the request is read from the JSON in the editor. */
function analyse(body) {
  const problems = [];
  const channels = (body.paymentChannel && Array.isArray(body.paymentChannel.channelType)) ? body.paymentChannel.channelType.map(String) : [];
  if (!channels.length) problems.push(tr('Seleziona almeno un canale: channelType è obbligatorio.', 'Select at least one channel: channelType is mandatory.'));
  if (channels.indexOf('EMAIL') >= 0 && !body.buyerEmail) problems.push(tr('Con il canale EMAIL va valorizzato buyerEmail.', 'The EMAIL channel needs buyerEmail.'));

  const sides = {};
  Object.keys(SIDES).forEach((side) => {
    const r = readSide(body, side);
    sides[side] = r;
    if (r.set.length > 1) problems.push(SIDES[side].label + tr(': va valorizzato un solo parametro, ne trovo ', ': only one parameter may be set, found ') + r.set.length + ' (' + r.set.join(', ') + ').');
    if (!r.param) return;
    const def = PARAMS[r.param];
    if (!def) { problems.push(SIDES[side].label + tr(': parametro non previsto «', ': unexpected parameter “') + r.param + tr('».', '”.')); return; }
    if (def.numeric && (!/^\d+$/.test(r.value) || Number(r.value) <= 0)) problems.push(SIDES[side].label + tr(': serve un numero intero di minuti maggiore di zero.', ': a whole number of minutes greater than zero is needed.'));
    if (!def.numeric && !UTC_RE.test(r.value)) problems.push(SIDES[side].label + tr(': il formato è yyyy-mm-ddThh:mm:ss in UTC.', ': the format is yyyy-mm-ddThh:mm:ss in UTC.'));
  });

  /* The duration is known only when both ends are expressed in minutes; with
     absolute dates the builder does not guess. */
  const start = sides.validityStart, end = sides.validityEnd;
  let duration = null;
  if (!problems.length) {
    const offset = start.param === 'minutesFromNow' ? Number(start.value) : start.param ? null : 0;
    if (end.param === 'validityMinutes') duration = Number(end.value);
    else if (end.param === 'minutesFromNow' && offset !== null) duration = Number(end.value) - offset;
    if (duration !== null && duration <= 0) problems.push(tr('La fine della validità precede l’inizio.', 'The validity ends before it starts.'));
    if (duration !== null && duration > MAX_MINUTES) problems.push(tr('La durata supera il massimo di 49 ore (' + MAX_MINUTES + ' minuti).', 'The duration exceeds the maximum of 49 hours (' + MAX_MINUTES + ' minutes).'));
  }
  return { problems, channels, start, end, duration };
}

function describe(r) {
  const from = !r.start.param ? tr('da subito', 'immediately')
    : r.start.param === 'minutesFromNow' ? tr('a partire da ' + r.start.value + ' minuti dopo la richiesta', 'starting ' + r.start.value + ' minutes after the request')
    : tr('a partire dal ' + r.start.value + ' UTC', 'starting on ' + r.start.value + ' UTC');
  const to = !r.end.param ? tr('per 48 ore, la validità predefinita', 'for 48 hours, the default validity')
    : r.end.param === 'minutesFromNow' ? tr('fino a ' + r.end.value + ' minuti dopo la richiesta', 'until ' + r.end.value + ' minutes after the request')
    : r.end.param === 'validityMinutes' ? tr('per ' + r.end.value + ' minuti dall’inizio', 'for ' + r.end.value + ' minutes from the start')
    : tr('fino al ' + r.end.value + ' UTC', 'until ' + r.end.value + ' UTC');
  const length = r.duration ? tr(' Durata complessiva: ' + r.duration + ' minuti.', ' Total duration: ' + r.duration + ' minutes.') : '';
  return tr('Il pagamento è disponibile ', 'The payment is available ') + from + ', ' + to + '.' + length;
}

const summary = $('builderSummary');
function titled(text) {
  const t = B.el('div', 'admonition__title');
  t.innerHTML = B.ICONS.info;   /* constant markup */
  t.append(text);
  return t;
}

function paintSummary() {
  summary.replaceChildren();
  if (B.Session.mode !== 'create') return;
  const body = B.Session.getBody();
  if (!body) return;   /* the send button reports a body that does not parse */
  const r = analyse(body);
  const box = B.el('div', 'admonition summary admonition--' + (r.problems.length ? 'danger' : 'tip'));
  if (r.problems.length) {
    box.append(titled(tr('Da correggere prima di inviare', 'To fix before sending')));
    const ul = B.el('ul');
    r.problems.forEach((p) => ul.append(B.el('li', null, p)));
    box.append(ul);
  } else {
    box.append(titled(tr('La richiesta, in parole', 'The request, in words')));
    box.append(B.el('p', null, tr('Canali: ', 'Channels: ') + r.channels.join(' + ') + '. ' + describe(r)));
  }
  summary.append(box);
}

buildControls(B.Session.slot);

/* ═══════════════════════════════════════════════════════════════════════════
   2. QR CODE
   The string is validated as Base64 before it becomes an image source: only
   the alphabet of Base64 can reach the data URI, so nothing pasted or returned
   can turn into markup or a different URL scheme.
   ═══════════════════════════════════════════════════════════════════════════ */
const qrPanel = $('qrPanel');
const qrImage = $('qrImage');
const qrSize = $('qrSize');
const showQr = B.statusLine($('qrStatus'));
let qrDataUri = '';
let qrRaw = null;

function parseQr(raw) {
  /* Tolerates the forms the value is usually copied in: a JSON string with its
     quotes, a ready-made data URI, or Base64 wrapped across lines. */
  const s = raw.trim().replace(/^"+|"+,?$/g, '').replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return { error: tr('La stringa contiene caratteri che non appartengono al Base64: controlla di aver copiato solo il valore di payload.qrCode.', 'The string contains characters that are not Base64: check that you copied only the value of payload.qrCode.') };
  return { b64: s };
}

function renderQr() {
  const v = B.Session.values();
  if (v.qrCode === qrRaw) return;   /* unchanged: do not reload the image on every keystroke elsewhere */
  qrRaw = v.qrCode;
  qrPanel.hidden = true;
  qrDataUri = '';

  if (!v.qrCode) {
    const hasChannel = v.channels.indexOf('QRCODE') >= 0;
    showQr(
      v.origin === 'manual' ? tr('Incolla la stringa qrCode nella scheda «Ho già link o QR» per vederla qui.', 'Paste the qrCode string in the “I already have a link or QR” tab to see it here.')
      : v.sent ? tr('La risposta non contiene qrCode: la richiesta inviata non aveva QRCODE tra i canali.', 'The response has no qrCode: the request sent did not include QRCODE among its channels.')
      : hasChannel ? tr('QRCODE è tra i canali: invia la richiesta e il QR compare qui.', 'QRCODE is among the channels: send the request and the QR code appears here.')
      : tr('Aggiungi QRCODE ai canali e invia la richiesta: il QR compare qui.', 'Add QRCODE to the channels and send the request: the QR code appears here.'),
      'info');
    return;
  }
  const parsed = parseQr(v.qrCode);
  if (parsed.error) { showQr(parsed.error, 'error'); return; }
  /* The panel is revealed by the load handler: a string that is valid Base64
     but not an image must not leave a broken-image icon on the page. */
  qrDataUri = 'data:image/png;base64,' + parsed.b64;
  qrImage.src = qrDataUri;
}

qrImage.addEventListener('load', () => {
  qrPanel.hidden = false;
  showQr('');
  $('qrMeta').replaceChildren(...B.kvList([
    [tr('Risoluzione', 'Resolution'), qrImage.naturalWidth + ' × ' + qrImage.naturalHeight + ' px'],
    [tr('Peso', 'Size'), (qrDataUri.length * 0.75 / 1024).toFixed(1) + ' KB'],
  ]).childNodes);
});
qrImage.addEventListener('error', () => {
  if (!qrDataUri) return;
  qrPanel.hidden = true;
  showQr(tr('La stringa è Base64 valido ma non è un’immagine leggibile.', 'The string is valid Base64 but not a readable image.'), 'error');
});

qrSize.addEventListener('input', () => {
  qrImage.style.width = qrSize.value + 'px';
  $('qrSizeValue').textContent = qrSize.value;
});
$('qrDownload').addEventListener('click', () => {
  if (!qrDataUri) return;
  const id = B.Session.values().paymentID;
  const a = Object.assign(document.createElement('a'), { href: qrDataUri, download: 'fabrick-qr' + (id ? '-' + id.replace(/[^\w-]/g, '') : '') + '.png' });
  document.body.appendChild(a);
  a.click();
  a.remove();
});
$('qrCopy').addEventListener('click', (e) => { if (qrDataUri) B.copyText(qrDataUri, e.currentTarget); });

/* ═══════════════════════════════════════════════════════════════════════════
   START
   ═══════════════════════════════════════════════════════════════════════════ */
function refresh() {
  syncControls();
  paintSummary();
  renderQr();
}
document.addEventListener('bench:session', refresh);
refresh();

})();
