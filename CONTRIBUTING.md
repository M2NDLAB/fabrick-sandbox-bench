> 🇬🇧 English (this file)  —  🇮🇹 **Italiano** · [`CONTRIBUTING.it.md`](CONTRIBUTING.it.md)

# Contributing

The project is small and has no build chain: clone it, serve the folder, work.

## Running it locally

```bash
git clone https://github.com/M2NDLAB/fabrick-sandbox-bench.git
cd fabrick-sandbox-bench
python3 -m http.server 8080   # or: npx serve .
```

No `npm install`, no bundler, no transpilation. That is deliberate: the code you
read is the code that runs.

## Language policy

**Code and code comments: English.** Bilingual comments are a liability: on the
first edit one of the two falls behind, and from then on half the comments lie.

**Repository documents: bilingual.** English is canonical in `FILE.md`; the
Italian counterpart is `FILE.it.md`. Update both in the same commit.

**User interface: Italian and English.** Italian mirrors the wording of the
Fabrick documentation and is the language of the markup. Two mechanisms, one
per kind of text:

- text written in a script goes through `Bench.tr('testo italiano', 'English
  text')`;
- text written in an HTML document carries a `data-t="page.n"` key, and the
  English counterpart lives under that key in `assets/js/i18n.en.js`
  (`data-t-attr="placeholder:page.n"` for an attribute).

A string added in one language only is a bug: the workflow lists the `data-t`
keys with no English entry. Comments inside *generated* code are English, like
every other comment. Console diagnostics are still Italian only.

## The rules that are not up for discussion

A pull request that breaks one of these is not accepted even if it works.

### 1. Containment

No ancestor of `.mount` may carry:

```
overflow: hidden | auto | scroll
transform, filter, backdrop-filter, perspective, will-change
contain: paint | layout | strict
```

The first clips positioned descendants. The others establish a containing block
that anchors even `position: fixed` elements to that ancestor instead of the
viewport. A payment component opens overlays — the 3DS challenge, wallet sheets
— and trapped in a panel the flow cannot complete.

Scrolling is confined to `.scroll-x`, which holds code and tables. `position:
sticky` is safe. Two places break the rule on purpose and say why in their
stylesheet: the home page, which mounts nothing, and the flip card of the
Lightbox page, whose overlay is appended to `<body>` by the SDK.

### 2. Sandbox only

Endpoints are constants in `core.js`. Do not add an environment selector, a
query parameter that changes a host, or a code path that follows a URL without
`checkSandboxUrl()`.

### 3. No external data in `innerHTML`

`innerHTML` is for markup written in the source — registries, icons, page
shell. Anything typed by the user or returned by an API goes through
`textContent`, or through `esc()` / `jsLiteral()` when it must sit inside a
generated string.

### 4. Documentation URLs live in `DOCS`

Pages write `<a data-doc="lightbox">…</a>`; `core.js` supplies the address. When
a slug changes in the documentation, one line changes here.

### 5. No inline scripts

Every page loads external files only, so the site stays compatible with a
Content-Security-Policy that forbids inline script.

## Where things live

| File | Responsibility |
|---|---|
| `assets/js/core.js` | constants, shell, the payment data block (`Session`), link resolution, HTTP, shared widgets |
| `assets/js/i18n.en.js` | English text for the static markup, by `data-t` key |
| `assets/js/<page>.js` | one page only, no knowledge of the others |
| `assets/css/bench.css` | design tokens and every shared component |
| `assets/css/<page>.css` | only what one page needs |

### Design tokens

`bench.css` transcribes the tokens of the documentation site. If the
documentation theme changes, change the tokens at the top of that file; do not
hard-code a colour in a page stylesheet.

### Adding an integration page

One object in `PAGES` inside `core.js`: the navbar menu, the home card and the
breadcrumbs follow. Then the HTML document and its script, which starts with
`Bench.boot('<id>')` and mounts the payment data block with
`Bench.Session.mount(host, { page, modes, template })`. The `template` is the
body of `payment/create` that suits that integration; the page reads the
outcome from `Bench.Session.values()` and never calls `payment/create` itself.

### Adding a Web Component or an attribute

One entry in `COMPONENTS` inside `webcomponents.js`, transcribed from the
documentation with allowed values and declared defaults. Flag with `wallet` any
attribute that styles an Apple Pay or Google Pay button.

### Adding a brand to the APM buttons page

One object in `METHODS` inside `buttons.js`. Every claim about a brand rule
ships with its source. An asset is `sure: true` only if its URL appears on an
official brand page you have read yourself. The `request()` of the brand
returns the body that enables it; a button is offered only when its
`paymentType` is in the request that was sent.

## Before opening a pull request

```bash
for f in assets/js/*.js; do node --check "$f" || exit 1; done
```

Then, by hand:

- [ ] open the seven pages in **light** and **dark** theme, in **both languages**
- [ ] no new ancestor of `.mount` carries overflow or transform
- [ ] Shop Login and API key typed on one page are still there on the next
- [ ] the API key appears in no log line, response panel or generated code
- [ ] no credentials in attached screenshots
- [ ] if you touched a `.md`, the `.it.md` counterpart is updated too

## Branches and commits

```
feature/…  ─┐
fix/…      ─┼─►  dev  ──(stable version)──►  master  ──►  Cloudflare
docs/…     ─┘
```

- `master` is what is published. It receives a merge from `dev` only when
  `dev` is a stable version, and every such merge is tagged (`v2.1.0`).
- Every push to `dev` produces a Cloudflare preview with its own address:
  check it there before merging into `master`.
- `dev` is the integration branch. It receives feature and fix branches
  through pull requests.
- One branch per feature or fix, named for what it does (`feature/…`,
  `fix/…`), started from `dev`. No direct commits on `dev` or `master`.
- A fix that cannot wait starts from `master` as `hotfix/…`, is merged into
  `master`, and `master` is merged back into `dev` straight away.

[Conventional Commits](https://www.conventionalcommits.org/) format, one logical
change per commit:

```
feat(apionly): offer the 3DS redirect only towards sandbox hosts
fix(webcomponents): remount when an attribute changes
docs(security): declare the custom SDK exception
```
