const { beforeAll, afterAll } = require('./fx/setup')

console.log('setup')
Promise.resolve()
.then(beforeAll)
.then(runTestCases)
.finally(() => {
    console.log('teardown')
    return afterAll()
})
.catch(e => {
  console.error(JSON.stringify({ message: e.message, ...e }, { depth: 10, colors: true }))
  process.exitCode = 1
})

function runTestCases() {
  //test run here can expect a\ll data entities to be present in
  //both the cache and store
  console.log('mock tests...')
}
