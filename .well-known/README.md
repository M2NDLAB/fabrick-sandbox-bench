# `.well-known/`

Apple Pay, in the Web Components and in the Lightbox, works only on a domain
that serves Fabrick's domain association file at exactly this path:

```
https://<your-domain>/.well-known/apple-developer-merchantid-domain-association
```

The file is **not in the repository yet**: it has to be downloaded from Fabrick
and committed here, with that exact name and no extension.

```powershell
Invoke-WebRequest `
  -Uri "https://web.fabrick.com/.well-known/apple-developer-merchantid-domain-association" `
  -OutFile ".well-known\apple-developer-merchantid-domain-association"
```

```bash
curl -fsSL https://web.fabrick.com/.well-known/apple-developer-merchantid-domain-association \
  -o .well-known/apple-developer-merchantid-domain-association
```

Three things must be true for Apple to accept it:

1. **The path starts at the root of the domain.** A GitHub Pages *project* site
   lives under `https://<owner>.github.io/<repository>/`, so this folder ends up
   at `/<repository>/.well-known/…` — not where Apple looks. It is at the root
   only with a custom domain for this repository, or if the file is published
   from the `<owner>.github.io` repository.
2. **It is reachable publicly, with no authentication and no redirect.**
3. **The domain has been communicated to your Fabrick contact**, who completes
   the registration.

The Pages workflow packages hidden folders explicitly, because the stock
`upload-pages-artifact` action leaves them out from v4 onwards.

---

Italiano: Apple Pay, nei Web Components e nella Lightbox, funziona solo su un
dominio che serve il file di associazione Fabrick a questo percorso esatto, alla
radice del dominio. Il file non è ancora nel repository: va scaricato da Fabrick
con uno dei comandi qui sopra e committato in questa cartella. Su un sito GitHub
Pages di progetto la cartella finisce sotto `/<repository>/`, quindi non alla
radice: serve un dominio personalizzato, oppure pubblicare il file dal repository
`<owner>.github.io`. Il dominio va poi comunicato al referente Fabrick.
