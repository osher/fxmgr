const Should = require('should')
const SUT = require('../lib/fixture')

describe('lib/fixture', () => {
  it('should be a factory function that requires an options argument', () => {
    Should(SUT).be.a.Function().have.property('length', 1)
  })

  describe('when called with valid options', () => {
    describe('with stores', () => {
      const ctx = {}
      before(() => {
        ctx.res = SUT({
          cases: {
            one: { },
          },
          stores: {
            db: { defaultCase: 'ignore' },
          },
        })
      })
      it('should return a fixture object', () => {
        Should(ctx.res).be.an.Object()
      })
      it('inspecting the object will encapsulate the byId, all and stores sets', () => {
        Should(require('util').inspect(ctx.res))
        .match(/all: Array< ...all stored forms... >/)
        .match(/byId: < ...by-id index... >/)
        .match(/stores: < ...stores data... >/)
      })
    })

    describe('with no stores', () => {
      const ctx = {}
      before(() => {
        ctx.res = SUT({
          cases: {
            one: { },
          },
        })
      })
      it('should return a fixture object', () => {
        Should(ctx.res).be.an.Object()
      })
      it('inspecting the object will encapsulate the byId, all and stores sets', () => {
        Should(require('util').inspect(ctx.res))
        .match(/all: Array< ...all stored forms... >/)
        .match(/byId: < ...by-id index... >/)
        .match(/stores: < ...stores data... >/)
      })
    })
  })

  describe('when called with a case with invalid case type', () => {
    const ctx = {}
    before(() => {
      try {
        ctx.res = SUT({
          cases: {
            one: { '~': { db: 'no-such-casetype' } },
          },
          stores: {
            db: { defaultCase: 'ignore' },
          },
        })
      } catch (e) {
        ctx.err = e
      }
    })
    it('should fail with a friendly message: unsupported caseType', () => {
      Should(ctx.err)
      .be.an.Error()
      .property('message')
      .match(/unsupported caseType/)
    })
  })

  describe('when provided onEntry, toStoredForm hooks, and saveAs attr name', () => {
    const ctx = { ooo: [] }
    const ooo = (from, entry) => ctx.ooo.push({ from, entry: { ...entry } }) && entry
    before(() => {
      try {
        ctx.res = SUT({
          cases: {
            one: { name: 'one', id: 1 },
            two: { name: 'two', id: 2 },
            six: { name: 'six', id: 6 },
          },
          stores: {
            s1: {
              defaultCase: 'ignore',
              toStoredForm: entry => ooo('s1', entry),
            },
            s2: {
              defaultCase: 'ignore',
              toStoredForm: entry => ooo('s2', entry),
              saveAs: 'doc',
            },
          },
          onEntry: entry => ooo('onEntry', entry),
        })
      } catch (e) {
        ctx.err = e
      }
    })

    it('should pass each of the the entries to that hook after all stores have done processing', () => {
      Should(ctx.ooo.map(({ from, entry: { name } }) => `${name}:${from}`))
      .eql([
        'one:s1', 'one:s2', 'one:onEntry',
        'two:s1', 'two:s2', 'two:onEntry',
        'six:s1', 'six:s2', 'six:onEntry',
      ])
    })

    it('should save on the entry the at the saveAs property name', () => {
      const entiresWithNoDocs = ctx.ooo
        .filter(({ from }) => 'onEntry' === from)
        .filter(({ entry }) => !entry.doc)

      Should(entiresWithNoDocs).eql([])
    })

    it('all entries should be availabel in .all', () => {
      Should(ctx.res.all)
      .eql(
        ctx.ooo
        .filter(({ from }) => 'onEntry' === from)
        .map(({ entry }) => entry),
      )
    })

    it('all entries should be available on the byId index', () => {
      Should(
        Object
        .keys(ctx.res.byId)
        .sort(),
      )
      .eql(['1', '2', '6'])
    })
  })
})
