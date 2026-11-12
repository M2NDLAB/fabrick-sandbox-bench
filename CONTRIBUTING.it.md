> 🇮🇹 Italiano (questo file)  —  🇬🇧 **English** · [`CONTRIBUTING.md`](CONTRIBUTING.md)

# Contribuire

Il progetto è piccolo e non ha una catena di build: clonalo, servi la cartella,
lavora.

## Eseguirlo in locale

```bash
git clone https://github.com/M2NDLAB/fabrick-sandbox-bench.git
cd fabrick-sandbox-bench
python3 -m http.server 8080   # oppure: npx serve .
```

Nessun `npm install`, nessun bundler, nessuna transpilazione. È una scelta: il
codice che leggi è il codice che gira.

## Politica di lingua

**Codice e commenti: inglese.** I commenti bilingui sono un rischio: alla prima
modifica uno dei due resta indietro, e da lì metà dei commenti mente.

**Documenti del repository: bilingui.** L'inglese è canonico in `FILE.md`; il
corrispondente italiano è `FILE.it.md`. Aggiornali nello stesso commit.

**Interfaccia: italiano e inglese.** L'italiano segue il lessico della
documentazione Fabrick ed è la lingua del markup. Due meccanismi, uno per tipo
di testo:

- il testo scritto in uno script passa da `Bench.tr('testo italiano', 'English
  text')`;
- il testo scritto in un documento HTML porta una chiave `data-t="pagina.n"`, e
  il corrispondente inglese sta sotto quella chiave in `assets/js/i18n.en.js`
  (`data-t-attr="placeholder:pagina.n"` per un attributo).

Una stringa aggiunta in una sola lingua è un difetto: il workflow elenca le
chiavi `data-t` senza voce inglese. I commenti dentro il codice *generato* sono
in inglese, come ogni altro commento. La diagnostica in console è ancora solo in
italiano.

## Le regole non in discussione

Una pull request che ne viola una non viene accettata anche se funziona.

### 1. Contenimento

Nessun antenato di `.mount` può avere:

```
overflow: hidden | auto | scroll
transform, filter, backdrop-filter, perspective, will-change
contain: paint | layout | strict
```

La prima ritaglia i discendenti posizionati. Le altre creano un containing block
che aggancia anche gli elementi `position: fixed` a quell'antenato invece che al
viewport. Un componente di pagamento apre overlay — challenge 3DS, fogli dei
wallet — e intrappolato in un riquadro il flusso non può concludersi.

Lo scroll è confinato a `.scroll-x`, che contiene codice e tabelle. `position:
sticky` è sicuro. Due punti violano la regola di proposito e spiegano perché nel
proprio foglio di stile: la home, che non monta nulla, e la card che si gira
nella pagina Lightbox, il cui overlay viene aggiunto a `<body>` dall'SDK.

### 2. Solo sandbox

Gli endpoint sono costanti in `core.js`. Non aggiungere un selettore di
ambiente, un parametro di query che cambi un host o un percorso di codice che
segua un URL senza `checkSandboxUrl()`.

### 3. Nessun dato esterno in `innerHTML`

`innerHTML` serve per il markup scritto nel sorgente: registri, icone, struttura
della pagina. Ciò che l'utente digita o un'API restituisce passa da
`textContent`, oppure da `esc()` / `jsLiteral()` quando deve stare dentro una
stringa generata.

### 4. Gli URL di documentazione stanno in `DOCS`

Le pagine scrivono `<a data-doc="lightbox">…</a>`; l'indirizzo lo fornisce
`core.js`. Quando uno slug cambia nella documentazione, qui cambia una riga.

### 5. Nessuno script inline

Ogni pagina carica solo file esterni, così il sito resta compatibile con una
Content-Security-Policy che vieta gli script inline.

## Dove stanno le cose

| File | Responsabilità |
|---|---|
| `assets/js/core.js` | costanti, shell, blocco dei dati pagamento (`Session`), risoluzione del link, HTTP, widget condivisi |
| `assets/js/i18n.en.js` | testo inglese del markup statico, per chiave `data-t` |
| `assets/js/<pagina>.js` | una sola pagina, nessuna conoscenza delle altre |
| `assets/css/bench.css` | token di design e tutti i componenti condivisi |
| `assets/css/<pagina>.css` | solo ciò che serve a una pagina |

### Token di design

`bench.css` trascrive i token del sito della documentazione. Se il tema della
documentazione cambia, cambia i token in testa a quel file; non scrivere un
colore a mano in un foglio di stile di pagina.

### Aggiungere una pagina di integrazione

Un oggetto in `PAGES` dentro `core.js`: menu della navbar, card della home e
breadcrumb seguono. Poi il documento HTML e il suo script, che inizia con
`Bench.boot('<id>')` e monta il blocco dei dati pagamento con
`Bench.Session.mount(host, { page, modes, template })`. Il `template` è il body
di `payment/create` adatto a quell'integrazione; la pagina legge l'esito da
`Bench.Session.values()` e non chiama mai `payment/create` da sé.

### Aggiungere un Web Component o un attributo

Una voce in `COMPONENTS` dentro `webcomponents.js`, trascritta dalla
documentazione con valori ammessi e default dichiarati. Segna con `wallet` ogni
attributo che riguarda un pulsante Apple Pay o Google Pay.

### Aggiungere un brand alla pagina Pulsanti APM

Un oggetto in `METHODS` dentro `buttons.js`. Ogni affermazione su una regola di
brand porta con sé la fonte. Un asset è `sure: true` solo se il suo URL compare
in una pagina ufficiale del brand che hai letto di persona. La `request()` del
brand restituisce il body che lo abilita; un pulsante viene proposto solo quando
il suo `paymentType` è nella richiesta inviata.

## Prima di aprire una pull request

```bash
for f in assets/js/*.js; do node --check "$f" || exit 1; done
```

Poi, a mano:

- [ ] apri le sette pagine in tema **chiaro** e **scuro**, in **entrambe le lingue**
- [ ] nessun nuovo antenato di `.mount` ha overflow o transform
- [ ] Shop Login e API key inseriti in una pagina ci sono ancora nella successiva
- [ ] l'API key non compare in nessuna riga di log, pannello di risposta o codice generato
- [ ] nessuna credenziale negli screenshot allegati
- [ ] se hai toccato un `.md`, il corrispondente `.it.md` è aggiornato

## Branch e commit

```
feature/…  ─┐
fix/…      ─┼─►  dev  ──(versione stabile)──►  master  ──►  GitHub Pages
docs/…     ─┘
```

- `master` è ciò che viene pubblicato. Riceve un merge da `dev` solo quando
  `dev` è una versione stabile, e ogni merge di questo tipo riceve un tag
  (`v2.1.0`).
- `dev` è il branch di integrazione. Riceve i branch di funzionalità e di
  correzione tramite pull request.
- Un branch per ogni funzionalità o correzione, con un nome che dica cosa fa
  (`feature/…`, `fix/…`), creato a partire da `dev`. Nessun commit diretto su
  `dev` o su `master`.
- Una correzione che non può aspettare parte da `master` come `hotfix/…`, viene
  integrata in `master`, e `master` viene subito riportato in `dev`.

Formato [Conventional Commits](https://www.conventionalcommits.org/), una
modifica logica per commit:

```
feat(apionly): offer the 3DS redirect only towards sandbox hosts
fix(webcomponents): remount when an attribute changes
docs(security): declare the custom SDK exception
```
