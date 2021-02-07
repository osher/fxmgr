const Should = require('should')
const SUT = require('../lib/init')

const minimalValidOptions = {
  fixtures: {
    foo: { [Symbol.for('fixture-meta')]: {}, cases: {} },
  },
}

describe('lib/init', () => {
  it('should be a singleton module with a factory method:init, getter method: of, and method .rm', () => {
    Should(SUT)
    .be.an.Object()
    .have.properties(['init', 'of', 'rm'])
  })

  describe('.of(name) / get(name)', () => {
    describe('when called with a name that is not initiated', () => {
      const ctx = {}
      const uninitiaedName = 'no-such-name'
      before(() => {
        //arrange
        SUT.rm(uninitiaedName)

        //act
        try {
          ctx.val = SUT.of('no-such-name')
        } catch (e) {
          ctx.err = e
        }
      })

      it('should throw an error with code: UNINITIATED,  message: no such fxmgr instance', () => {
        Should(ctx.err)
        .be.an.Error()
        .have.properties(['description'])
        .have.properties({
          code: 'UNINITIATED',
          uninitiaedName,
        })
        .have.property('message')
        .match(/no such fxmgr instance/i)
      })
    })

    describe('when called without a name', () => {
      const ctx = {}
      before(() => {
        try {
          ctx.val = SUT.get()
        } catch (e) {
          ctx.err = e
        }
      })

      it('should assume the name \'default\'', () => {
        Should(ctx.err)
        .be.an.Error()
        .have.properties({
          code: 'UNINITIATED',
          uninitiaedName: 'default',
        })
      })
    })

    describe('when called with a valid name', () => {
      const ctx = {}
      const name = 'good-one'
      before(() => {
        //arrange
        SUT.init({ name, ...minimalValidOptions })

        try {
          ctx.val = SUT.of(name)
        } catch (e) {
          ctx.err = e
        }
      })

      it('should not fail', () => {
        if (ctx.err) throw ctx.err
      })

      it('should return the initiated instance', () => {
        Should(ctx.val).be.an.Object()
      })
    })
  })

  describe('.rm(name)', () => {
    describe('when called', () => {
      const ctx = {}
      const name = 'delme'
      before(() => {
        //arrange
        SUT.init({ name, ...minimalValidOptions })

        //act
        try {
          ctx.val = SUT.rm(name)
        } catch (e) {
          ctx.err = e
        }

        //validate
        try {
          ctx.val = SUT.of(name)
        } catch (e) {
          ctx.valerr = e
        } finally {
          SUT.rm(name)
        }
      })

      it('should not fail', () => {
        if (ctx.err) throw ctx.err
      })

      it('should remove the name', () => {
        Should(ctx.valerr)
          .be.an.Error()
          .property('code', 'UNINITIATED')
      })
    })
  })

  describe('.init(options)', () => {
    describe('when called with invalid options', () => {
      it('tbd')
    })

    describe('when called with a name already in use', () => {
      const ctx = {}
      const usedName = 'test-used'

      before(() => {
        try {
          //arrange
          SUT.init({ name: usedName, ...minimalValidOptions })

          //act
          SUT.init({ name: usedName, ...minimalValidOptions })
        } catch (e) {
          ctx.err = e
        } finally {
          SUT.rm(usedName)
        }
      })

      it('should throw an error with code: NAME_CONFLICT,  message: fxmgr instance name conflict', () => {
        Should(ctx.err)
        .be.an.Error()
        .have.properties(['description'])
        .have.properties({
          code: 'NAME_CONFLICT',
          occupiedName: usedName,
        })
        .have.property('stack')
        .match(/instance name conflict/i)
      })
    })

    describe('when called with valid options', () => {
      describe('with fixtures explicitly initiated', () => {
        it('tbd')
      })

      describe('with fixtures as pojos', () => {
        it('tbd')
      })

      describe('with loadFixtures as path', () => {
        const loadFixtures = 'some/path'

        const ctx = {}
        before(() => {
          try {
            SUT.init({
              //name --> defaults to 'default'
              loadFixtures,

              //test-injection:
              load: paths => (ctx.loadedPaths = paths) && minimalValidOptions.fixtures,
            })
          } catch (e) {
            ctx.err = e
          } finally {
            SUT.rm('default')
          }
        })
        it('should not fail', () => {
          if (ctx.err) throw ctx.err
        })

        it('should load with require-yml, passing it the path as a single-element array', () => {
          Should(ctx.loadedPaths).eql(loadFixtures)
        })
      })

      describe('with full stores, and fixtures cases correlating to existing stores', () => {
        const ctx = {}
        before(() => {
          try {
            ctx.val = SUT.init({
              //name --> defaults to 'default'
              stores: {
                db: {
                  type: 'redis',
                  config: { port: 6379 },
                  defaultCase: 'testData',
                  defaultDataType: 'strings',
                },
              },
              fixtures: {
                persons: {
                  stores: {
                    db: {
                      toStoredForm: v => ({ key: v.id, value: JSON.stringify(v) }),
                      saveAs: 'kvPair',
                    },
                  },
                  cases: {
                    theOne: {
                      '~': { db: 'mustExist' },
                      and: 'only',
                    },
                    theSecond: {
                      and: 'amazing',
                    },
                  },
                },
                skills: {
                  stores: {
                    db: {
                      toStoredForm: a => a,
                    },
                  },
                  cases: {
                    coding: {
                      '~': { db: 'testData' },
                      fun: true,
                    },
                  },
                },
              },
            })
          } catch (e) {
            ctx.err = e
          } finally {
            SUT.rm('default')
          }
        })

        it('should not fail', () => {
          if (ctx.err) throw ctx.err
        })


        describe('the returned value', () => {
          it('should be an implementation object', () => {
            Should(ctx.val).be.an.Object()
          })

          it('should provide a .beforeAll mocha hook', () => {
            Should(ctx.val).have.property('beforeAll').be.a.Function()
          })

          it('should provide a .afterAll mocha hook', () => {
            Should(ctx.val).have.property('afterAll').be.a.Function()
          })

          it('should provide a .seed hook', () => {
            Should(ctx.val).have.property('seed').be.a.Function()
          })

          it('should provide a .stores collection with an entry per initiated store', () => {
            Should(ctx.val).have.property('stores').be.an.Object()
            Should(Object.keys(ctx.val.stores)).eql(['db'])
          })

          it('should provide a .fx collection with an entry per initiated entity', () => {
            Should(ctx.val).have.property('fx').be.an.Object()
            Should(Object.keys(ctx.val.fx)).eql(['persons', 'skills'])
          })
        })
      })
    })
  })
})
