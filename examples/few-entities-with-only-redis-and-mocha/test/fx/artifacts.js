module.exports = require('../../../../') //i.e - require('fxmgr')
.fixture({
  entity: 'artifact',
  stores: {
    db: {
      type: 'redis',
      dataType: 'strings',
      defaultCase: 'testData',
      toStoredForm: fields => ({ key: `artif:${fields.id}`, value: JSON.stringify(fields) }),
      saveAs: 'kvPair',
    },
  },
  cases: {
    noSuch: {
      '~': { db: 'reservedEmpty' },
      id: 'no-such-artifact',
    },
    longclaw: {
      '~': { db: 'testData' }, //just being explicit. it's the default from line 8
      id: 'longclaw',
      name: 'Longclaw',
      powers: ['wraithslayer'],
    },
    holyHandGranade: {
      '~': { db: 'testData' }, //just being explicit. it's the default from line 8
      id: 'the-holy-handgranade',
      name: 'The Holy Handgranade',
      powers: ['monsterslayer'],
      instructions: '3 shall be the count and the count shall be 3',
    },
  },
})
