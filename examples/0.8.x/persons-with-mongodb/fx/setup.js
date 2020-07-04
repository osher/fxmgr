const fxMgr = require('../../../../') //require('fxmgr')
const config = require('../config')

module.exports = fxMgr.init({
  fixtures: {
    persons: require('./persons'),
  },
  stores: {
    db: {
      type: 'mongo',
      defaultCase: 'testData',
      config: config.mongo, //.. ie { url, options: mongoOptions },
    },
  },
})
