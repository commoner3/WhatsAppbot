// lib/media.js
// Saves media that's sent directly, or replied to with "!save", into ./data/media

const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const MEDIA_DIR = path.join(__dirname, '..', 'data', 'media');
fs.mkdirSync(MEDIA_DIR, { recursive: true });

function extensionFor(msg) {
  if (msg.message?.imageMessage) return 'jpg';
  if (msg.message?.videoMessage) return 'mp4';
  if (msg.message?.audioMessage) return 'ogg';
  if (msg.message?.stickerMessage) return 'webp';
  return 'bin';
}

// Pulls the actual media message out of either the message itself or a quoted/replied-to message
function extractMediaMessage(msg) {
  const direct =
    msg.message?.imageMessage ||
    msg.message?.videoMessage ||
    msg.message?.audioMessage ||
    msg.message?.stickerMessage;
  if (direct) return msg; // the message itself carries the media

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted && (quoted.imageMessage || quoted.videoMessage || quoted.audioMessage || quoted.stickerMessage)) {
    // Wrap the quoted content in a shape downloadMediaMessage expects
    return { key: msg.key, message: quoted };
  }

  return null;
}

async function handleSaveCommand(sock, msg) {
  const jid = msg.key.remoteJid;
  const target = extractMediaMessage(msg);

  if (!target) {
    await sock.sendMessage(jid, {
      text: 'Send !save with a photo/video/audio, or reply to one with !save.',
    });
    return;
  }

  try {
    const buffer = await downloadMediaMessage(target, 'buffer', {});
    const ext = extensionFor(target);
    const filename = `${Date.now()}.${ext}`;
    const filepath = path.join(MEDIA_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    await sock.sendMessage(jid, { text: `Saved to server: data/media/${filename}` });
  } catch (err) {
    console.error('Error saving media:', err);
    await sock.sendMessage(jid, { text: 'Could not save that media.' });
  }
}

module.exports = { handleSaveCommand };
