> 🇬🇧 English (this file)  —  🇮🇹 **Italiano** · [`README.it.md`](README.it.md)

<div align="center">

# Fabrick Sandbox Bench

**A test bench for the integrations of Fabrick Payment Orchestra.**
Pick an integration, send the request to the sandbox, run the flow.

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Sandbox only](https://img.shields.io/badge/environment-sandbox%20only-orange.svg)](SECURITY.md)
[![No build](https://img.shields.io/badge/build-none-brightgreen.svg)](#layout)

</div>

---

Six independent pages, one per integration, styled like the Fabrick
documentation they sit next to: same colours, same typefaces, links back to the
relevant guide at every point where a detail matters.

No build, no bundler, no `npm install`. The code you read is the code that runs.

> The interface is available in Italian and English, switchable from the
> navbar. Code comments and repository documents are in English, with Italian
> counterparts in the `*.it.md` files.

## Getting started

```bash
git clone https://github.com/M2NDLAB/fabrick-sandbox-bench.git
cd fabrick-sandbox-bench
python3 -m http.server 8080
```

Open <http://localhost:8080>, then:

1. Open an integration and enter the Shop Login and the **sandbox** API key.
2. Check the body of `payment/create` — pre-filled for that integration, freely
   editable — and press **Invia payment/create**. The request really goes to
   the sandbox.
3. The response feeds the page: link, QR code, component or pop-up. Run the
   flow with a test card.
4. Close the loop with **Verifica esito**, which calls `GET payment/detail`.

Already created the transaction from Postman or your server? Every page except
Checkout Page has a second tab, **Ho già i valori**, where you paste Payment ID
and Payment Token instead.

Shop Login and API key stay in the tab's `sessionStorage` and follow you from
one page to the next; a created transaction stays on the page that created it,
because the right request differs per integration. Opening `index.html` over
`file://` works, but prefer the local server: the Clipboard API and other
browser features are restricted on local files.

## The pages

| Page | What it does | Data source |
|---|---|---|
| **Checkout Page** | Sends the request with the `LINK` channel and opens the hosted payment page (HPPO) | create |
| **Pay By Link** | Channels and validity composed into the body, the link, the QR code rendered from the response | create, or pasted link / QR |
| **Web Components** | Mounts `fbk-checkout`, `fbk-card`, `fbk-apple-pay`, `fbk-google-pay` with every documented attribute | create, or pasted values |
| **Lightbox** | Opens the pop-up with callback or redirect, lets you swap the SDK build, and turns the card over to show editable integration code | create, or pasted values |
| **API Only** | A card form that posts `payment/submit` and explains the three possible responses | create, or pasted values |
| **Pulsanti APM** | Klarna, PayPal, Satispay and Amazon Pay buttons on the payment link; only the brands named in `paymentType` are offered | create, or pasted values |

Every integration page also has **Verifica esito** and, where the flow leaves
the page, a banner that reads `Status`, `paymentID` and `paymentToken` when
Fabrick redirects back.

### Which `payment/create` for which integration

| Integration | In the body | From the response |
|---|---|---|
| Checkout Page | `paymentChannel.channelType: ["LINK"]` | `userRedirect.href` |
| Pay By Link | `channelType` with `LINK`, `QRCODE`, `EMAIL` | `userRedirect.href`, `qrCode` |
| Web Components, Lightbox | no `paymentChannel` | `paymentID`, `paymentToken` |
| API Only | no `paymentChannel` | `paymentToken` for `payment/submit` |
| Pulsanti APM | `channelType: ["LINK"]` and a single `paymentType` | `userRedirect.href` |

## Layout

```
index.html            home: the six entry cards
checkout.html         Checkout Page (HPPO)
paybylink.html        Pay By Link
webcomponents.html    Web Components — fbk-elements.js in the <head>
lightbox.html         Lightbox — SDK loaded by the page's own loader
apionly.html          API Only
buttons.html          APM buttons

assets/css/bench.css          tokens, navbar, cards, forms, admonitions, footer
assets/css/<page>.css         only what one page needs
assets/js/theme-init.js       sets theme and language before first paint
assets/js/i18n.en.js          English text for the static markup
assets/js/core.js             constants, shell, payment data, links, HTTP, widgets
assets/js/<page>.js           one page only, no knowledge of the others
assets/fonts/                 Rethink Sans, Space Grotesk (SIL OFL 1.1)

wrangler.jsonc                Cloudflare: the repository root served as static assets
.assetsignore                 repository files that must not be published
_headers                      response headers set by Cloudflare
```

All paths are relative: the site works at a domain root and under a
sub-path.

### Why separate documents and not a SPA

Isolation. `fbk-elements.js` registers custom elements, and a registered custom
element cannot be unregistered; `axerve.js` leaves a global behind. In a SPA
both would coexist for the whole session and one test would contaminate the
next.

## Rules that are not up for discussion

The long version lives in [CONTRIBUTING.md](CONTRIBUTING.md).

1. **Containment.** No ancestor of `.mount` carries `overflow`, `transform`,
   `filter`, `backdrop-filter`, `perspective`, `will-change` or `contain`. They
   trap overlays — the 3DS challenge, wallet sheets — inside a panel.
2. **Sandbox only.** Endpoints are frozen constants, there is no environment
   selector, and pasted payment links are checked against a host allow-list.
3. **No external data in `innerHTML`.** Typed or returned values reach the DOM
   through `textContent`.
4. **Documentation URLs in one place.** Pages write `<a data-doc="…">`; the
   `DOCS` registry in `core.js` supplies the address.

## Publishing

The site is published on **Cloudflare Workers** as static assets, with no
Worker script. Cloudflare's own build service (Workers Builds) is connected to
this repository and deploys on its own:

| Branch | Result |
|---|---|
| `master` | production, at `https://fabrick-sandbox-bench.<account>.workers.dev` |
| `dev` and other branches | a preview version with its own address, listed under the Worker's **Previews** |

Three files drive it, all at the repository root:

- `wrangler.jsonc` — the Worker name (it must match the name in the
  dashboard) and how pages are served. Cloudflare serves `checkout.html` at
  `/checkout`: the `.html` address answers with a redirect that keeps the
  query string, so return URLs and bookmarks keep working.
- `.assetsignore` — Cloudflare uploads **every** file under the asset
  directory, hidden ones included. `.git`, `.github`, the Markdown documents
  and the licence files are listed here so that they never reach the website.
- `_headers` — `nosniff`, a referrer policy, no framing of the bench and
  `noindex`.

GitHub Actions ([`ci.yml`](.github/workflows/ci.yml)) only checks: script
syntax, asset references, the sandbox constants, the ignore list and a dry run
of the Cloudflare configuration. It publishes nothing.

Development happens on `dev`; `master` receives stable versions only. See
[CONTRIBUTING.md](CONTRIBUTING.md#branches-and-commits).

To try the Cloudflare behaviour locally (redirects, headers, ignored files):

```bash
npx wrangler dev
```

## Security

The bench sends `payment/create` from the browser, so it handles a **sandbox**
API key: kept in `sessionStorage` only, sent to the frozen sandbox endpoint
only, never logged. It also handles `paymentID` and `paymentToken`, which are
read credentials for 24 hours, and sandbox test cards. Details and the accepted
attack surface are in [SECURITY.md](SECURITY.md).

> [!WARNING]
> Redact `paymentID` and `paymentToken` in screenshots and issues.

## Known limits

- **Console diagnostics are in Italian only.** The interface is bilingual; the
  log lines in DevTools are not yet.
- **English documentation links are unverified.** They assume the `/en/`
  prefix and the same slugs as the Italian pages.
- **The rebuilt link is inferred.** When the response has no
  `userRedirect.href`, the bench composes
  `/pbl/a/{shopLogin}/b/{paymentID}/c/{paymentToken}` from the documentation
  examples and labels it as rebuilt.
- **Wallets need configuration.** Without the Apple Pay and Google Pay setup the
  buttons are not drawn.
- **The Klarna button is drawn by the bench** around Klarna's official badge.
  Klarna's own stylesheet needs inner markup that is not published in clear.
- **The Fabrick logo is fetched at runtime** from the documentation site. If it
  cannot be loaded, a text wordmark takes its place.
- **The outcome shown by a front-end is never authoritative.** Only the
  server-to-server notification and `payment/detail` are.

## Licence and trademarks

[Apache License 2.0](LICENSE) — Copyright 2026 Matteo Secondi (M2NDLAB).

Fabrick, Axerve, Klarna, PayPal, Satispay, Amazon Pay, Apple Pay and Google Pay
are trademarks of their respective owners. The licence grants no trademark
rights; logos and badges are fetched at runtime from their owners' servers and
never redistributed. The bundled fonts are under the SIL Open Font License. See
[NOTICE](NOTICE).

---

<div align="center">

Designed by **M2NDLAB**, written by **Claude** — for the **Fabrick** payment gateway.

[Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Changelog](CHANGELOG.md)

</div>
