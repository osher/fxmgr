const { mongo: mongoFcty } = require('../../../../') //require('fxmgr')
const { mongo: mongoConfig } = require('../config')

const persons = require('./persons')

const mongo = mongoFcty(mongoConfig).useData({
  persons: persons.stores.db,
})

module.exports = Object.assign(mongo, { fx: { persons } })
