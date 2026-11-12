/* ═══════════════════════════════════════════════════════════════════════════
   theme-init.js — loaded synchronously in the <head> of every page

   Sets theme and language on <html> BEFORE the first paint, so a visitor who
   chose the dark theme or English never sees a flash of the other one.

   A separate file rather than an inline <script>: the project ships no inline
   script at all, which keeps every page compatible with a Content-Security-
   Policy that forbids them.

   THEME — default LIGHT, deliberately not the operating-system preference: the
   documentation screenshots and the brand guidelines of the payment buttons
   assume a light page, and a tester should get the same picture as a colleague
   unless they asked for something else.

   LANGUAGE — default ITALIAN, the language of the markup. English is applied by
   core.js from a dictionary; until that has happened the body stays hidden
   (see the .t-ready rule in bench.css), so English users do not watch the
   Italian text being replaced.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = document.documentElement;
  var theme = null;
  var lang = null;
  try {
    theme = localStorage.getItem('fbk:bench:theme');
    lang = localStorage.getItem('fbk:bench:lang');
  } catch (e) { /* storage unavailable: defaults apply */ }
  root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  root.setAttribute('lang', lang === 'en' ? 'en' : 'it');
  /* Safety net: if core.js never runs (blocked, syntax error on an old
     browser), reveal the page anyway after a moment. */
  setTimeout(function () { root.classList.add('t-ready'); }, 1500);
})();
