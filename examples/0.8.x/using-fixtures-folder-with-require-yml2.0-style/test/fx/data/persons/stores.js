module.exports = {
  db: {
    toStoredForm: fields => ({ key: `pers:${fields.id}`, value: JSON.stringify(fields) }),
    saveAs: 'kvPair',
  },
}
