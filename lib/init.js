const inst = {}

module.exports = {
  init,
  get,
  of: get,
  rm: name => { delete inst[name] },
}

function init({
  toFixture = require('./fixture'),
  load = require('require-yml'),
  name = 'default',
  fixturesDir,
  fixturesDirs = fixturesDir && [fixturesDir],
  //the essense:
  fixtures = fixturesDirs && load(fixturesDirs),
  stores: storeConfigs = {},
}) {
  //TBD: validate stores and fixtures
  if (inst[name]) throw contextNameTaken(name)

  const stores = initStores(storeConfigs)

  const { fx, storesData } = initFxAndStoreEntityIndex(fixtures, stores)

  const { storeHooks } = Object.entries(storeConfigs).reduce(
    ({ stores, storeHooks }, [name, { type, config, ...rest }]) => {
      //TBD: support 3rd party types from node-modules
      const storeFactory = require(`./test-db-${type}`)

      const store = storeFactory(config)
      const storeData = storesData[name]

      //TBD: not sure we're copying to the right place. need to build a test for it!
      Object.values(storeData).forEach(fx => Object.entries(rest).forEach(([k, v]) => k in fx || (fx[k] = v)))
      storeHooks.push(store.useData(storeData))

      stores[name] = store
      return { stores, storeHooks }
    },
    { stores, storeHooks: [] },
  )

  return inst[name] = {
    fx,
    stores,
    seed: () => eachStore(storeHooks, 'seed'),
    beforeAll: () => eachStore(storeHooks, 'beforeAll'),
    afterAll: () => eachStore(storeHooks, 'afterAll'),
  }

  function eachStore(storeHooks, step) {
    const errors = []
    return Promise
    .all(storeHooks.map(
      store => store[step]().catch(e => errors.push(e) && null),
    ))
    .then(
      res => errors.length
        ? Promise.reject(Object.assign(new Error(`${step}: one or more stores failed`), {
            step,
            errors: errors.map(e => ({ message: e.message, ...e })),
          }))
        : res,
    )
  }

  function initStores(storeConfigs) {
    return Object.entries(storeConfigs).reduce(
      (stores, [name, { type, ...options }]) => {
        //TBD: support 3rd party types from node-modules
        const storeFactory = require(`./test-db-${type}`)

        const store = storeFactory(options)
        store[Symbol.for('options')] = options

        stores[name] = store

        return stores
      },
      {},
    )
  }

  function initFxAndStoreEntityIndex(fixtures, stores) {
    return Object.entries(fixtures).reduce(
      ({ fx, storesData }, [entity, fixture]) => {
        if (!fixture.entity) fixture.entity = entity
        fx[entity] = toFixture(fixture, stores)

        Object.entries(fixture.stores || {}).forEach(([store, storeData]) => {
          if (!storesData[store]) storesData[store] = {}
          storesData[store][entity] = storeData
        })

        return { fx, storesData }
      },
      { fx: {}, storesData: {} },
    )
  }
}

function get(name = 'default') {
  const mgr = inst[name]
  if (mgr) return mgr

  throw Object.assign(new Error(`no such fxmgr instance: ${name}`), {
    description: [
      'This error is thrown when trying to get a fxmgr by name, but there is',
      'no initiated fxmgr under this name',
      'make sure that in your order of operations the context is first',
      'initiated, and only then accessed',
    ],
    code: 'UNINITIATED',
    uninitiaedName: name,
  })
}

function contextNameTaken(occupiedName) {
  return Object.assign(new Error('fxmgr instance name conflict'), {
    description: [
      'This error is thrown when a fxmgr is initiated under a name that is already initiated.',
      'You may initiate as mamny Fixture-Managers as you need, however their names must be unique.',
      'If you did not provide a name - the default name is: \'default\'',
      'Use `fxmgr.of(name) to retrieve an existing one',
    ],
    code: 'NAME_CONFLICT',
    occupiedName,
  })
}
