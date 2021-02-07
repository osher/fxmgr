const { seed, afterAll } = require('./fx/setup')

console.log('seeding')
Promise.resolve()
.then(seed)
.then(afterAll)
.catch(e => {
  console.error(JSON.stringify({ message: e.message, ...e }, { depth: 10, colors: true }))
  process.exitCode = 1
})
