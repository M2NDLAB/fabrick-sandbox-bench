/* ═══════════════════════════════════════════════════════════════════════════
   checkout.js — checkout.html (Hosted Payment Page Orchestra)

   This integration has no SDK: the whole front-end is "send the buyer to a
   URL", and the URL comes from the response of payment/create. So the page is
   create-only: it sends the request for real and uses userRedirect.href. There
   is no tab for pasted values here, because pasting a paymentID and a
   paymentToken into a page whose only output is a link has nothing to act on.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

const B = window.Bench;
const $ = B.$;

B.boot('checkout');
B.Session.mount($('sessionFields'), {
  page: 'checkout',
  modes: ['create'],
  /* The documentation's HPPO request: the LINK channel is what makes Fabrick
     return userRedirect.href. */
  template: (shopLogin) => ({
    shopLogin,
    amount: '100',
    currency: 'EUR',
    shopTransactionID: 'FBK_OrderID',
    paymentChannel: { channelType: ['LINK'] },
  }),
});
B.returnBanner($('returnHost'));
B.returnTip($('returnTip'));
B.detailCard($('detailCard'));

const link = B.linkCard($('linkHost'));

function generate() {
  const resolved = link.get();
  const url = resolved.ok ? resolved.url : 'https://sandbox-web.axerve.com/orchestra/checkout/pbl/a/GESPAY12345/b/PAYMENT_ID/c/PAYMENT_TOKEN';
  return [
    {
      name: 'redirect.js', mime: 'text/javascript',
      code:
        '/*\n' +
        ' * Hosted Payment Page Orchestra\n' +
        ' * ' + B.DOCS.checkout + '\n' +
        ' *\n' +
        ' * The link is payload.userRedirect.href from the response of\n' +
        ' * POST /payment/create, called SERVER-SIDE with your API key and with\n' +
        ' * paymentChannel.channelType set to ["LINK"].\n' +
        ' */\n' +
        'const paymentUrl = ' + B.jsLiteral(url) + ';\n\n' +
        '// Send the buyer to the Fabrick payment page.\n' +
        '// assign() keeps the cart page in the history, so the buyer can go back;\n' +
        '// use replace() if they must not.\n' +
        'window.location.assign(paymentUrl);\n',
    },
    {
      name: 'button.html', mime: 'text/html',
      code:
        '<!-- The link can sit under a button of your checkout, or in an email\n' +
        '     or a message: it is the same URL. -->\n' +
        '<a class="pay-button" href="' + B.esc(url) + '">' + B.tr('Vai al pagamento', 'Go to payment') + '</a>\n',
    },
  ];
}

const code = B.codeCard($('codeHost'), generate);
/* linkCard listens to the same event and was registered first, so by the time
   this runs the resolved link is already up to date. */
document.addEventListener('bench:session', () => code.refresh());

})();
