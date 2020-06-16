module.exports = ({
  assert = require('assert'),
  isDeepStrictEqual = require('util').isDeepStrictEqual,
  fs = require('fs'),
  Promise = global.Promise,
  mongodb: {
    connect, ObjectId,
  } = require('mongodb'),
  connection: conn,
  config: {
    url = 'mongodb://localhost:27017',
    dbName: defaultDbName = 'test-db',
    options: {
      sslCAFile,
      sslCA = sslCAFile && fs.readFileSync(sslCAFile), //eslint-disable-line no-sync
      ...mongoOptions
    } = {},
  } = {},
  dbName = defaultDbName,
  postTestCleanup: cleanup = true,
  oidCustomCompare = (dbVal, searchedVal) =>
    dbVal instanceof ObjectId && 'string' == typeof searchedVal.$oid
    ? String(dbVal) === searchedVal.$oid
    : undefined, //eslint-disable-line no-undefined
  cols = {},
  mgr,
  db,
} = {}) => mgr = {
  connect: () =>
    (conn
      ? Promise.resolve(conn)
      : connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          promiseLibrary: Promise,
          sslCA,
          ...mongoOptions,
        })
    )
    .then(c => db = (conn = c).db(dbName)),

  disconnect: () =>
    conn && conn.close()
    .then(() => { conn = db = null }),

  collection: (colName, {
    removeWhenDone = cleanup,
    customCompare = oidCustomCompare,
    areEqual = (a, b) => isDeepStrictEqual(a, b, customCompare),
    idAttr = '_id',
    attrQueryFor = doc => doc,
    mongoCollection: c = db.collection(colName),
    normalizePropValue = v => v.$oid ? ObjectId(v.$oid) : v,
    normalize = v =>
      Array.isArray(v)
      ? v.map(normalize)
      : v && 'object' == typeof v && Object.keys(v).forEach(k => v[k] = normalizePropValue(v[k])) || v,
    queryFor = entries => {
        let ids = []
        const $or = []

        entries.forEach(
          ({ [idAttr]: id, ...props }) => id
            ? ids.push(id.$oid ? ObjectId(id.$oid) : id)
            : $or.push(attrQueryFor(props)),
        )

        if (0 === ids.length + $or.length) return null
        if (ids.length) ids = { _id: { $in: ids } }
        if (!$or.length) return ids

        $or.push(ids)
        return { $or }
    },
    find = (docs, predicate) => {
        const ix = docs.findIndex(predicate)
        if (-1 === ix) return false

        docs.splice(ix, 1)
        return true
    },
    idMatcher = searchedId => ({ [idAttr]: idFromDb }) => areEqual(idFromDb, searchedId),
    propsMatcher = searchedProps => propsFromDb => areEqual(propsFromDb, searchedProps),
    idMatch = (docs, searchedId) => find(docs, idMatcher(searchedId)),
    propsMatch = (docs, searchedProps) => find(docs, propsMatcher(searchedProps)),

    assertState = (mongoCollection, mustEql = [], mustExist = []) =>
      mustEql.length + mustExist.length && mongoCollection
      .find(queryFor(mustEql.concat(mustExist)))
      .toArray()
      .then(docs => {
        if (mustExist.length) {
            const notExist = mustExist.reduce(
                (ix, { [idAttr]: searchedId, ...searchedProps }) =>
                  (searchedId
                    ? idMatch(docs, searchedId) || ix.byId.push(searchedId)
                    : propsMatch(docs, searchedProps) || ix.byProps.push(searchedProps)
                  ) && ix,
                { byId: [], byProps: [] },
            )

            assert.deepEqual(
              notExist,
              { byId: [], byProps: [] },
              `${dbName}.${colName}: mustExist assertion - missing mandatory entries in db`,
            )
        }

        if (mustEql.length) {
            const notEqual = mustEql.filter(searchedProps => !propsMatch(docs, searchedProps))
            assert.deepEqual(notEqual, [], `${dbName}.${colName}: mustEql assertion - entries mutated or missing in db`)
        }
      }),
  } = {}) => cols[colName] || (cols[colName] = {
    mongoCollection: c,

    setup: ({
      insert = [], clear = [], ix = [], mustEql = [], mustExist = [],
      notOnlyDupKeyErrs = ({ result: { writeErrors = [] } = {} }) => writeErrors.some(e => 11000 === e.err.code),
      normalizeBulkErr = ({ result: { result: { ok, nInserted, insertedIds: ids } } }) => ({
        result: { ok, n: nInserted },
        insertedIds: ids.reduce((ids, ({ index, _id: id }) => Object.assign(ids, { [index]: id })), {}),
      }),
      updateInsertedIds = ({ insertedIds }) =>
        Object.entries(insertedIds).forEach(([ix, id]) => insert[ix][idAttr] = id),
    } = {}) =>
      Promise.resolve()
      .then(() => Promise.all(ix.map(i => c.createIndex(i))))
      .then(() => queryFor(clear.concat(insert)))
      .then(q => q && c.deleteMany(q))
      .then(
        () =>
          c.insertMany(insert.map(doc => normalize(doc)))
          .catch(err => !err.result || notOnlyDupKeyErrs(err.result) ? Promise.reject(err) : normalizeBulkErr(err))
          .then(updateInsertedIds),
      )
      .then(() => assertState(c, normalize(mustEql), normalize(mustExist)))
      .then(() => ({ ok: true, colName }))
      .catch(e => Promise.reject(Object.assign(e, { colName, ix, insert, clear, mustEql, mustExist }))),

    cleanup: ({ cleanup, mustEql, mustExist }) =>
      Promise.resolve()
      .then(() => removeWhenDone && cleanup.length && c.deleteMany(queryFor(cleanup)))
      .then(() => assertState(c, mustEql, mustExist))
      .then(() => ({ ok: true, colName })),

    indexes:  () => c.listIndexes().toArray(),
    docs:     () => c.find({}).toArray(),
    findOne:  q => c.findOne(q),
    find:     q => c.find(q).sort({ _id:1 }).toArray(), //eslint-disable-line newline-per-chained-call

    delete:   q => c.deleteMany(q),
  }),

  useData:
    (collections, { connect, collection, disconnect } = mgr) => ({
      seed: () =>
        Promise.resolve()
        .then(connect)
        .then(() => Promise.all(Object.entries(collections).map(
            ([name, fx]) => collection(name).setup(fx.seed),
        ))),

      beforeAll: () =>
        Promise.resolve()
        .then(connect)
        .then(() => Promise.all(Object.entries(collections).map(
          ([name, fx]) => collection(name).setup(fx.setup),
        ))),

      afterAll: () =>
        (db && cleanup
          ? Promise.all(Object.entries(collections).map(
              ([name, fx]) => collection(name).cleanup(fx.teardown),
            ))
          : Promise.resolve()
        )
        .finally(disconnect),

      collection,
    }),
}
