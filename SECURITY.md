> 🇬🇧 English (this file)  —  🇮🇹 **Italiano** · [`SECURITY.it.md`](SECURITY.it.md)

# Security policy

## What this project is, and what it is not

Fabrick Sandbox Bench is a **test tool for the sandbox environment**. It is not
a payment library, not a component to mount in a checkout, and not something to
publish on an origin reachable by real buyers.

## Sandbox only, by construction

- The API base URL and the SDK URLs are frozen constants in
  `assets/js/core.js`. There is no environment selector: a tool that *can* point
  at production eventually points at production by accident.
- `payment/create`, `payment/submit` and `payment/detail` are called on that
  base URL only. The API key has no other destination in the code.
- A payment link — pasted, or returned in `userRedirect.href` — is followed
  only if it is `https` and its host is on the allow-list
  (`sandbox-web.axerve.com`, `sandbox.gestpay.net`).
- The 3DS redirect returned by `payment/submit` is offered as a button only
  when it passes the same check.

**One exception, declared.** The Lightbox page can load an alternative SDK
build from a custom `https` URL or from pasted code. That exists to compare SDK
builds, and it means the page will run whatever script you give it. The choice
is stored in `localStorage` and is never read from the URL, so a crafted link
cannot inject a script; but nothing stops *you* from pointing it at a
non-sandbox build. Do not.

## What the bench handles

| Data | Where it lives | Notes |
|---|---|---|
| **Sandbox** API key | `sessionStorage` of the tab | Sent only in the `Authorization` header of `payment/create` on the sandbox base URL. Never written to the event log, the response panel or generated code. Gone when the tab closes |
| `shopLogin`, `paymentID`, `paymentToken`, payment link, the body and the response of `payment/create` | `sessionStorage` of the tab | Sent only to the sandbox hosts above. Gone when the tab closes |
| Card data (API Only page) | memory, for one request | Never stored; masked on screen and in the console; absent from generated code |
| `qrCode` Base64 | memory | Validated as Base64 before it becomes an image source |
| Theme, language, SDK choice, saved integration code | `localStorage` | No credentials |

`paymentID` and `paymentToken` are read credentials for 24 hours. On a return
from a redirect the bench removes them from the address bar after reading them.

### Why an API key in a browser, here and nowhere else

In a real integration `payment/create` belongs on a server: an API key in a
page is readable by every script on that page and by every extension of the
browser. The bench does it anyway because its purpose is to try a request and
see what each integration does with the response, and the key it asks for
opens a sandbox shop only. Three consequences follow:

- the generated code never contains the call to `payment/create`, so nobody
  copies that pattern into a checkout;
- the key is kept for the tab only, not across sessions;
- the bench must not be given a production key, on any origin.

**Never enter production values or real card data.** No check can stop you: the
bench cannot tell a sandbox key from a production one, or a test card from a
real one. A production key sent by mistake has left your machine, whatever the
sandbox answers: rotate it.

## What must never reach a commit, an issue or a screenshot

- API keys, from any environment
- real `paymentID` and `paymentToken` values
- full `payment/detail` responses containing buyer data

## Supported versions

Static files with no installed dependencies: `master` is the supported
version. `dev` is work in progress.

## Reporting a vulnerability

Open a **private Security Advisory** from the repository's *Security* tab, not a
public issue. Say what you observed, how to reproduce it, and which file you
believe is involved. Do not attach credentials.

## Known and accepted attack surface

| Aspect | Status |
|---|---|
| Third-party scripts: Fabrick SDKs | required: they are what is under test |
| No Subresource Integrity on the SDKs | they change without notice; a fixed hash would break them |
| API key in the page | sandbox only, declared above |
| Brand images and the Fabrick logo from their owners' servers | those servers see the request and the page's origin |
| Custom SDK on the Lightbox page | declared above |
| `innerHTML` | constant markup written in the source only |
| `.well-known/` published with the site | holds a public file by design; nothing else belongs there |

What is **not** accepted, and should be reported: any path where a value typed
by the user or returned by an API reaches the DOM as markup, ends up in an event
attribute, or causes a navigation to a host outside the allow-list.
