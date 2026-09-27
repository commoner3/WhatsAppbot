// Anti-delete message functionality
const store = require('./store');

function enableAntiDelete(client) {
  client.on('message_revoke_me', (after, before) => {
    console.log('Message was revoked');
    if (before) {
      before.reply(`[Anti-Delete] Original message: ${before.body}`);
    }
  });
}

module.exports = { enableAntiDelete };
