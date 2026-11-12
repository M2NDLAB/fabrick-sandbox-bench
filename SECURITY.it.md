> 🇮🇹 Italiano (questo file)  —  🇬🇧 **English** · [`SECURITY.md`](SECURITY.md)

# Politica di sicurezza

## Cos'è questo progetto, e cosa non è

Fabrick Sandbox Bench è uno **strumento di prova per l'ambiente sandbox**. Non è
una libreria di pagamento, non è un componente da montare in un checkout e non
va pubblicato su un'origine raggiungibile da buyer reali.

## Solo sandbox, per costruzione

- L'URL base delle API e gli URL degli SDK sono costanti congelate in
  `assets/js/core.js`. Non esiste un selettore di ambiente: uno strumento che
  *può* puntare alla produzione prima o poi ci punta per errore.
- `payment/create`, `payment/submit` e `payment/detail` vengono chiamate solo su
  quell'URL base. Nel codice l'API key non ha altra destinazione.
- Un link di pagamento — incollato, o restituito in `userRedirect.href` — viene
  seguito solo se è `https` e il suo host è nell'elenco ammesso
  (`sandbox-web.axerve.com`, `sandbox.gestpay.net`).
- Il redirect 3DS restituito da `payment/submit` viene proposto come pulsante
  solo se supera lo stesso controllo.

**Un'eccezione, dichiarata.** La pagina Lightbox può caricare una build
alternativa dell'SDK da un URL `https` personalizzato o da codice incollato.
Serve a confrontare build dell'SDK, e significa che la pagina esegue lo script
che le dai. La scelta è salvata in `localStorage` e non viene mai letta dalla
URL, quindi un link costruito ad arte non può iniettare uno script; ma nulla
impedisce *a te* di puntarla a una build non sandbox. Non farlo.

## Cosa tratta il banco

| Dato | Dove vive | Note |
|---|---|---|
| API key di **sandbox** | `sessionStorage` della scheda | Inviata solo nell'header `Authorization` di `payment/create` sull'URL base della sandbox. Mai scritta nel registro eventi, nel pannello della risposta o nel codice generato. Sparisce alla chiusura della scheda |
| `shopLogin`, `paymentID`, `paymentToken`, link di pagamento, body e risposta di `payment/create` | `sessionStorage` della scheda | Inviati solo agli host sandbox indicati sopra. Spariscono alla chiusura della scheda |
| Dati carta (pagina API Only) | memoria, per una richiesta | Mai salvati; mascherati a video e in console; assenti dal codice generato |
| `qrCode` Base64 | memoria | Validato come Base64 prima di diventare sorgente di un'immagine |
| Tema, lingua, scelta dell'SDK, codice di integrazione salvato | `localStorage` | Nessuna credenziale |

`paymentID` e `paymentToken` sono credenziali di lettura per 24 ore. Al ritorno
da un redirect il banco li rimuove dalla barra degli indirizzi dopo averli letti.

### Perché un'API key nel browser, qui e in nessun altro posto

In un'integrazione reale `payment/create` va eseguita su un server: un'API key in
una pagina è leggibile da ogni script di quella pagina e da ogni estensione del
browser. Il banco lo fa comunque perché il suo scopo è provare una richiesta e
vedere cosa fa ciascuna integrazione con la risposta, e la chiave che chiede
apre soltanto uno shop di sandbox. Ne seguono tre conseguenze:

- il codice generato non contiene mai la chiamata a `payment/create`, così
  nessuno copia quello schema in un checkout;
- la chiave resta solo per la scheda, non tra una sessione e l'altra;
- al banco non va data una chiave di produzione, su nessuna origine.

**Non inserire mai valori di produzione o dati di carte reali.** Nessun
controllo può impedirlo: il banco non distingue una chiave di sandbox da una di
produzione, né una carta di test da una reale. Una chiave di produzione inviata
per errore ha lasciato la tua macchina, qualunque cosa risponda la sandbox: va
rigenerata.

## Cosa non deve mai finire in un commit, in una issue o in uno screenshot

- API key, di qualsiasi ambiente
- valori reali di `paymentID` e `paymentToken`
- risposte complete di `payment/detail` con dati del buyer

## Versioni supportate

File statici senza dipendenze installate: `master` è la versione supportata.
`dev` è lavoro in corso.

## Segnalare una vulnerabilità

Apri una **Security Advisory privata** dalla scheda *Security* del repository,
non una issue pubblica. Indica cosa hai osservato, come riprodurlo e quale file
ritieni coinvolto. Non allegare credenziali.

## Superficie di attacco nota e accettata

| Aspetto | Stato |
|---|---|
| Script di terze parti: SDK Fabrick | necessari: sono l'oggetto della prova |
| Nessuna Subresource Integrity sugli SDK | cambiano senza preavviso; un hash fisso li romperebbe |
| API key nella pagina | solo sandbox, dichiarato sopra |
| Immagini dei brand e logo Fabrick dai server dei titolari | quei server vedono la richiesta e l'origine della pagina |
| SDK personalizzato nella pagina Lightbox | dichiarato sopra |
| `innerHTML` | solo markup costante scritto nel sorgente |
| `.well-known/` pubblicata con il sito | contiene per sua natura un file pubblico; non deve contenere altro |

Cosa **non** è accettato, e va segnalato: qualsiasi percorso in cui un valore
digitato dall'utente o restituito da un'API arrivi al DOM come markup, finisca
in un attributo evento o provochi una navigazione verso un host fuori
dall'elenco ammesso.
