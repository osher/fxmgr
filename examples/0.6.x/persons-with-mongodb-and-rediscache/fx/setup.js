const { redis, mongo } = require('../../../../') //require('fxmgr')
const { redis: redisConfig, mongo: mongoConfig } = require('../config')

const persons = require('./persons')

const fxRedis = redis(redisConfig).useData({
  persons: persons.stores.cache,
})
const fxMongo = mongo(mongoConfig).useData({
  persons: persons.stores.db,
})

const stores = [fxMongo, fxRedis]

module.exports = {
  mongo: fxMongo,
  redis: fxRedis,
  fx: { persons },
  seed: () => all(stores, 'seed'),
  beforeAll: () => all(stores, 'beforeAll'),
  afterAll: () => all(stores, 'afterAll'),
}

function all(stores, op) {
  const errors = []
  return Promise.all(stores.map(store =>
    store[op]().catch(e => errors.push(e) && null)))
  .then(res => errors.length
    ? Promise.reject(Object.assign(new Error('one or more stores setup failed'), {
        errors: errors.map(e => ({ message: e.message, ...e })),
      }))
    : res)
}
