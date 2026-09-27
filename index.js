const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const client = new Client();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('message', (message) => {
  if (message.body === '!ping') {
    message.reply('pong');
  }
});

client.initialize();
