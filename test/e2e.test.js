const Should = require('should')
const { exec: execCb } = require('child_process')
const exec = (cmd, opts) => new Promise(
  (a, r) => execCb(cmd, opts, (err, stdout, stderr) => err ? r(err) : a({ stdout, stderr })),
)
const mongo = require('../lib/test-db-mongo')

describe('e2e examples', () => {
  describe('persons - no test runner, with mongodb and redis stores', () => {
    describe('when ran without seeding', () => {
      const cwd = './examples/persons-with-mongodb-and-rediscache'
      const ctx = {}
      before(async () => {
        //arrange
        const m = mongo({ url: 'mongodb://localhost:27017' })
        const db = await m.connect()
        try {
          await db.collection('persons').drop()
        } catch (e) {
          //when collection does not exist - suppress. else - throw
          if ('NamespaceNotFound' !== e.codeName) throw e
        }

        await m.disconnect()

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
          Should(ctx.parsed).have.property('message').match(/missing mandatory entries in db/)
        })
        it('should list the expected and as empty lists', () => {
          Should(ctx.parsed)
          .property('expected')
          .eql({ byId: [], byProps: [] })
        })
        it('should list the actual - as lists of ids or props that were not found', () => {
          Should(ctx.parsed)
          .property('actual')
          .eql({ byId: [1], byProps: [] })
        })
      })
    })

    describe('when ran on seeded db', () => {
      const cwd = './examples/persons-with-mongodb-and-rediscache'
      const ctx = {}

      before(async () => {
        //arrange
        await exec('node seed.js', { cwd })

        //act
        try {
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
    const cwd = 'examples/few-entities-with-only-redis-and-mocha'
    const cmd = `node ./node_modules/mocha/bin/mocha --config ${cwd}/.mocharc.yaml --reporter min`
    const ctx = {}
    before(async () => {
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
