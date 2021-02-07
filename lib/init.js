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
  loadFixtures,
  //the essense:
  fixtures = loadFixtures && load(loadFixtures),
  stores: storeConfigs = {},
}) {
  if (inst[name]) throw contextNameTaken(name)
  //TBD: validate stores and fixtures

  const stores = initStores(storeConfigs)

  const { fx, storesData } = processFixtures(fixtures, stores)

  const storeHooks = gatherStoreHooks(stores, storesData)

  return inst[name] = {
    stores,
    fx,
    fixtures: fx,
    seed: () => eachStore(storeHooks, 'seed'),
    beforeAll: () => eachStore(storeHooks, 'beforeAll'),
    afterAll: () => eachStore(storeHooks, 'afterAll'),
  }

  function initStores(storeConfigs) {
    return Object.entries(storeConfigs).reduce(
      (stores, [name, { type, ...options }]) => {
        //TBD: support 3rd party types from node-modules
        const storeFactory = require(`./test-db-${type}`)

        const store = storeFactory(options)
        delete options.config
        store[Symbol.for('options')] = options

        stores[name] = store

        return stores
      },
      {},
    )
  }

  function processFixtures(fixtures, stores) {
    return Object.entries(fixtures).reduce(
      ({ fx, storesData }, [entityName, fixture]) => {
        if (!fixture.entity) fixture.entity = entityName

        fx[entityName] = toFixture(fixture, stores)

        fixture.stores && Object.entries(fixture.stores).forEach(
          ([store, { seed, setup, teardown }]) => storesData[store][entityName] = { seed, setup, teardown },
        )

        return { fx, storesData }
      },
      {
        fx: {},
        storesData: Object.keys(stores).reduce((d, store) => ({ ...d, [store]: {} }), {}),
      },
    )
  }

  function gatherStoreHooks(stores, storesData) {
    return Object.entries(storesData).map(([name, data]) => stores[name].useData(data))
  }

  function eachStore(storeHooks, step) {
    const errors = []
    return Promise
    .all(storeHooks.map(
      store => store[step]().catch(e => errors.push(e) && null),
    ))
    .then(
      res => errors.length
        ? Promise.reject(Object.assign(new Error(`${step}: one or more stores ended with errors`), {
            step,
            errors: errors.map(e => ({ message: e.message, ...e })),
            actual: errors.map(e => ({ message: e.message, ...e })),
            expected: [],
          }))
        : res,
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
