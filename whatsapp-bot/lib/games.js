// lib/games.js
// Simple text-based games. State is kept in memory per chat (resets on bot restart).

const numberGames = new Map(); // jid -> { answer, attemptsLeft }

function startNumberGame(jid) {
  const answer = Math.floor(Math.random() * 100) + 1;
  numberGames.set(jid, { answer, attemptsLeft: 7 });
  return 'I picked a number between 1 and 100. You have 7 tries — send !guess <number>.';
}

function handleGuess(jid, guessText) {
  const game = numberGames.get(jid);
  if (!game) return 'No game running. Start one with !numguess.';

  const guess = parseInt(guessText, 10);
  if (Number.isNaN(guess)) return 'Send a number, e.g. !guess 50';

  game.attemptsLeft -= 1;

  if (guess === game.answer) {
    numberGames.delete(jid);
    return `🎉 Correct! It was ${game.answer}.`;
  }

  if (game.attemptsLeft <= 0) {
    numberGames.delete(jid);
    return `Out of tries! The number was ${game.answer}. Try !numguess to play again.`;
  }

  const hint = guess < game.answer ? 'higher' : 'lower';
  return `Try ${hint}. ${game.attemptsLeft} tries left.`;
}

function playRockPaperScissors(userChoice) {
  const options = ['rock', 'paper', 'scissors'];
  const choice = userChoice?.toLowerCase();
  if (!options.includes(choice)) {
    return 'Usage: !rps rock|paper|scissors';
  }

  const botChoice = options[Math.floor(Math.random() * 3)];
  if (botChoice === choice) return `I chose ${botChoice} too. Draw!`;

  const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  const userWins = beats[choice] === botChoice;
  return `I chose ${botChoice}. ${userWins ? 'You win! 🎉' : 'I win! 🤖'}`;
}

module.exports = { startNumberGame, handleGuess, playRockPaperScissors };
