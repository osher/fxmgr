/* eslint-disable */

//TBD: move this to fxmgr-redis open-source

module.exports = ({
  util    = require('util'),
  assert  = require('assert'),
  Promise = require('bluebird'),
  redis   = require('redis').createClient,
  color   = v => util.inspect(v, { colors: process.stdout.isTTY }),
  blue    = v => process.stdout.isTTY ? `\u001b[36m${v}\u001b[39m` : v,
  config: redisOptions = {},
  client: c,
  postTestCleanup: cleanup = true,
  mgr,
} = {}) => (mgr = {
  connect: ({
    removeWhenDone = cleanup,
  } = {}) =>
    ( c
      ? Promise.resolve(c)
      : new Promise((accept, reject) =>
          mgr.client = c = redis(redisOptions)
          .on('error', reject)
          .once('connect', () => c.removeListener('error', reject) && accept(c))
        )
    )
    .then(({ server_info: { redis_version: version, role }, address, selected_db: db = 0 }) =>
      Object.assign(c, {[util.inspect.custom]: () =>
        `${blue('[RedisClient]')} { @ ${color(address)}, role: ${color(role)}, dbVer: ${color(version)}, #db: ${color(db)} }`
      })
    ),

  disconnect: () =>
    ( c
      ? new Promise((acc, rej) => c.quit(err => err ? rej(err) : acc()))
      : Promise.resolve()
    ),

  client: c,
  batch: ({
    step,
    client = c,
    multi  = c.multi(),
    mset   = arr => arr && arr.length && multi.mset(arr.reduce((args, en) => (args.push(en.key, en.value), args), [])),
    del    = arr => arr && arr.length && multi.del(arr.map(en => en.key)),
    mget   = (arr, cb) => arr && arr.length ? multi.mget(arr.map(en => en.key), cb) : cb(null, []),
    reject = [],
    ensure = mustExist =>
      mget(mustExist,
        (err, vals) => vals.forEach((v, ix) => null === v && reject.push(`missing key: ${mustExist[ix].key}`))
      ),
    equal  = eql =>
      mget(eql,
        (err, vals) => vals.forEach((v, ix) => eql[ix].value === v || reject.push(`missing key: ${eql[ix].key}`))
      ),
    batch,
    dataTypeNotImplemented = dataType => ({
      seed:      () => Promise.reject(new Error(`Not Implemented ${dataType}.seed`)),
      setup:     () => Promise.reject(new Error(`Not Implemented ${dataType}.setup`)),
      teardown:  () => Promise.reject(new Error(`Not Implemented ${dataType}.teardown`)),
    }),
  } = {}) => (batch = {
    strings: {
      seed:      ({insert}) => (mset(insert), batch),
      setup:     ({insert, clear, mustEql: eq, mustExist: ex}) => (del(clear), mset(insert), ensure(ex), equal(eq), batch),
      teardown:  ({cleanup, mustEql: eq, mustExist: ex}) => (del(cleanup) , ensure(ex), equal(eq), batch),
    },
    lists:      dataTypeNotImplemented('lists'),
    sets:       dataTypeNotImplemented('sets'),
    hashes:     dataTypeNotImplemented('hashes'),
    sortedSets: dataTypeNotImplemented('storedSets'),
    exec: () =>
      Promise.promisify((done) => multi.exec(done))()
      .then(() => assert.deepEqual(reject, [], 'missing or invalid string keys') || {[step]: 'ok'}),
  }),

  useData:
    (collections, {
      mgr: {
        connect,
        disconnect,
        client,
        batch,
      } = mgr,
      supportSteps = ['seed', 'setup', 'teardown'],
      stepIndex = () => ({strings: [], hashes: [], sets: [], sortedSets: []}),
      ixByStageAndType =
        (collections =>
          Object.entries(collections).reduce(
            (ix, [name, fx]) =>
              supportSteps.forEach(
                step => fx[step] && ix[step][fx.dataType].push(fx[step])
              ) || ix,
            supportSteps.reduce((ix, step) => Object.assign(ix, {[step]: stepIndex()}), {}),
          )
        )(collections),
      runStep = step =>
        Object.entries(ixByStageAndType[step]).reduce(
          (batch, [dataType, arrFx]) => (arrFx.forEach(fx => batch[dataType][step](fx)), batch),
          batch({step, client}),
        )
        .exec(),
    } = {}) => ({
      ixByStageAndType,
      seed: () =>
        Promise.resolve()
        .then(connect)
        .then(() => runStep('seed')),

      beforeAll: () =>
        Promise.resolve()
        .then(connect)
        .then(() => runStep('setup')),

      afterAll: () =>
        Promise.resolve()
        .then(connect)
        .then(() =>
          cleanup
          ? runStep('teardown')
          : Promise.resolve()
        )
        .finally(disconnect),

      client,
    }),
})
