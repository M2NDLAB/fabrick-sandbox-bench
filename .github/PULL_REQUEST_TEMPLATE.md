## What changes

<!-- One or two sentences. Link the issue if there is one. -->

## Why

## Checks

- [ ] `for f in assets/js/*.js; do node --check "$f"; done` passes
- [ ] Opened the affected pages in light and dark theme
- [ ] No new ancestor of `.mount` carries overflow, transform, filter or contain
- [ ] No value typed by the user or returned by an API reaches `innerHTML`
- [ ] No new host outside the sandbox allow-list
- [ ] `.md` and `.it.md` updated together, if documents changed
- [ ] No API key, `paymentID` or `paymentToken` in the diff or in screenshots
