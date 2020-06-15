module.exports = require('../../../../') //i.e - require('fxmgr')
.fixture({
  stores: {
    db: {
      type: 'redis',
      dataType: 'strings',
      defaultCase: 'testData',
      toStoredForm: fields => ({ key: `enti:${fields.id}`, value: JSON.stringify(fields) }),
      saveAs: 'kvPair',
    },
  },
  cases: {
    persons: {
      id: 'persons',
      fields: ['fname', 'lname'],
      i18n: {
        en: {
          title: 'Person',
          fname: 'First Name',
          lname: 'Last Name',
        },
        fr: {
          title: 'Person',
          fname: 'Name',
          lname: 'Surname',
        },
      },
    },
    artifacts: {
      id: 'artifacts',
      fields: ['name', 'powers'],
      i18n: {
        en: {
          title: 'Artefact',
          name: 'Name',
          powers: 'Pouvoirs',
        },
      },
    },
  },
})
