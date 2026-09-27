// lib/language.js
// Per-chat language preference for AI replies (!ai, !joke). Also used by !translate
// to validate the target language. Covers English plus languages widely spoken in Ghana.
// Persisted to data/languages.json so preferences survive a restart.

const { createStore } = require('./store');

const SUPPORTED_LANGUAGES = [
  'english',
  'twi',
  'ga',
  'ewe',
  'fante',
  'dagbani',
  'hausa',
  'dagaare',
  'nzema',
  'pidgin', // Ghanaian Pidgin English
];

const store = createStore('languages.json');

function setLanguage(jid, language) {
  const normalized = (language || '').toLowerCase().trim();
  if (!SUPPORTED_LANGUAGES.includes(normalized)) return null;
  store.set(jid, normalized);
  return normalized;
}

function getLanguage(jid) {
  return store.get(jid, 'english');
}

module.exports = { SUPPORTED_LANGUAGES, setLanguage, getLanguage };
