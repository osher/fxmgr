# require-yml 2.0 style

This example shows a style that fits for projects with big intricate fixtures
made of big and intricate cases, where putting them all in one file would be
a burden.

When the team would like to isolate each case in it's own file - this example
shows how it's done.

All of the logic comes from `require-yml@2.x`.
i.e - you can organize your file in any way supported by this library.

# How it works

This method is tried when options passed to `fxmgr.init({})` does not include
`fixtures` key.

In this case, when the key `loadFixtures` is provided - it's passed to
`require-yml` as is, and the value it returns synchronously is used as the
fixtures collection.

You can also provide your own loader function if you're disatisfied with the
`require-yml` default loader.
