const { redis: config } = require('../../config')
module.exports = require('../../../../../') //require('fxmgr')
.init({
  stores: {
    db: {
      type: 'redis',
      dataType: 'strings',
      defaultCase: 'testData',
      config,
    },
  },
  loadFixtures: `${__dirname}/data`,
})
