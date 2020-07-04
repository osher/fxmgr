module.exports = require('../../../../') //i.e - require('fxmgr')
.fixture({
  entity: 'person',
  stores: {
    db: {
      type: 'mongo',
      defaultCase: 'testData',
      toStoredForm: ({ fname, lname, id }) => ({ fname, lname, _id: id }),
      saveAs: 'doc',
    },
    cache: {
      type: 'redis',
      dataType: 'strings',
      defaultCase: 'reservedEmpty',
      toStoredForm: ({ fname, lname, id }) =>
        ({ key: `person:${id}`, value: JSON.stringify({ _id: id, fname, lname }) }),
      saveAs: 'cache',
    },
  },
  cases: {
    noSuch: {
      '~': {
        //<store-name>:  <case-type for this entity in the store>
        db: 'reservedEmpty',
        cache: 'reservedEmpty',
      },
      id: 9900000,
    },
    johnDoe: {
      '~': { db: 'testData', cache: 'reservedEmpty' },
      id: 9000001,
      fname: 'John',
      lname: 'Doe',
    },
    johnSnow: {
      '~': { db: 'testData', cache: 'testData' },
      id: 9000002,
      fname: 'John',
      lname: 'Snow',
    },
    saintJohn: {
      '~': { db: 'mustExist', cache: 'ignore' },
      id: 1,
      fname: 'John',
      lname: 'Cidade',
    },
    johnMalcowitch: {
      '~': { db: 'mustEql', cache: 'mustEql' },
      id: 4040404,
      fname: 'John',
      lname: 'Malcowitch',
    },
  },
})
