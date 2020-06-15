const Should = require('should')
const SUT = require('../')

describe('fxmgr - main module', () => {
  it('should be a singleton module instance', () => {
    Should(SUT).be.an.Object()
  })
  describe('should have apis', () => {
    it('.fixtrue(options)', () => {
      Should(SUT)
      .have.property('fixture')
      .be.a.Function()
      .have.property('length', 1)
    })
  })
})
