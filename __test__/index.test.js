const { log } = require('../index.js');

it('can log successfully', () => {
  log.cover();
  console.log("test");
});