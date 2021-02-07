module.exports = {
  db: {
    toStoredForm: fields => ({ key: `artif:${fields.id}`, value: JSON.stringify(fields) }),
    saveAs: 'kvPair',
  },
}
