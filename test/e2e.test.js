const Should = require('should')
const { exec: execCb } = require('child_process')
const exec = (cmd, opts) => new Promise(
  (a, r) => execCb(cmd, opts, (err, stdout, stderr) => err ? r(err) : a({ stdout, stderr })),
)

const mongo = require('../lib/test-db-mongo')({ url: 'mongodb://localhost:27017' })
const redis = require('../lib/test-db-redis')()
const dropCol = name => mongo
  .collection(name).mongoCollection.drop()
  .catch(e => 'NamespaceNotFound' === e.codeName || Promise.reject(e))

describe('e2e examples', () => {
  before(() => Promise.all([mongo.connect(), redis.connect()]))

  after(() => Promise.all([mongo.disconnect(), redis.disconnect()]))

  describe('backward compatibility - 0.6.0', () => {
    describe('persons - no test runner, with mongodb and redis stores', () => {
      describe('when ran without seeding', () => {
        const cwd = './examples/0.6.x/persons-with-mongodb-and-rediscache'
        const ctx = {}
        before(async () => {
          //arrange
          await Promise.all([
             dropCol('persons'),
             redis.client.flushdb(),
          ])

          //act
          try {
            ctx.test = await exec('node test.js', { cwd })
          } catch (e) {
            ctx.err = e
          }
        })

        it('should fail with an error', () => Should(ctx.err).be.an.Error())

        describe('the thrown error', () => {
          before(() => {
            try {
              ctx.parsed = JSON.parse(ctx.err.message.replace(/^.*\n/, ''))
            } catch (e) {
              ctx.parseError = e
            }
          })

          it('should have clear message about missing entities', () => {
            Should(ctx.parsed).have.property('message').match(/one or more stores setup failed/)
          })
          it('should list the expected and as empty lists', () => {
            Should(ctx.parsed)
            .property('errors')
            .property(0)
            .property('expected')
            .eql({ byId: [], byProps: [] })
          })
          it('should list the actual - as lists of ids or props that were not found', () => {
            Should(ctx.parsed)
            .property('errors')
            .property(0)
            .property('actual')
            .eql({ byId: [1], byProps: [] })
          })
        })
      })

      describe('when ran on seeded db', () => {
        const cwd = './examples/0.6.x/persons-with-mongodb-and-rediscache'
        const ctx = {}

        before(async () => {
          //arrange
          //arrange
          await Promise.all([
             dropCol('persons'),
             redis.client.flushdb(),
          ])

          //act
          try {
            ctx.seed = await exec('node seed.js', { cwd })
            ctx.test = await exec('node test.js', { cwd })
          } catch (e) {
            ctx.err = e
          }
        })

        it('should not fail', () => Should.not.exist(ctx.err))

        it('should go through the entire flow with no errors', () => {
          Should(ctx.test).eql({
            stderr: '',
            stdout: [
              'setup',
              'mock tests...',
              'teardown',
              '',
            ].join('\n'),
          })
        })
      })
    })

    describe('smaller persons - no test runner, with mongodb only, using $oid', () => {
      const cwd = './examples/0.6.x/persons-with-mongodb'
      describe('when ran without seeding', () => {
        const ctx = {}
        before(async () => {
          //arrange
          await Promise.all([
             dropCol('persons'),
             redis.client.flushdb(),
          ])

          //act
          try {
            ctx.test = await exec('node test.js', { cwd })
          } catch (e) {
            ctx.err = e
          }
        })

        it('should fail with an error', () => Should(ctx.err).be.an.Error())

        describe('the thrown error', () => {
          before(() => {
            try {
              ctx.parsed = JSON.parse(ctx.err.message.replace(/^.*\n/, ''))
            } catch (e) {
              ctx.parseError = e
            }
          })

          it('should have clear message about missing entities', () => {
            Should(ctx.parsed)
            .property('errors')
            .property('0')
            .property('message')
            .match(/mustExist assertion - missing mandatory entries in db/)
          })
          it('should list the expected and as empty lists', () => {
            Should(ctx.parsed)
            .property('errors')
            .property('0')
            .property('expected')
            .eql({ byId: [], byProps: [] })
          })
          it('should list the actual - as lists of ids or props that were not found', () => {
            Should(ctx.parsed)
            .property('errors')
            .property('0')
            .property('actual')
            .eql({ byId: ['000000000000000000000001'], byProps: [] })
          })
        })
      })

      describe('when ran on seeded db', () => {
        const ctx = {}

        before(async () => {
          //arrange
          //arrange
          await Promise.all([
             dropCol('persons'),
             redis.client.flushdb(),
          ])

          //act
          try {
            ctx.seed = await exec('node seed.js', { cwd })
            ctx.test = await exec('node test.js', { cwd })
          } catch (e) {
            ctx.err = e
          }
        })

        it('should not fail', () => Should.not.exist(ctx.err))

        it('should go through the entire flow with no errors', () => {
          Should(ctx.test).eql({
            stderr: '',
            stdout: [
              'setup',
              'mock tests...',
              'teardown',
              '',
            ].join('\n'),
          })
        })
      })
    })

    describe('entities - mocha test runner, with redis as db store', () => {
      const cwd = 'examples/0.6.x/few-entities-with-only-redis-and-mocha'
      const cmd = `node ./node_modules/mocha/bin/mocha --config ${cwd}/.mocharc.yaml --reporter min`
      const ctx = {}
      before(async () => {
        //arrange
        await Promise.all([
           dropCol('persons'),
           redis.client.flushdb(),
        ])
        await redis.client.mset('pers:johnMalcowitch', JSON.stringify({
          id: 'johnMalcowitch',
          name: 'johnMalcowitch',
          entity: 'person',
          fname: 'John',
          lname: 'Malcowitch',
        }))

        //act
        try {
          ctx.test = await exec(cmd)
        } catch (e) {
          ctx.err = e
        }
      })

      it('should not fail', () => Should.not.exist(ctx.err))

      it('should execute the suite', () => {
        Should(ctx.test.stdout).match(/2 passing/)
      })
    })
  })

  describe('0.8.x features', () => {
    describe('smaller persons - no test runner, with mongodb only, using $oid', () => {
      const cwd = './examples/0.8.x/persons-with-mongodb'
      describe('when ran without seeding', () => {
        const ctx = {}
        before(async () => {
          //arrange
          await Promise.all([
             dropCol('persons'),
             redis.client.flushdb(),
          ])

          //act
          try {
            ctx.test = await exec('node test.js', { cwd })
          } catch (e) {
            ctx.err = e
          }
        })

        it('should fail with an error', () => Should(ctx.err).be.an.Error())

        describe('the thrown error', () => {
          before(() => {
            try {
              ctx.parsed = JSON.parse(ctx.err.message.replace(/^.*\n/, ''))
            } catch (e) {
              ctx.parseError = e
            }
          })

          it('should have clear message about missing entities', () => {
            Should(ctx.parsed)
            .property('errors')
            .property('0')
            .property('message')
            .match(/mustExist assertion - missing mandatory entries in db/)
          })
          it('should list the expected and as empty lists', () => {
            Should(ctx.parsed)
            .property('errors')
            .property('0')
            .property('expected')
            .eql({ byId: [], byProps: [] })
          })
          it('should list the actual - as lists of ids or props that were not found', () => {
            Should(ctx.parsed)
            .property('errors')
            .property('0')
            .property('actual')
            .eql({ byId: ['000000000000000000000001'], byProps: [] })
          })
        })
      })

      describe('when ran on seeded db', () => {
        const ctx = {}

        before(async () => {
          //arrange
          //arrange
          await Promise.all([
             dropCol('persons'),
             redis.client.flushdb(),
          ])

          //act
          try {
            ctx.seed = await exec('node seed.js', { cwd })
            ctx.test = await exec('node test.js', { cwd })
          } catch (e) {
            ctx.err = e
          }
        })

        it('should not fail', () => Should.not.exist(ctx.err))

        it('should go through the entire flow with no errors', () => {
          Should(ctx.test).eql({
            stderr: '',
            stdout: [
              'setup',
              'mock tests...',
              'teardown',
              '',
            ].join('\n'),
          })
        })
      })
    })
  })
})
