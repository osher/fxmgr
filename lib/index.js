
module.exports = {
  fixture: require('./fixture'),
  ...require('./init'),
  redis: require('./test-db-redis'),
  mongo: require('./test-db-mongo'),
}
