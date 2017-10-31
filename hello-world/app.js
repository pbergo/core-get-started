/* eslint no-console:0 */
const enigmaConfig = require('./enigma-config');
const enigma = require('enigma.js');

console.log('Connecting to QIX Engine');

enigma.create(enigmaConfig).open().then(async (global) => {
  console.log('Connection established');
  try {
    const engineVersion = await global.engineVersion();
    console.log(`Hello, I am QIX Engine! I am running version: ${engineVersion.qComponentVersion}`);
    process.exit(0);
  } catch (error) {
    console.log(`Error when connecting to QIX Engine: ${error.message}`);
    process.exit(1);
  }
});
