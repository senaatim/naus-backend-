// tests/setup.js
const iconv = require('iconv-lite');
iconv.encodingExists('cesu8');

// Increase timeout for DB operations
jest.setTimeout(30000);