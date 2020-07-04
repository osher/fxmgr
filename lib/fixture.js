const { inspect } = require('util')
const metaSymbol = Symbol.for('fixture-meta')

module.exports = (fx, ...a) => fx[metaSymbol] ? fx : fixture(fx, ...a)

function fixture({
    configAt = '~',
    idOf = o => o.id && o.id.$oid || o.id,
    entity = 'entry',
    cases,
    stores: entityStores = {},
    onEntry,
    testData = (entry, ix) => {
        ix.insert.push(entry)
        ix.cleanup.push(entry)
    },
    reservedEmpty = (entry, ix) => {
        ix.clear.push(entry)
        ix.cleanup.push(entry)
    },
    mustExist: fnMustExist = (entry, ix) => {
        ix.seed.push(entry)
        ix.mustExist.push(entry)
    },
    mustEql: fnMustEql = (entry, ix) => {
        ix.seed.push(entry)
        ix.mustEql.push(entry)
    },
    ignore = () => null,
    symOptions = Symbol.for('options'),
}, stores = {}) {
    const fx = { [metaSymbol]: { entity } }
    const all = []
    const byId = {}
    all[inspect.custom] = () => 'Array< ...all stored forms... >'
    byId[inspect.custom] = () => '< ...by-id index... >'
    entityStores[inspect.custom] = () => '< ...stores data... >'

    Object.values(entityStores).forEach(initStoreIndexes)

    Object.entries(cases).forEach(([name, {
        [configAt]: storeCfg = {},
        ...rest
    }]) => {
        const id = idOf(rest)
        const entry = fx[name] = {
            id,
            name,
            entity,
            ...rest,
        }
        all.push(entry)
        if (id) byId[id] = entry

        Object.entries(entityStores).forEach(([store, {
          toStoredForm = v => v,
          saveAs,
          //TRICKY:
          // entity storeStores may:
          // - override store level options
          // - or be the only provider of store definitions
          storeOptions = (stores[store] || {})[symOptions],
          defaultCase = storeOptions.defaultCase,
          supportedCaseTypes,
        }]) => {
            const handler = caseTypeHanbler({ storeCfg, store, defaultCase, supportedCaseTypes })

            const storedForm = toStoredForm(entry)
            if (saveAs) entry[saveAs] = storedForm

            handler(storedForm)
        })

        if ('function' == typeof onEntry) onEntry(entry)
    })

    return Object.defineProperties(fx, {
        byId: {
            enumerable: true,
            configurable: true,
            value: byId,
        },
        all: {
            enumerable: true,
            configurable: true,
            value: all,
        },
        stores: {
            enumerable: true,
            configurable: true,
            value: entityStores,
        },
    })

    function initStoreIndexes(store) {
        const insert = []
        const clear = []
        const mustExist = []
        const mustEql = []
        const cleanup = []
        const seed = []
        const ix = { insert, clear, mustEql, mustExist, seed, cleanup }

        Object.defineProperties(store, {
            supportedCaseTypes: {
                configurable: true,
                value: {
                    testData: entry => testData(entry, ix),
                    reservedEmpty: entry => reservedEmpty(entry, ix),
                    mustExist: entry => fnMustExist(entry, ix),
                    mustEql: entry => fnMustEql(entry, ix),
                    ignore,
                },
            },
            seed: {
                enumerable: true,
                configurable: true,
                value: { insert: seed },
            },
            setup: {
                enumerable: true,
                configurable: true,
                value: { insert, clear, mustEql, mustExist },
            },
            teardown: {
                enumerable: true,
                configurable: true,
                value: { cleanup, mustEql, mustExist },
            },
        })
    }

    function caseTypeHanbler({ storeCfg, store, defaultCase, supportedCaseTypes }) {
        const caseType = storeCfg[store] || defaultCase
        const caseTypeStrategy = supportedCaseTypes[caseType]
        if (!caseTypeStrategy) {
            throw Object.assign(new Error(`fixture - unsupported caseType: ${caseType}.`), {
                store,
                type: storeCfg.type || 'n/a',
                supported: Object.keys(supportedCaseTypes),
                found: caseType,
            })
        }
        return caseTypeStrategy
    }
}
