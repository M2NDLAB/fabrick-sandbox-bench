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
.well-known/                  file di associazione dominio Apple Pay (vedi il suo README)
```

Tutti i percorsi sono relativi: il sito funziona alla radice di un dominio e
sotto `/nome-repository/`. `.nojekyll` impedisce a Jekyll di elaborare `assets/`.

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

Il workflow [`pages.yml`](.github/workflows/pages.yml) pubblica su GitHub Pages a
ogni push su `master`, dopo aver controllato la sintassi degli script e i
riferimenti agli asset; su `dev` e sulle pull request esegue solo i controlli. Si
abilita da **Settings → Pages → Source: GitHub Actions**.

Lo sviluppo avviene su `dev`; `master` riceve solo le versioni stabili. Vedi
[CONTRIBUTING.it.md](CONTRIBUTING.it.md#branch-e-commit).

### Apple Pay richiede il file di associazione del dominio

Perché Apple Pay compaia nei Web Components e nella Lightbox, il dominio deve
servire il file di associazione Fabrick a
`/.well-known/apple-developer-merchantid-domain-association`, **alla radice del
dominio**. Un sito GitHub Pages di progetto vive sotto `/<repository>/`, che non
è la radice: serve un dominio personalizzato, oppure pubblicare il file dal
repository `<owner>.github.io`. Dettagli in
[`.well-known/README.md`](.well-known/README.md).

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
