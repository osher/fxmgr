const assert = require('assert')
const fx = require('./fx')
describe('end to end', () => {
  before(fx.beforeAll)

  after(fx.afterAll)

  describe('this and this', () => {
    it('shoud do that and that', () => {
      //can use here (or in any other test or before/after hook)
      fx.entities.persons.id
      fx.entities.persons.fields
      fx.entities.persons.i18n.en.title
      fx.entities.persons.i18n.en.fname
      fx.entities.persons.i18n.en.lname
      fx.entities.persons.kvPair.key
      fx.entities.persons.kvPair.value

      fx.persons.johnDoe.id
      fx.persons.johnDoe.fname
      fx.persons.johnDoe.lname
      fx.persons.johnDoe.kvPair.key
      fx.persons.johnDoe.kvPair.value

      fx.artifacts.longclaw.id
      fx.artifacts.longclaw.name
      fx.artifacts.longclaw.powers
      fx.artifacts.longclaw.kvPair.key
      fx.artifacts.longclaw.kvPair.value

      //TRICKY: fx.client is a getter, cannot be destructured beforehand
      fx.client.keys
      fx.client.mget
      fx.client//...rest of async-redis commands
    })
  })

  describe('accessing db through the exposed async-redis client', () => {
    it('should work as expected', async () => {
      //TRICKY: fx.client is a getter, cannot be destructured beforehand
      const k = await fx.client.keys('*')

      assert.deepEqual(k.sort(), [
        'artif:longclaw',
        'artif:the-holy-handgranade',
        'enti:artifacts',
        'enti:persons',
        'pers:john-doe',
        'pers:john-snow',
      ])
    })
  })
})
