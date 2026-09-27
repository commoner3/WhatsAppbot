// lib/store.js
// Generic JSON-file backed store for small persistent key/value data
// (language preferences, warning counts, etc). Not for high-volume data — see lib/analytics.js.

const fs = require('fs');
const path = require('path');

function createStore(filename) {
  const filePath = path.join(__dirname, '..', 'data', filename);
  let data = {};

  try {
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Could not load ${filename}, starting fresh:`, err);
    data = {};
  }

  function persist() {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(data));
    } catch (err) {
      console.error(`Could not persist ${filename}:`, err);
    }
  }

  return {
    get(key, fallback) {
      return key in data ? data[key] : fallback;
    },
    set(key, value) {
      data[key] = value;
      persist();
    },
    delete(key) {
      delete data[key];
      persist();
    },
  };
}

module.exports = { createStore };
