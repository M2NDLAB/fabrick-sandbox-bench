> 🇬🇧 English (this file)  —  🇮🇹 **Italiano** · [`CHANGELOG.it.md`](CHANGELOG.it.md)

# Changelog

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [2.0.0] — 2026-11-12

A redesign on the look of the Fabrick documentation. The single session console
is gone: every integration page has its own **Dati pagamento** block, which
either sends `payment/create` to the sandbox or takes values you already have.

### Added

- Home page with six entry cards, one per integration.
- **Dati pagamento** on every page: Shop Login, sandbox API key, an editable
  body pre-filled for that integration, a button that sends `payment/create`,
  and a banner with the outcome or the error returned by Fabrick. A second tab
  takes pasted values instead (not on Checkout Page).
- **API Only** page: a card form that posts `payment/submit`, recognises the
  three documented responses and offers the 3DS redirect only towards sandbox
  hosts.
- **Verifica esito** on every integration page: `GET payment/detail`
  authenticated with the Payment Token, with a counter for the sandbox call
  limit.
- Return-from-redirect banner: reads `Status`, `paymentID` and `paymentToken`
  from the URL, then removes them from the address bar.
- Pay By Link: channel and validity controls that patch the body instead of
  rewriting it, a summary of the validity period in words, and the QR code
  rendered from the `qrCode` of the response.
- Pulsanti APM: the brands on offer follow the `paymentType` of the request;
  with pasted values the page says it cannot verify them.
- Lightbox: choice of the SDK build (default, custom URL, pasted code) and a
  card that turns over to show editable integration code, as separate files or
  a single file.
- Italian and English interface, switchable from the navbar.
- Navbar in the manner of the documentation: page menu under "Sandbox Bench",
  icon links to API reference, status page and support.
- `.well-known/` for the Apple Pay domain association file, and a Pages
  workflow that publishes hidden folders.
- Host allow-list for payment links, pasted or returned.
- Self-hosted Rethink Sans and Space Grotesk.

### Changed

- **Visual language aligned with the Fabrick documentation**: primary scale,
  typefaces, navbar, cards, admonitions, tables and footer.
- **Web Components rewritten** on the current documentation: both ways of
  setting the Shop Login, container width, preview background, event log, and
  generated code following the documentation's complete example.
- HPPO page renamed **Checkout Page** (`hppo.html` → `checkout.html`); it uses
  `userRedirect.href` from the response and rebuilds the link, saying so, only
  when the response has none.
- APM buttons simplified: pick the brand, see the button. The Klarna button is
  drawn around Klarna's official badge.
- Created transactions are kept per page, not shared across pages: the right
  request differs per integration. Shop Login and API key are shared.
- The API key is kept in the `sessionStorage` of the tab and sent to the frozen
  sandbox base URL only.
- Comments inside generated code are in English.
- Documentation URLs moved to a single registry in `core.js`.
- The footer is one centred line: the credit and the link to the repository.
- Pages deploys from `master` only; `dev` and pull requests run the checks.

### Removed

- The session console as a separate page, its presets and body-driven routing.
- The Klarna rendering based on Klarna's own stylesheet: without the inner
  markup, which Klarna does not publish in clear, it showed text and no logo.
- The conformance report and asset probe of the APM buttons page.
- The sidebar layout.

## [1.0.0] — 2026-09-18

First release: session console with `payment/create`, and pages for Lightbox,
Web Components, HPPO, Pay By Link and APM buttons.
