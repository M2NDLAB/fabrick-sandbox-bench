> 🇮🇹 Italiano (questo file)  —  🇬🇧 **English** · [`README.md`](README.md)

<div align="center">

# Fabrick Sandbox Bench

**Un banco di prova per le integrazioni di Fabrick Payment Orchestra.**
Scegli l'integrazione, invia la richiesta alla sandbox, esegui il flusso.

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Sandbox only](https://img.shields.io/badge/environment-sandbox%20only-orange.svg)](SECURITY.it.md)
[![No build](https://img.shields.io/badge/build-none-brightgreen.svg)](#struttura)

</div>

---

Sei pagine indipendenti, una per integrazione, con la stessa grafica della
documentazione Fabrick a cui si affiancano: stessi colori, stessi caratteri, e un
rimando alla guida in ogni punto in cui un dettaglio conta.

Nessuna build, nessun bundler, nessun `npm install`. Il codice che leggi è il
codice che gira.

> L'interfaccia è disponibile in italiano e in inglese, selezionabile dalla
> navbar. Commenti nel codice e documenti del repository sono in inglese, con il
> corrispondente italiano nei file `*.it.md`.

## Per iniziare

```bash
git clone https://github.com/M2NDLAB/fabrick-sandbox-bench.git
cd fabrick-sandbox-bench
python3 -m http.server 8080
```

Apri <http://localhost:8080>, poi:

1. Apri un'integrazione e inserisci Shop Login e API key della **sandbox**.
2. Controlla il body di `payment/create` — precompilato per quell'integrazione,
   liberamente modificabile — e premi **Invia payment/create**. La richiesta
   parte davvero verso la sandbox.
3. La risposta alimenta la pagina: link, QR Code, componente o pop-up. Esegui il
   flusso con una carta di test.
4. Chiudi il giro con **Verifica esito**, che chiama `GET payment/detail`.

Hai già creato la transazione da Postman o dal tuo server? Ogni pagina tranne
Checkout Page ha una seconda scheda, **Ho già i valori**, dove incolli Payment ID
e Payment Token.

Shop Login e API key restano nel `sessionStorage` della scheda e ti seguono da
una pagina all'altra; una transazione creata resta sulla pagina che l'ha creata,
perché la richiesta giusta cambia da un'integrazione all'altra. Aprire
`index.html` da `file://` funziona, ma è preferibile il server locale: sui file
locali la Clipboard API e altre funzioni del browser sono limitate.

## Le pagine

| Pagina | Cosa fa | Origine dei dati |
|---|---|---|
| **Checkout Page** | Invia la richiesta con il canale `LINK` e apre la pagina di pagamento ospitata (HPPO) | creazione |
| **Pay By Link** | Canali e validità composti nel body, il link, il QR Code reso dalla risposta | creazione, oppure link / QR incollati |
| **Web Components** | Monta `fbk-checkout`, `fbk-card`, `fbk-apple-pay`, `fbk-google-pay` con tutti gli attributi documentati | creazione, oppure valori incollati |
| **Lightbox** | Apre il pop-up con callback o redirect, permette di cambiare la build dell'SDK e gira la card per mostrare il codice di integrazione modificabile | creazione, oppure valori incollati |
| **API Only** | Un form carta che invia `payment/submit` e spiega le tre risposte possibili | creazione, oppure valori incollati |
| **Pulsanti APM** | Pulsanti Klarna, PayPal, Satispay e Amazon Pay sul link di pagamento; sono proposti solo i brand indicati in `paymentType` | creazione, oppure valori incollati |

Ogni pagina di integrazione ha anche **Verifica esito** e, dove il flusso lascia
la pagina, un avviso che legge `Status`, `paymentID` e `paymentToken` quando
Fabrick reindirizza indietro.

### Quale `payment/create` per quale integrazione

| Integrazione | Nel body | Dalla risposta |
|---|---|---|
| Checkout Page | `paymentChannel.channelType: ["LINK"]` | `userRedirect.href` |
| Pay By Link | `channelType` con `LINK`, `QRCODE`, `EMAIL` | `userRedirect.href`, `qrCode` |
| Web Components, Lightbox | senza `paymentChannel` | `paymentID`, `paymentToken` |
| API Only | senza `paymentChannel` | `paymentToken` per `payment/submit` |
| Pulsanti APM | `channelType: ["LINK"]` e un solo `paymentType` | `userRedirect.href` |

## Struttura

```
index.html            home: le sei card di ingresso
checkout.html         Checkout Page (HPPO)
paybylink.html        Pay By Link
webcomponents.html    Web Components — fbk-elements.js nell'<head>
lightbox.html         Lightbox — SDK caricato dal loader della pagina
apionly.html          API Only
buttons.html          Pulsanti APM

assets/css/bench.css          token, navbar, card, form, admonition, footer
assets/css/<pagina>.css       solo ciò che serve a una pagina
assets/js/theme-init.js       imposta tema e lingua prima del primo render
assets/js/i18n.en.js          testo inglese del markup statico
assets/js/core.js             costanti, shell, dati pagamento, link, HTTP, widget
assets/js/<pagina>.js         una sola pagina, nessuna conoscenza delle altre
assets/fonts/                 Rethink Sans, Space Grotesk (SIL OFL 1.1)

wrangler.jsonc                Cloudflare: la radice del repository servita come asset statici
.assetsignore                 file del repository da non pubblicare
_headers                      header di risposta impostati da Cloudflare
```

Tutti i percorsi sono relativi: il sito funziona alla radice di un dominio e
sotto un sotto-percorso.

### Perché documenti separati e non una SPA

Isolamento. `fbk-elements.js` registra custom element, e un custom element
registrato non si può deregistrare; `axerve.js` lascia una variabile globale. In
una SPA convivrebbero per tutta la sessione e una prova contaminerebbe la
successiva.

## Regole non negoziabili

La versione lunga è in [CONTRIBUTING.it.md](CONTRIBUTING.it.md).

1. **Contenimento.** Nessun antenato di `.mount` ha `overflow`, `transform`,
   `filter`, `backdrop-filter`, `perspective`, `will-change` o `contain`:
   intrappolano gli overlay — challenge 3DS, fogli dei wallet — in un riquadro.
2. **Solo sandbox.** Gli endpoint sono costanti congelate, non esiste un
   selettore di ambiente e i link incollati vengono controllati su un elenco di
   host ammessi.
3. **Nessun dato esterno in `innerHTML`.** I valori digitati o restituiti
   arrivano al DOM con `textContent`.
4. **URL di documentazione in un solo punto.** Le pagine scrivono
   `<a data-doc="…">`; l'indirizzo lo fornisce il registro `DOCS` in `core.js`.

## Pubblicazione

Il sito è pubblicato su **Cloudflare Workers** come asset statici, senza uno
script Worker. Il servizio di build di Cloudflare (Workers Builds) è collegato a
questo repository e pubblica da solo:

| Branch | Risultato |
|---|---|
| `master` | produzione, su `https://fabrick-sandbox-bench.<account>.workers.dev` |
| `dev` e gli altri branch | una versione di anteprima con un proprio indirizzo, elencata nelle **Previews** del Worker |

Lo guidano tre file, tutti alla radice del repository:

- `wrangler.jsonc` — il nome del Worker (deve coincidere con quello nella
  dashboard) e il modo in cui sono servite le pagine. Cloudflare serve
  `checkout.html` a `/checkout`: l'indirizzo `.html` risponde con un redirect
  che conserva la query string, quindi URL di ritorno e segnalibri continuano a
  funzionare.
- `.assetsignore` — Cloudflare carica **ogni** file della cartella degli asset,
  anche quelli nascosti. `.git`, `.github`, i documenti Markdown e i file di
  licenza sono elencati qui perché non finiscano mai sul sito.
- `_headers` — `nosniff`, una politica sul referrer, nessun inserimento del
  banco in frame altrui e `noindex`.

GitHub Actions ([`ci.yml`](.github/workflows/ci.yml)) fa solo controlli:
sintassi degli script, riferimenti agli asset, costanti sandbox, elenco dei file
esclusi e una prova a vuoto della configurazione Cloudflare. Non pubblica nulla.

Lo sviluppo avviene su `dev`; `master` riceve solo le versioni stabili. Vedi
[CONTRIBUTING.it.md](CONTRIBUTING.it.md#branch-e-commit).

Per provare in locale il comportamento di Cloudflare (redirect, header, file
esclusi):

```bash
npx wrangler dev
```

## Sicurezza

Il banco invia `payment/create` dal browser, quindi tratta un'API key di
**sandbox**: tenuta solo in `sessionStorage`, inviata solo all'endpoint sandbox
congelato, mai scritta nei log. Tratta anche `paymentID` e `paymentToken`, che
sono credenziali di lettura per 24 ore, e carte di test della sandbox. Dettagli e
superficie di attacco accettata in [SECURITY.it.md](SECURITY.it.md).

> [!WARNING]
> Oscura `paymentID` e `paymentToken` in screenshot e issue.

## Limiti noti

- **La diagnostica in console è solo in italiano.** L'interfaccia è bilingue; le
  righe di log in DevTools non ancora.
- **I link alla documentazione inglese non sono verificati.** Assumono il
  prefisso `/en/` e gli stessi slug delle pagine italiane.
- **Il link ricostruito è dedotto.** Quando la risposta non contiene
  `userRedirect.href`, il banco compone
  `/pbl/a/{shopLogin}/b/{paymentID}/c/{paymentToken}` dagli esempi di
  documentazione e lo indica come ricostruito.
- **I wallet richiedono configurazione.** Senza la configurazione di Apple Pay e
  Google Pay i pulsanti non vengono disegnati.
- **Il pulsante Klarna è disegnato dal banco** attorno al badge ufficiale. Il
  foglio di stile Klarna richiede un markup interno non pubblicato in chiaro.
- **Il logo Fabrick viene caricato a runtime** dal sito della documentazione. Se
  non è raggiungibile, al suo posto compare un marchio testuale.
- **L'esito mostrato da un frontend non è mai definitivo.** Fanno fede solo la
  notifica server-to-server e `payment/detail`.

## Licenza e marchi

[Apache License 2.0](LICENSE) — Copyright 2026 Matteo Secondi (M2NDLAB).

Fabrick, Axerve, Klarna, PayPal, Satispay, Amazon Pay, Apple Pay e Google Pay
sono marchi dei rispettivi titolari. La licenza non concede diritti sui marchi;
loghi e badge vengono caricati a runtime dai server dei titolari e non sono mai
ridistribuiti. I font inclusi sono sotto SIL Open Font License. Vedi
[NOTICE](NOTICE).

---

<div align="center">

Progettato da **M2NDLAB**, scritto da **Claude** — per il payment gateway **Fabrick**.

[Contribuire](CONTRIBUTING.it.md) · [Sicurezza](SECURITY.it.md) · [Codice di condotta](CODE_OF_CONDUCT.it.md) · [Changelog](CHANGELOG.it.md)

</div>
