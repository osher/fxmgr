const { redis, mongo } = require('../../../') //require('fxmgr')
const { redis: redisConfig, mongo: mongoConfig } = require('../config')

const persons = require('./persons')

const fxRedis = redis(redisConfig).useData({
  persons: persons.stores.cache,
})
const fxMongo = mongo(mongoConfig).useData({
  persons: persons.stores.db,
})

module.exports = {
  mongo: fxMongo,
  redis: fxRedis,
  fx: { persons },
  seed: () => Promise.all([fxMongo, fxRedis].map(fx => fx.seed())),
  beforeAll: () => Promise.all([fxMongo, fxRedis].map(fx => fx.beforeAll())),
  afterAll: () => Promise.all([fxMongo, fxRedis].map(fx => fx.afterAll())),
}
