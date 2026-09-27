// test/vcf.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { numberFromJid, buildVCard } = require('../lib/vcf');

test('numberFromJid strips the server suffix', () => {
  assert.equal(numberFromJid('233542625388@s.whatsapp.net'), '233542625388');
});

test('numberFromJid strips a device suffix too', () => {
  assert.equal(numberFromJid('233542625388:12@s.whatsapp.net'), '233542625388');
});

test('buildVCard produces a well-formed vCard', () => {
  const card = buildVCard('+233542625388', '233542625388');
  const lines = card.split('\n');
  assert.equal(lines[0], 'BEGIN:VCARD');
  assert.equal(lines[1], 'VERSION:3.0');
  assert.equal(lines[2], 'FN:+233542625388');
  assert.equal(lines[3], 'TEL;TYPE=CELL:+233542625388');
  assert.equal(lines[4], 'END:VCARD');
});
