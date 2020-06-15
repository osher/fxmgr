const Should = require('should')
const SUT = require('../lib/fixture')

describe('lib/fixture', () => {
  it('should be a factory function that requires an options argument', () => {
    Should(SUT).be.a.Function().have.property('length', 1)
  })

  describe('when called with valid options', () => {
    it
  })
})
