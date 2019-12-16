// NOTE: to run this you will probably need to be authorized with GitHub.
// Run `./changelog-maker.js` by itself to set this up.

'use strict'

const path = require('path')
const { execSync } = require('child_process')
const { test } = require('tap')

function exec (args) {
  const stdout = execSync(`"${process.execPath}" ${path.join(__dirname, 'changelog-maker.js')} ${args}`).toString()

  return stdout
}

test('test basic commit block', (t) => {
  t.equal(exec('--start-ref=v1.3.9 --end-ref=v1.3.10'),
    `* [[\`e28b3f2813\`](https://github.com/nodejs/changelog-maker/commit/e28b3f2813)] - 1.3.10 (Rod Vagg)
* [[\`ace3af943e\`](https://github.com/nodejs/changelog-maker/commit/ace3af943e)] - Merge pull request #13 from jamsyoung/private-repo-support (Rod Vagg)
* [[\`25ec5428bc\`](https://github.com/nodejs/changelog-maker/commit/25ec5428bc)] - default to repo scope always - revert previous changes (James Young)
* [[\`424d6c22c1\`](https://github.com/nodejs/changelog-maker/commit/424d6c22c1)] - add --private arg to set repo scope, update readme (James Young)
* [[\`7c8c5e6215\`](https://github.com/nodejs/changelog-maker/commit/7c8c5e6215)] - 1.3.9 (Rod Vagg)
`)
  t.end()
})

test('test filter-release', (t) => {
  t.equal(exec('--start-ref=v1.3.9 --end-ref=v1.3.10 --filter-release'),
    `* [[\`ace3af943e\`](https://github.com/nodejs/changelog-maker/commit/ace3af943e)] - Merge pull request #13 from jamsyoung/private-repo-support (Rod Vagg)
* [[\`25ec5428bc\`](https://github.com/nodejs/changelog-maker/commit/25ec5428bc)] - default to repo scope always - revert previous changes (James Young)
* [[\`424d6c22c1\`](https://github.com/nodejs/changelog-maker/commit/424d6c22c1)] - add --private arg to set repo scope, update readme (James Young)
`)
  t.end()
})

test('test simple', (t) => {
  t.equal(exec('--start-ref=v1.3.9 --end-ref=v1.3.10 --simple'),
    `* [e28b3f2813] - 1.3.10 (Rod Vagg)
* [ace3af943e] - Merge pull request #13 from jamsyoung/private-repo-support (Rod Vagg)
* [25ec5428bc] - default to repo scope always - revert previous changes (James Young)
* [424d6c22c1] - add --private arg to set repo scope, update readme (James Young)
* [7c8c5e6215] - 1.3.9 (Rod Vagg)
`)
  t.end()
})

test('test group, semver labels, PR-URL', (t) => {
  t.equal(exec('--start-ref=v2.2.7 --end-ref=9c700d29 --group --filter-release --simple'),
    `* [cc442b6534] - (SEMVER-MINOR) minor nit (Rod Vagg) https://github.com/nodejs/node/pull/23715
* [4f2b7f8136] - deps: use strip-ansi instead of chalk.stripColor (Rod Vagg)
* [6898501e18] - deps: update deps, introduce test & lint deps (Rod Vagg)
* [9c700d2910] - feature: refactor and improve --commit-url (Rod Vagg)
* [5094524655] - feature: make the commit url configurable via an additional argument (Jim Nielsen) https://github.com/nodejs/changelog-maker/pull/55
* [42f248cf89] - src: use \`standard\` for linting (Rod Vagg)
* [64a8fdef3c] - test: basic test infrastructure (Rod Vagg)
`)
  t.end()
})

test('test simple group, semver labels, PR-URL', (t) => {
  t.equal(exec('--start-ref=v2.2.7 --end-ref=9c700d29 --group --filter-release'),
    `* [[\`cc442b6534\`](https://github.com/nodejs/changelog-maker/commit/cc442b6534)] - **(SEMVER-MINOR)** minor nit (Rod Vagg) [nodejs/node#23715](https://github.com/nodejs/node/pull/23715)
* [[\`4f2b7f8136\`](https://github.com/nodejs/changelog-maker/commit/4f2b7f8136)] - **deps**: use strip-ansi instead of chalk.stripColor (Rod Vagg)
* [[\`6898501e18\`](https://github.com/nodejs/changelog-maker/commit/6898501e18)] - **deps**: update deps, introduce test & lint deps (Rod Vagg)
* [[\`9c700d2910\`](https://github.com/nodejs/changelog-maker/commit/9c700d2910)] - **feature**: refactor and improve --commit-url (Rod Vagg)
* [[\`5094524655\`](https://github.com/nodejs/changelog-maker/commit/5094524655)] - **feature**: make the commit url configurable via an additional argument (Jim Nielsen) [#55](https://github.com/nodejs/changelog-maker/pull/55)
* [[\`42f248cf89\`](https://github.com/nodejs/changelog-maker/commit/42f248cf89)] - **src**: use \`standard\` for linting (Rod Vagg)
* [[\`64a8fdef3c\`](https://github.com/nodejs/changelog-maker/commit/64a8fdef3c)] - **test**: basic test infrastructure (Rod Vagg)
`)
  t.end()
})

test('test blank commit-url', (t) => {
  let actual = exec('--start-ref=v2.2.7 --end-ref=9c700d29 --filter-release --commit-url=http://foo.bar/').split('\n')
  actual.splice(0, actual.length - 3)
  actual = actual.join('\n')
  t.equal(actual,
    `* [[\`cc442b6534\`](http://foo.bar/)] - **(SEMVER-MINOR)** minor nit (Rod Vagg) [nodejs/node#23715](https://github.com/nodejs/node/pull/23715)
* [[\`5094524655\`](http://foo.bar/)] - **feature**: make the commit url configurable via an additional argument (Jim Nielsen) [#55](https://github.com/nodejs/changelog-maker/pull/55)
`)
  t.end()
})

test('test blank commit-url', (t) => {
  let actual = exec('--start-ref=v2.2.7 --end-ref=9c700d29 --filter-release --commit-url=https://yeehaw.com/{ref}/{ref}/{ghUser}/{ghRepo}/').split('\n')
  actual.splice(0, actual.length - 3)
  actual = actual.join('\n')
  t.equal(actual,
    `* [[\`cc442b6534\`](https://yeehaw.com/cc442b6534/cc442b6534/nodejs/changelog-maker/)] - **(SEMVER-MINOR)** minor nit (Rod Vagg) [nodejs/node#23715](https://github.com/nodejs/node/pull/23715)
* [[\`5094524655\`](https://yeehaw.com/5094524655/5094524655/nodejs/changelog-maker/)] - **feature**: make the commit url configurable via an additional argument (Jim Nielsen) [#55](https://github.com/nodejs/changelog-maker/pull/55)
`)
  t.end()
})
