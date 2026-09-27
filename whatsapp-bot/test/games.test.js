// test/games.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startNumberGame, handleGuess, playRockPaperScissors } = require('../lib/games');

test('startNumberGame returns instructions and sets up a game', () => {
  const reply = startNumberGame('test-jid-1');
  assert.match(reply, /between 1 and 100/);
  assert.match(reply, /7 tries/);
});

test('handleGuess with no active game tells the user to start one', () => {
  const reply = handleGuess('no-such-game-jid', '50');
  assert.equal(reply, 'No game running. Start one with !numguess.');
});

test('handleGuess rejects a non-numeric guess', () => {
  startNumberGame('test-jid-2');
  const reply = handleGuess('test-jid-2', 'banana');
  assert.equal(reply, 'Send a number, e.g. !guess 50');
});

test('handleGuess narrows down with higher/lower hints until it ends', () => {
  startNumberGame('test-jid-3');
  // 7 attempts max; guessing 1 then 100 repeatedly will eventually exhaust attempts
  // without ever matching a random answer in [1,100] almost always (deterministic end state).
  let lastReply = '';
  for (let i = 0; i < 7; i += 1) {
    lastReply = handleGuess('test-jid-3', i % 2 === 0 ? '1' : '100');
  }
  assert.ok(
    /Out of tries!|Correct!/.test(lastReply),
    `expected the game to end after 7 guesses, got: ${lastReply}`
  );
});

test('playRockPaperScissors rejects an invalid choice', () => {
  const reply = playRockPaperScissors('lizard');
  assert.equal(reply, 'Usage: !rps rock|paper|scissors');
});

test('playRockPaperScissors returns a result for a valid choice', () => {
  const reply = playRockPaperScissors('rock');
  assert.match(reply, /^I chose (rock|paper|scissors)/);
});
