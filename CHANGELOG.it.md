> 🇮🇹 Italiano (questo file)  —  🇬🇧 **English** · [`CHANGELOG.md`](CHANGELOG.md)

# Changelog

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il
progetto adotta il [Semantic Versioning](https://semver.org/lang/it/).

## [Unreleased]

## [2.0.0] — 2026-11-12

Una riprogettazione sull'aspetto della documentazione Fabrick. La console di
sessione unica non c'è più: ogni pagina di integrazione ha il proprio blocco
**Dati pagamento**, che invia `payment/create` alla sandbox oppure riceve valori
che hai già.

### Aggiunto

- Home con sei card di ingresso, una per integrazione.
- **Dati pagamento** in ogni pagina: Shop Login, API key di sandbox, un body
  modificabile precompilato per quell'integrazione, un pulsante che invia
  `payment/create` e un avviso con l'esito o con l'errore restituito da Fabrick.
  Una seconda scheda riceve invece valori incollati (non in Checkout Page).
- Pagina **API Only**: un form carta che invia `payment/submit`, riconosce le
  tre risposte documentate e propone il redirect 3DS solo verso host sandbox.
- **Verifica esito** su ogni pagina di integrazione: `GET payment/detail`
  autenticata con il Payment Token, con il conteggio rispetto al limite di
  chiamate della sandbox.
- Avviso di ritorno da redirect: legge `Status`, `paymentID` e `paymentToken`
  dalla URL e poi li rimuove dalla barra degli indirizzi.
- Pay By Link: controlli di canale e validità che modificano il body senza
  riscriverlo, una sintesi in parole del periodo di validità e il QR Code reso
  dal `qrCode` della risposta.
- Pulsanti APM: i brand proposti seguono il `paymentType` della richiesta; con
  valori incollati la pagina avvisa che non può verificarli.
- Lightbox: scelta della build dell'SDK (default, URL personalizzato, codice
  incollato) e card che si gira per mostrare il codice di integrazione
  modificabile, a file separati o a file unico.
- Interfaccia in italiano e in inglese, selezionabile dalla navbar.
- Navbar alla maniera della documentazione: menu delle pagine sotto «Sandbox
  Bench», icone verso API reference, status page e supporto.
- `.well-known/` per il file di associazione dominio Apple Pay, e un workflow
  Pages che pubblica le cartelle nascoste.
- Elenco di host ammessi per i link di pagamento, incollati o restituiti.
- Rethink Sans e Space Grotesk ospitati nel repository.

### Modificato

- **Grafica allineata alla documentazione Fabrick**: scala del colore primario,
  caratteri, navbar, card, admonition, tabelle e footer.
- **Web Components riscritta** sulla documentazione attuale: entrambe le
  modalità di impostazione dello Shop Login, larghezza del contenitore, sfondo
  dell'anteprima, registro eventi e codice generato secondo l'esempio completo
  della documentazione.
- Pagina HPPO rinominata **Checkout Page** (`hppo.html` → `checkout.html`); usa
  `userRedirect.href` della risposta e ricostruisce il link, dichiarandolo, solo
  quando la risposta non lo contiene.
- Pulsanti APM semplificati: scegli il brand, vedi il pulsante. Il pulsante
  Klarna è disegnato attorno al badge ufficiale Klarna.
- Le transazioni create restano sulla pagina che le ha create, non sono
  condivise: la richiesta giusta cambia da un'integrazione all'altra. Shop Login
  e API key sono condivisi.
- L'API key è tenuta nel `sessionStorage` della scheda e inviata solo all'URL
  base congelato della sandbox.
- I commenti nel codice generato sono in inglese.
- URL della documentazione spostati in un unico registro in `core.js`.
- Il footer è una riga centrata: i crediti e il link al repository.
- Pages pubblica solo da `master`; `dev` e le pull request eseguono i controlli.

### Rimosso

- La console di sessione come pagina separata, i suoi preset e l'instradamento
  basato sul body.
- La resa Klarna basata sul foglio di stile di Klarna: senza il markup interno,
  che Klarna non pubblica in chiaro, mostrava il testo e nessun logo.
- Il referto di conformità e la sonda degli asset nella pagina Pulsanti APM.
- Il layout con barra laterale.

## [1.0.0] — 2026-09-18

Prima versione: console di sessione con `payment/create` e pagine Lightbox, Web
Components, HPPO, Pay By Link e Pulsanti APM.
