const { seed, afterAll } = require('./fx/setup')

console.log('seeding')
Promise.resolve()
.then(seed)
.then(afterAll)
.catch(e => { throw e })
