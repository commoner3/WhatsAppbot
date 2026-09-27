// Greetings module
const greetings = {
  hello: 'Hello! How can I help you?',
  goodbye: 'Goodbye! Have a great day!',
  morning: 'Good morning!',
  afternoon: 'Good afternoon!',
  evening: 'Good evening!'
};

function getGreeting(type) {
  return greetings[type] || 'Hello!';
}

module.exports = { getGreeting, greetings };
