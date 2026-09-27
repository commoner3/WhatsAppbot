// web/server.js
// A tiny web UI so a user can link their WhatsApp number by entering it (with country code)
// instead of scanning a QR code. Uses Baileys' requestPairingCode().

const express = require('express');
const path = require('path');
const { getStats } = require('../lib/analytics');

function createPairingServer(getSock, port = process.env.PORT || 3000) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/stats', (req, res) => {
    res.json(getStats());
  });

  app.post('/api/pair', async (req, res) => {
    try {
      const sock = getSock();
      if (!sock) {
        return res.status(503).json({ error: 'Bot is still starting up. Try again in a moment.' });
      }

      if (sock.authState?.creds?.registered) {
        return res.status(400).json({ error: 'A WhatsApp number is already linked to this bot.' });
      }

      const { phoneNumber } = req.body; // digits only, country code + number, e.g. 15551234567
      if (!phoneNumber || !/^\d{7,15}$/.test(phoneNumber)) {
        return res.status(400).json({ error: 'Enter a valid phone number with country code, digits only.' });
      }

      const code = await sock.requestPairingCode(phoneNumber);
      return res.json({ code });
    } catch (err) {
      console.error('Pairing error:', err);
      return res.status(500).json({ error: 'Could not generate a pairing code. Please try again.' });
    }
  });

  app.listen(port, () => {
    console.log(`🔗 Pairing page: http://localhost:${port}`);
  });

  return app;
}

module.exports = { createPairingServer };
