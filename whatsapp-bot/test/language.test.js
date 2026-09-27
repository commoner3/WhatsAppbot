// test/language.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SUPPORTED_LANGUAGES, setLanguage, getLanguage } = require('../lib/language');

test('getLanguage defaults to english for an unknown chat', () => {
  assert.equal(getLanguage('never-set-jid'), 'english');
});

test('setLanguage accepts a supported language and normalizes case', () => {
  const result = setLanguage('lang-test-jid-1', 'TWI');
  assert.equal(result, 'twi');
  assert.equal(getLanguage('lang-test-jid-1'), 'twi');
});

test('setLanguage rejects an unsupported language', () => {
  const result = setLanguage('lang-test-jid-2', 'klingon');
  assert.equal(result, null);
  assert.equal(getLanguage('lang-test-jid-2'), 'english'); // unchanged
});

test('SUPPORTED_LANGUAGES includes the expected Ghanaian languages', () => {
  for (const lang of ['twi', 'ga', 'ewe', 'fante', 'dagbani', 'hausa', 'dagaare', 'nzema', 'pidgin']) {
    assert.ok(SUPPORTED_LANGUAGES.includes(lang), `expected ${lang} to be supported`);
  }
});
