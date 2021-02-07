module.exports = require('../../../../') //i.e - require('fxmgr')
.fixture({
  entity: 'person',
  stores: {
    db: {
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
      id: { $oid: '000000000000000000000000' },
    },
    johnDoe: {
      //'~': { db: 'testData' }, //<---- thats the default
      id: { $oid: '5ee8fd74c8cc0113a1dffb19' },
      fname: 'John',
      lname: 'Doe',
    },
    johnSnow: {
      '~': { db: 'testData' },
      id: { $oid: '5ee8fd76c8cc0113a1dffb1b' },
      fname: 'John',
      lname: 'Snow',
    },
    saintJohn: {
      '~': { db: 'mustExist' },
      id: { $oid: '000000000000000000000001' },
      fname: 'John',
      lname: 'Cidade',
    },
    johnMalcowitch: {
      '~': { db: 'mustEql' },
      id: { $oid: '404000404004400404000404' },
      fname: 'John',
      lname: 'Malcowitch',
    },
  },
})
