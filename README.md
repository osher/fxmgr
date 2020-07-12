# fxmgr - fixture manager for e2e tests

Fixture manager for integration and end-to-end tests.

## status

[![npm version](https://img.shields.io/npm/v/fxmgr.svg?style=flat)](https://www.npmjs.com/package/fxmgr)
[![master-ci+cd](https://github.com/osher/fxmgr/workflows/master-ci+cd/badge.svg)](https://github.com/osher/fxmgr/actions)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fosher%2Ffxmgr.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fosher%2Ffxmgr?ref=badge_shield)
[![Known Vulnerabilities](https://snyk.io/test/github/osher/versi/badge.svg?targetFile=package.json)](https://snyk.io/test/github/osher/versi?targetFile=package.json)
[![Coverage Status](https://coveralls.io/repos/github/osher/fxmgr/badge.svg?branch=master)](https://coveralls.io/github/osher/fxmgr?branch=master)

## Overview

In a nutshell:
 1. all fixtures for all your e2e tests are set **once** before your tests are run
 2. fixture data is validated before tests start
 3. during tests - access fixture data programatically and synchronously so you
   can:
    - proivde API calls ids and values which are part of the fixture
    - assert that APIs returned the expected values
 4. all fixtures are cleaned up **once** after all tests have run
 5. crucial entities are validated to have not been damaged by your tests (useful
    when you have to use a shared environment)

From all the above - 1,2,4,5 - are done for you by `fxmgr`.

All you have to do is define your fixtures and their projections onto the
relevant stores, and connect the setup/teardown hooks - and you can both relay
on the fixture data to be in the stores, and use it programatically in tests.

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
module.exports = {
  entity: 'person',
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
      id: 9000001,
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
    },
  },
  stores: {
    db: {
      toStoredForm: ({ fname: firstName, lname: lastName, id }) => ({ id, firstName, lastName }),
      saveAs: 'doc',
    },
    cache: {
      toStoredForm: ({ fname: firstName, lname: lastName, id }) => ({ key: `person:${id}`, value: JSON.stringify({ id, firstName, lastName }) }),
      saveAs: 'cache',
    },
  },
}
```

What are cases?
  - a case is a data-entity used by end-to-end tests to proof a user-story or a
    use-case.
  - this data-entity may be represented by one entry or more in one or more
    stores.
  - ideally, each case in the fixture should be dedicated to specific tests of
    specific user-stories. This is an absolute must for user-stories that
    manipulate data in order to guarantee that when the code accesses the data
    as part of the test - the test can rely on the state of the data entries.
  - It's OK to have few tests share the same data entities if **none** of them
    *mutates* any data records. This is often useful to create records that
    describe real world entities with real-world names and structure that get
    to become eventually a part of the organzation's DSL.
    However - when doing that, there's the risk that things might break when
    tests end up mutating these entries despite they should not.

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

What are stored forms?
 - the fixtures are designed in a way that should be easy for you to use in
   your tests, however, this form might not be the form they are kept in store.
 - **stored-form** is the form in which it appears in the actual store, mapped
   from the case entry.
 - when you provide 'saveAs', the fixture case object is augmented with an
   additional property by the provided name which holds the mapped stored form.


### 2. Create your setup and teardown sequences

`./test/fx/index.js`, assuming the fixture above, and a config with entries
for `redis` and `mongo`.

This example uses the `config` package, and expect the config to expose the
configs for both `mongo` and `redis` as root keys, however, you can do it anyhow you
like.

```javascript
const { redis: redisConfig, mongo: mongoConfig } = require('config')
module.exports = require('fxmgr').init({
  stors: {
    db: {
      type: 'mongo',
      defaultCase: 'testData',
      config: mongoConfig,
    },
    cache: {
      type: 'redis',
      dataType: 'strings',
      defaultCase: 'reservedEmpty',
      config: redisConfig,
    }
  },
  fixtures: {
    persons: require('./persons'),
  }
})
```

The init returns an object with:
  - `beforeAll` and `afterAll` hooks,
  - `seed` method
  - `fixtres` collection (also available as `fx`)
  - `stores` collection

### 3. Use your setup in tests

This example assumes `test/util.js` which exposes `setup` and `teardown` that
run the target server in a `child_process`.
(`e2e-helper` is an example of a package you can use to do it).

`./test/GET.person.{id}.js`

```javascript
const Should = require('should')
const {
  beforeAll,
  afterAll,
  stores: {
    //db: { collection }, // - if we were doing POST/PUT requests, we'd want to see how the DB is changed
    cache           ,       //   but here we do want to see how the cache is affected
  },
  fixtures: { persons }, //or `fx: { perrsons }` - it's an alias
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
      request(`${SUT}/person/${persons.johnSnow.id}`) //because everybody remembers John Snow...
      .responds({
        status: 200,
        body: {
          'should include lname and fname of the queried entity': body => {
            Should(body).have.properties( persons.johnSnow.doc )
          },
        },
      })
    })

    describe('when hit with an id that is in DB and not in cache', () => {
      request(`${SUT}/person/${persons.johnDoe.id}`) //because nobody remembers John Doe...
      .responds({
        status: 200,
        body: {
          'should include lname and fname of the queried entity': body => {
            Should(body).have.properties( persons.johnDoe.doc )
          },
        },
        and: {
          'should update the entry in cache': async () => {
            const cached = await cache.client.get(persons.johnDoe.cache.key)
            Should(cached).eql(persons.johnDoe.cache.value)
          },
        },
      })
    })
  })
})
```

## more examples

Please check the examples provided here. They work - they are ran within our CI.

[here](./examples)

## Roadmap

`[v]` 0.6.x - This is the preliminary version. Tested manually. Works, however
    violent - i.e could be much more friendly with its errors.
    focus in adding tests, CI, linting, coverage and README.

`[ ]` 0.8.x - will be on user-experience - i.e killing TBDs and not-Implemented
    errors, apply user-input validations, more friendly errors, and better API
    that lets you write less and gain more.

`[ ]` 1.0.x - will be released upon all API issues will be resolved.
   A good time to assume that API changes are not expected is after we have a
   working a stable db adapter for sql dbs (mssql, mysql, postgres, etc), either
   as part of this project, or as an appendable plugin.
   Breaking API form changes may occur up until this version, after which the
   next Major release will hopefully be very far.

## Backlog

Anything from the backlog that will be ready for a version - will be released
with it.
- a built-in cli tool that lets you run
   - `fxmgr seed` - to initiate an env
   - `fxmgr setup` - to run setup, and `fxmgr cleanup`, to help you restore a
      desired state
- redis adapter implements only dataType `strings`. Need to support `hashes`,
  `lists`, `sets`, and `sortedSets`
- add an sql adapter implementation, probably based on `knex`
- I also consider moving the test-db adapters to their own modular units...

## License

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fosher%2Ffxmgr.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fosher%2Ffxmgr?ref=badge_large)
