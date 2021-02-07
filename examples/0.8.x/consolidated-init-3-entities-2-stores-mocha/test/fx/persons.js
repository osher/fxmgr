module.exports = require('../../../../../') //i.e - require('fxmgr')
.fixture({
  entity: 'person',
  stores: {
    db: {
      type: 'redis',
      dataType: 'strings',
      defaultCase: 'reservedEmpty',
      toStoredForm: fields => ({ key: `pers:${fields.id}`, value: JSON.stringify(fields) }),
      saveAs: 'kvPair',
    },
  },
  cases: {
    noSuch: {
      '~': { db: 'reservedEmpty' },
      id: 'no-such-person',
    },
    johnDoe: {
      '~': { db: 'testData' },
      id: 'john-doe',
      fname: 'John',
      lname: 'Doe',
    },
    johnSnow: {
      '~': { db: 'testData' },
      id: 'john-snow',
      fname: 'John',
      lname: 'Snow',
    },
    johnMalcowitch: {
      '~': { db: 'mustEql' },
      id: 'johnMalcowitch',
      fname: 'John',
      lname: 'Malcowitch',
    },

  },
})
