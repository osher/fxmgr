module.exports = require('../../../') //i.e - require('fxmgr')
.fixture({
  entity: 'person',
  stores: {
    db: {
      type: 'mongo',
      defaultCase: 'testData',
      toStoredForm: ({ fname, lname, id }) => ({ fname, lname, _id: id }),
      saveAs: 'doc',
    },
  },
  cases: {
    noSuch: {
      '~': {
        //<store-name>:  <case-type for this entity in the store>
        db: 'reservedEmpty',
      },
      id: 9900000,
    },
    johnDoe: {
      '~': { db: 'testData' },
      id: 9000001,
      fname: 'John',
      lname: 'Doe',
    },
    johnSnow: {
      '~': { db: 'testData' },
      id: 9000002,
      fname: 'John',
      lname: 'Snow',
    },
    saintJohn: {
      '~': { db: 'mustExist' },
      id: 1,
      fname: 'John',
      lname: 'Cidade',
    },
    johnMalcowitch: {
      '~': { db: 'mustEql' },
      id: 4040404,
      fname: 'John',
      lname: 'Malcowitch',
    },
  },
})
