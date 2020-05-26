# fxmgr - fixture manager for e2e tests

## installation

`fxmgr` is designed to be a test helper. Unless your project is a test suite by
itself, you should install it as a local dev-dependency.

```
npm i fxmgr --save-dev
```

Currently, it supports `mongodb` and `redis`. However, mind that if you use any
of them - you'll have to install `redis` or `mongodb` by yourself, as those are
peer-dependencies, and are not installed by default.

## Usage

### 1. Describe your data fixtures

`./test/fx/persons.js`:

```javascript
module.exports = require('fxmgr').fixture({
  entity: 'person',
  stores: {
    db: {
      type: 'mongo',
      defaultCase: 'testData',
      toStoredForm: ({fname, lname, id}) => ({ fname, lname, id}),
      saveAs: 'doc',
    },
    cache: {
      type: 'redis',
      dataType: 'strings',
      defaultCase: 'reservedEmpty',
      toStoredForm: ({fname, lname, id}) => ({ key: `person:${id}`, value: JSON.stringify({id, fname, lname}),
      saveAs: 'cache',
    },
  },
  cases: {
    noSuch: {
      '~': { 
        //<store-name>:  <case-type for this entity in the store>
        db: 'reseredEmpty',
        cache: 'reservedEmpty',
      },
      id: 9900000,
    },
    johnDoe: {
      '~': { db: 'testData', cache: 'reservedEmpty' },
      id: 9000001
      fname: 'John',
      lname: 'Doe',
    },
    johnSnow: {
      '~': { db: 'testData', cache: 'testData' },
      id: 9000002,
      fname: 'John',
      lname: 'Snow',
    },
    saintJohn: {
      '~': { db: 'mustExist', cache: 'ignore' },
      id: 1,
      fname: 'John',
      lname: 'Cidade',
    }
  },
})
```

What are case types?

  - `reservedEmpty`
     - ids that should be free in the DB
     - either to test 404, or to test entity creations
     - are removed in the begining of the test, and at end of the test
  - `testData`
     - entities that should be in the db for the test to work
     - used to be read or to be updated
     - created on setup and removed at the end
  - `mustExist` 
     - entitis that must be in the DB, but are owned by the environment
     - the desired state of these entries is NOT known to the fixture
     - does not try to set them up, nor to clean them up
     - instead - they are validated to be found on the db
  - `mustEql`
     - entities that must be in the DB, but are owned by the environment
     - the desired state of these entries IS known to the fixture
     - does not try to set them up, nor to clean them up
     - they are validated against the desired state specified in the fixture


### 2. Create your setup and teardown sequences

`./test/fx/index.js`, assuming the fixture above, and a config with entries
for redis and mongo.

This example uses the `config` package, however, you can do it anyhow you like.

```javascript
const { redis, mongo } = require('fxmgr')

const redisConfig = require('config').redis
const mongoConfig = require('config').mongo
const persons = require('./persons')

const fxRedis = redis(redisConfig).useData({
  persons: persons.stores.cache,
})
const fxMongo = mongo(mongoConfig).useData({
  persons: persons.stores.db,
})

module.exports = {
  mongo: fxMongo,
  redis: fxRedis,
  fx: { persons },
  beforeAll: () => Promise.all( [fxMongo, fxRedis].map(fx => fx.beforeAll()),
  afterAll: () => Promise.all( [fxMogno), fxRedis].map(fx => fx.afterAll()),
}

```

### 3. Use your setup in tests

This example assumes `test/util.js` which exposes `setup` and `teardown` that 
run the target server in a `child_process`. 
(`e2e-helper` is an example of a package you can use to do it).


`./test/my-cool-person-client.js`

```javascript
const Should = require('should')
const { 
  beforeAll,
  afterAll, 
  //mongo: { collection }, // - if we were doing POST/PUT requests, we'd want to see how the DB is changed
  redis: { client },       //   but here we do want to see how the cache is affected
  fx: { persons },
} = require('./fx')
const { setup: runSvr, teardown: stopSvr } = require('./util')
const request = require('mocha-ui-exports-request') //yes, I know, has become to be a bad name. will change in the future
const SUT = 'http://localhost:3000'

describe('my cool person server', () => {
  before(async () => {
    await beforeAll()
    await runSvr()
  })

  after(async () => {
    await stopSvr()
    await afterAll()
  })

  describe('GET /person/:id', () => {
    describe('when hit with an id that is not in the DB', () => {
      request(`${SUT}/person/${persons.noSuch.id}`)
      .responds({ status: 404, body: [/no such entity/] })
    })

    describe('when hit with an id that is is found in cache', () => {
      request(`${SUT}/person/${persons.johnSnow.id}) //because everybody remembers John Snow...
      .responds({
        status: 200,
        body: {
          'should include lname and fname of the queried entity': body => {
            Should(body).have.properties( persons.johnDoe.doc )
          },
        },
      })
    })

    describe('when hit with an id that is in DB and not in cache', () => {
      request(`${SUT}/person/${persons.johnDoe.id}) //because nobody remembers John Doe...
      .responds({
        status: 200,
        body: {
          'should include lname and fname of the queried entity': body => {
            Should(body).have.properties( persons.johnDoe.doc )
          },
        },
        and: {
          'should update the entry in cache': done => {
             client.get(persons.johnDoe.cache.key, (err, cached) => {
               if (err) return done(err);
               Should(cached).eql(persons.johnDoe.cache.value);
             })
          }
        }
      })
    })
  })
})
```

## Roadmap
[v] 0.6.x - This is the preliminary version. Tested manually. Works, however 
    violent. Could be much more friendly.
[ ] 0.8.x - will focus in adding tests, CI, linting, coverage.
[ ] 1.0.x - will be released with focus on user-experience - i.e user-input 
    validations and more friendly errors.
    API changes may occur up until this version.

## Backlog
Anything from the backlog that will be ready for a version - will be released
with it.
- a built-in cli tool that lets you run 
   - `fxmgr seed` - to initiate an env
   - `fxmgr setup` - to run setup, and `fxmgr cleanup`, to help you restore a
      desired state 
- redis adapter implements only dataType `strings`. Need to support `hashes`,
  `lists`, `sets`, and `sortedSets`
- add an sql adapter implementation, probably based on knex


