const Should = require('should')
const SUT = require('../')

describe('fxmgr - main module', () => {
  it('should be a singleton module instance', () => {
    Should(SUT).be.an.Object()
  })
  describe('should have apis', () => {
    it('.fixtrue(options) - options is mandatory', () => {
      Should(SUT)
      .have.property('fixture')
      .be.a.Function()
      .have.property('length', 1)
    })

    it('.mongo(options) - options arg is optional', () => {
      Should(SUT)
      .have.property('mongo')
      .be.a.Function()
      .have.property('length', 0)
    })

    it('.redis(options) - options arg is optional', () => {
      Should(SUT)
      .have.property('redis')
      .be.a.Function()
      .have.property('length', 0)
    })
  })
})
