const crypto = require('crypto');

const adjectives = ['blue', 'red', 'green', 'swift', 'brave', 'quiet', 'clever', 'wild', 'sharp', 'cool', 'bright', 'noble', 'silent', 'bold', 'epic'];
const nouns = ['falcon', 'elephant', 'tiger', 'penguin', 'lion', 'dolphin', 'wolf', 'fox', 'bear', 'eagle', 'rabbit', 'dragon', 'panther', 'lynx', 'hawk'];

function generatePassphrase() {
  const adj = adjectives[crypto.randomInt(0, adjectives.length)];
  const noun = nouns[crypto.randomInt(0, nouns.length)];
  const num = crypto.randomInt(10, 99);
  return `${adj}-${noun}-${num}`;
}

module.exports = { generatePassphrase };
