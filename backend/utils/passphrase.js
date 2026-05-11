const crypto = require('crypto');

const adjectives = ['blauer', 'roter', 'gruener', 'schlauer', 'schneller', 'leiser', 'mutiger', 'frecher', 'lustiger', 'cooler', 'klarer', 'treuer', 'wilder', 'sanfter', 'starker'];
const nouns = ['falke', 'elefant', 'tiger', 'pinguin', 'loewe', 'delfin', 'wolf', 'fuchs', 'baer', 'adler', 'hase', 'drache', 'panther', 'luchs', 'kater'];

function generatePassphrase() {
  const adj = adjectives[crypto.randomInt(0, adjectives.length)];
  const noun = nouns[crypto.randomInt(0, nouns.length)];
  const num = crypto.randomInt(10, 99);
  return `${adj}-${noun}-${num}`;
}

module.exports = { generatePassphrase };
