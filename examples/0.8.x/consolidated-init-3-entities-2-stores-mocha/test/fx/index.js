const { redis, mongo } = require('../config')

module.exports = require('../../../../../') //i.e - require('fxmgr')
.init({
  stores: {
    db: {
      type: 'mongo',
      defaultCase: 'testData',
      config: mongo,
    },
    cache: {
      type: 'redis',
      defaultCase: 'testData',
      config: redis,
      dataType: 'strings',
    },
  },
  fixtures: {
    entities: require('./entities'),
    persons: require('./persons'),
    artifacts: require('./artifacts'),
  },
})
