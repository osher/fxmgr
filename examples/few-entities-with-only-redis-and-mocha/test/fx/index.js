const { redis: redisFcty } = require('../../../../') //require('fxmgr')
const { redis: redisConfig } = require('../../config')

const entities = require('./entities')
const persons = require('./persons')
const artifacts = require('./artifacts')

const redis = redisFcty(redisConfig).useData({
  entities: entities.stores.db,
  persons: persons.stores.db,
  artifacts: artifacts.stores.db,
})

module.exports = Object.assign(redis, { entities, persons, artifacts })
