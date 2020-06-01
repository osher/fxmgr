/* eslint-disable */

//TBD: move this to fxmgr-mongo open-source

module.exports = ({
  assert = require('assert'),
  isDeepStrictEqual = require('util').isDeepStrictEqual,
  fs = require('fs'),
  Promise = require('bluebird'),
  mongodb: {
    connect, ObjectId,
  } = require('mongodb'),
  connection: conn,
  config: {
    url = 'mongodb://localhost:27017',
    dbName: defaultDbName = 'test-db',
    options: {
      sslCAFile,
      sslCA = sslCAFile && fs.readFileSync(sslCAFile),
      ...mongoOptions
    } = {},
  } = {},
  dbName = defaultDbName,
  postTestCleanup: cleanup = true,
  fxDocAttr = 'doc',
  oidCustomCompare = (dbVal, searchedVal) =>
    dbVal instanceof ObjectId && 'string' == typeof searchedVal.$oid
    ? String(dbVal) == searchedVal.$oid
    : undefined,
  cols = {},
  mgr,
  db,
} = {}) => (mgr = {
  connect: ({
    removeWhenDone = cleanup,
  } = {}) =>
    ( conn
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
    areEqual = (a,b) => isDeepStrictEqual(a,b, customCompare),
    idAttr = '_id',
    attrQueryFor = doc => doc,
    mongoCollection: c = db.collection(colName),
    normalizePropValue = v => v.$oid ? ObjectId(v.$oid) : v,
    normalize = v =>
      Array.isArray(v)
      ? v.map(normalize)
      : v && 'object' == typeof v && Object.keys(v).forEach(k => v[k] = normalizePropValue(v[k])) || v,
    queryFor = entries => {
        let ids = [], $or = []

        entries.forEach(({[idAttr]: id, ...props}) =>
          id
          ? ids.push( id.$oid ? ObjectId(id.$oid) : id )
          : $or.push(attrQueryFor(props))
        );

        if (0 == ids.length + $or.length) return null
        if (ids.length) ids = { _id: { $in: ids } }
        if (!$or.length) return ids

        $or.push(ids)
        return { $or }
    },
    find = (docs, predicate) => {
        const ix = docs.findIndex(predicate)
        if (-1 == ix) return false

        docs.splice(ix, 1)
        return true
    },
    idMatcher = searchedId => ({ [idAttr]: idFromDb }) => areEqual(idFromDb, searchedId),
    propsMatcher = searchedProps => (propsFromDb) => areEqual(propsFromDb, searchedProps),
    idMatch = (docs, searchedId) => find(docs, idMatcher(searchedId)),
    propsMatch = (docs, searchedProps) => find(docs, propsMatcher(searchedProps)),

    assertState = (mongoCollection, mustEql = [], mustExist = []) =>
      (mustEql.length + mustExist.length) && mongoCollection
      .find(queryFor(mustEql.concat(mustExist)))
      .toArray()
      .then(docs => {
        if (mustExist.length) {
            const notExist = mustExist.filter(({[idAttr]: searchedId, ...searchedProps}) =>
              !( searchedId
                ? idMatch(docs, searchedId)
                : propsMatch(docs, searchedProps)
              )
            )
            assert.deepEqual(notExist, [], `${dbName}.${colName}: missing mandatory entries`)
        }

        if (mustEql.length) {
            const notEqual = mustEql.filter((searchedProps) => !propsMatch(docs, searchedProps))
            assert.deepEqual(notEqual, [], `${dbName}.${colName}: 'mustEql' entries mutated or missing in db`)
        }
      }),
  } = {}) => cols[colName] || (cols[colName] = {
    mongoCollection: c,

    setup: ({
      insert = [], clear = [], ix = [], mustEql = [], mustExist = [],
      notOnlyDupKeyErrs = ({result: {writeErrors = []} = {}}) => writeErrors.some(e => 11000 === e.err.code),
      normalizeBulkErr = ({writeErrors, result: {result: {ok, nInserted, insertedIds: ids}}}) => ({
        result: {ok, n: nInserted},
        insertedIds: ids.reduce((ids, ({index, _id}) => Object.assign(ids, {[index]: id})), {}),
      }),
      updateInsertedIds = ({ insertedIds }) =>
        Object.entries(insertedIds).forEach(([ix, id]) => insert[ix]._id = id ),
    } = {}) =>
      Promise.resolve()
      .then(() => Promise.all(ix.map(i => c.createIndex(i))))
      .then(() => queryFor(clear.concat(insert)))
      .then((q) => q && c.deleteMany(q))
      .then(() =>
        c.insertMany(insert.map(doc => normalize(doc)))
        .catch(err => !err.result || notOnlyDupKeyErrs(err.result) ? Promise.reject(err) : normalizeBulkErr(err))
        .then(updateInsertedIds)
      )
      .then(() => assertState(c, normalize(mustEql), normalize(mustExist)))
      .then(() => ({ok: true, colName}))
      .catch(e => Promise.reject(Object.assign(e, { colName, ix, insert, clear, mustEql, mustExist}))),

    cleanup: ({cleanup, mustEql, mustExist}) =>
      Promise.resolve()
      .then(() => cleanup && c.deleteMany(queryFor(cleanup)))
      .then(() => assertState(c, mustEql, mustExist))
      .then(() => ({ok: true, colName})),

    indexes:  () => c.listIndexes().toArray(),
    docs:     () => c.find({}).toArray(),
    findOne:  (q) => c.findOne(q),
    find:     (q) => c.find(q).sort({_id:1}).toArray(),

    delete:   (q) => c.deleteMany(q),
  }),

  useData:
    (collections, {connect, collection, disconnect} = mgr) => ({
      seed: () =>
        Promise.resolve()
        .then(connect)
        .then(() => Promise.all(Object.entries(collections).map(
            ([name, fx]) => collection(name).setup(fx.seed)
        ))),

      beforeAll: () =>
        Promise.resolve()
        .then(connect)
        .then(() => Promise.all(Object.entries(collections).map(
          ([name, fx]) => collection(name).setup(fx.setup)
        ))),

      afterAll: () =>
        ( db && cleanup
          ? Promise.all(Object.entries(collections).map(
              ([name, fx]) => collection(name).cleanup(fx.teardown)
            ))
          : Promise.resolve()
        )
        .finally(disconnect),

      collection,
    }),
})
