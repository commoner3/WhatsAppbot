// lib/profile.js
// Sets the bot account's WhatsApp profile picture from data/profile.jpg, one time.
// Drop your image at that path (jpg/png) before starting the bot.

const fs = require('fs');
const path = require('path');

const PICTURE_PATH = path.join(__dirname, '..', 'data', 'profile.jpg');
const MARKER_PATH = path.join(__dirname, '..', 'data', '.profile-set');

async function setProfilePictureIfNeeded(sock) {
  if (!fs.existsSync(PICTURE_PATH)) return; // nothing to set yet
  if (fs.existsSync(MARKER_PATH)) return; // already set once — delete the marker to force a re-set

  try {
    await sock.updateProfilePicture(sock.user.id, { url: PICTURE_PATH });
    fs.writeFileSync(MARKER_PATH, new Date().toISOString());
    console.log('✅ Profile picture set from data/profile.jpg');
  } catch (err) {
    console.error('Could not set profile picture:', err);
  }
}

module.exports = { setProfilePictureIfNeeded };
