// NOTE: to run this you will probably need to be authorized with GitHub.
// Run `./changelog-maker.js` by itself to set this up.

import { dirname, join } from 'path'
import { execSync } from 'child_process'
import { test } from 'tap'
import chalk from 'chalk'

const __dirname = dirname(new URL(import.meta.url).pathname)

function exec (args) {
  const stdout = execSync(`"${process.execPath}" ${join(__dirname, 'changelog-maker.js')} ${args}`).toString()

  return stdout
}

test('test basic commit block', (t) => {
  t.equal(exec('--md --start-ref=v1.3.9 --end-ref=v1.3.10'),
    `* \\[[\`e28b3f2813\`](https://github.com/nodejs/changelog-maker/commit/e28b3f2813)] - 1.3.10 (Rod Vagg)
* \\[[\`ace3af943e\`](https://github.com/nodejs/changelog-maker/commit/ace3af943e)] - Merge pull request #13 from jamsyoung/private-repo-support (Rod Vagg)
* \\[[\`25ec5428bc\`](https://github.com/nodejs/changelog-maker/commit/25ec5428bc)] - default to repo scope always - revert previous changes (James Young)
* \\[[\`424d6c22c1\`](https://github.com/nodejs/changelog-maker/commit/424d6c22c1)] - add --private arg to set repo scope, update readme (James Young)
* \\[[\`7c8c5e6215\`](https://github.com/nodejs/changelog-maker/commit/7c8c5e6215)] - 1.3.9 (Rod Vagg)
`)
  t.end()
})

test('test filter-release', (t) => {
  t.equal(exec('--md --start-ref=v1.3.9 --end-ref=v1.3.10 --filter-release'),
    `* \\[[\`ace3af943e\`](https://github.com/nodejs/changelog-maker/commit/ace3af943e)] - Merge pull request #13 from jamsyoung/private-repo-support (Rod Vagg)
* \\[[\`25ec5428bc\`](https://github.com/nodejs/changelog-maker/commit/25ec5428bc)] - default to repo scope always - revert previous changes (James Young)
* \\[[\`424d6c22c1\`](https://github.com/nodejs/changelog-maker/commit/424d6c22c1)] - add --private arg to set repo scope, update readme (James Young)
`)
  t.end()
})

test('test simple', (t) => {
  t.equal(exec('--start-ref=v1.3.9 --end-ref=v1.3.10'),
    `* [e28b3f2813] - 1.3.10 (Rod Vagg)
* [ace3af943e] - Merge pull request #13 from jamsyoung/private-repo-support (Rod Vagg)
* [25ec5428bc] - default to repo scope always - revert previous changes (James Young)
* [424d6c22c1] - add --private arg to set repo scope, update readme (James Young)
* [7c8c5e6215] - 1.3.9 (Rod Vagg)
`)
  t.end()
})

test('test plaintext', (t) => {
  t.equal(exec('--start-ref=9c700d2 --end-ref=dd937e9 --group --filter-release --plaintext'),
    `feature:
  * refactor and improve --commit-url (Rod Vagg)
test:
  * update refs for testing (Rod Vagg)
`)
  t.end()
})

test('test messageonly', (t) => {
  t.equal(exec('--start-ref=9c700d2 --end-ref=dd937e9 --group --filter-release --messageonly'),
    `feature:
  * refactor and improve --commit-url
test:
  * update refs for testing
`)
  t.end()
})

test('test group, semver labels, PR-URL', (t) => {
  t.equal(exec('--start-ref=v2.2.7 --end-ref=9c700d29 --group --filter-release'),
  `${chalk.green.bold('* [cc442b6534] - (SEMVER-MINOR) minor nit (Rod Vagg) https://github.com/nodejs/node/pull/23715')}
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
  t.equal(exec('--md --start-ref=v2.2.7 --end-ref=9c700d29 --group --filter-release'),
    `* \\[[\`cc442b6534\`](https://github.com/nodejs/changelog-maker/commit/cc442b6534)] - **(SEMVER-MINOR)** minor nit (Rod Vagg) [nodejs/node#23715](https://github.com/nodejs/node/pull/23715)
* \\[[\`4f2b7f8136\`](https://github.com/nodejs/changelog-maker/commit/4f2b7f8136)] - **deps**: use strip-ansi instead of chalk.stripColor (Rod Vagg)
* \\[[\`6898501e18\`](https://github.com/nodejs/changelog-maker/commit/6898501e18)] - **deps**: update deps, introduce test & lint deps (Rod Vagg)
* \\[[\`9c700d2910\`](https://github.com/nodejs/changelog-maker/commit/9c700d2910)] - **feature**: refactor and improve --commit-url (Rod Vagg)
* \\[[\`5094524655\`](https://github.com/nodejs/changelog-maker/commit/5094524655)] - **feature**: make the commit url configurable via an additional argument (Jim Nielsen) [#55](https://github.com/nodejs/changelog-maker/pull/55)
* \\[[\`42f248cf89\`](https://github.com/nodejs/changelog-maker/commit/42f248cf89)] - **src**: use \`standard\` for linting (Rod Vagg)
* \\[[\`64a8fdef3c\`](https://github.com/nodejs/changelog-maker/commit/64a8fdef3c)] - **test**: basic test infrastructure (Rod Vagg)
`)
  t.end()
})

test('test blank commit-url', (t) => {
  let actual = exec('--md --start-ref=v2.2.7 --end-ref=9c700d29 --filter-release --commit-url=http://foo.bar/').split('\n')
  actual.splice(0, actual.length - 3)
  actual = actual.join('\n')
  t.equal(actual,
    `* \\[[\`cc442b6534\`](http://foo.bar/)] - **(SEMVER-MINOR)** minor nit (Rod Vagg) [nodejs/node#23715](https://github.com/nodejs/node/pull/23715)
* \\[[\`5094524655\`](http://foo.bar/)] - **feature**: make the commit url configurable via an additional argument (Jim Nielsen) [#55](https://github.com/nodejs/changelog-maker/pull/55)
`)
  t.end()
})

test('test blank commit-url', (t) => {
  let actual = exec('--md --start-ref=v2.2.7 --end-ref=9c700d29 --filter-release --commit-url=https://yeehaw.com/{ref}/{ref}/{ghUser}/{ghRepo}/').split('\n')
  actual.splice(0, actual.length - 3)
  actual = actual.join('\n')
  t.equal(actual,
    `* \\[[\`cc442b6534\`](https://yeehaw.com/cc442b6534/cc442b6534/nodejs/changelog-maker/)] - **(SEMVER-MINOR)** minor nit (Rod Vagg) [nodejs/node#23715](https://github.com/nodejs/node/pull/23715)
* \\[[\`5094524655\`](https://yeehaw.com/5094524655/5094524655/nodejs/changelog-maker/)] - **feature**: make the commit url configurable via an additional argument (Jim Nielsen) [#55](https://github.com/nodejs/changelog-maker/pull/55)
`)
  t.end()
})

test('test backtick strings in commit messages', (t) => {
  t.equal(
    exec('--md --start-ref=ce886b5130 --end-ref=0717fdc946 --filter-release --commit-url=https://yeehaw.com/{ref}/{ref}/{ghUser}/{ghRepo}/'),
    `* \\[[\`0717fdc946\`](https://yeehaw.com/0717fdc946/0717fdc946/nodejs/changelog-maker/)] - **test**: \\\`commit\\_msg\\\` with an unescaped \\\` backtick char (Antoine du Hamel)
* \\[[\`9f1d897c88\`](https://yeehaw.com/9f1d897c88/9f1d897c88/nodejs/changelog-maker/)] - **test**: \\\`commit\\_msg\\\` with an escaped \\\\\\\` backtick char (Antoine du Hamel)
* \\[[\`4a3154bde0\`](https://yeehaw.com/4a3154bde0/4a3154bde0/nodejs/changelog-maker/)] - **test**: \`commit_msg\` starting with a backtick string (Antoine du Hamel)
* \\[[\`46384bb241\`](https://yeehaw.com/46384bb241/46384bb241/nodejs/changelog-maker/)] - **test**: commit\\_msg with \\\`backtick\\\\\\\` string (Antoine du Hamel)
* \\[[\`3b13c6804d\`](https://yeehaw.com/3b13c6804d/3b13c6804d/nodejs/changelog-maker/)] - **test**: commit\\_msg with \\\`\\\`backtick \\\` string\\\`\\\` (Antoine du Hamel)
* \\[[\`699ce8c377\`](https://yeehaw.com/699ce8c377/699ce8c377/nodejs/changelog-maker/)] - **test**: commit\\_msg with \`back_tick\` string (Antoine du Hamel)
* \\[[\`ce886b5130\`](https://yeehaw.com/ce886b5130/ce886b5130/nodejs/changelog-maker/)] - **test**: commit\\_msg with \`backtick\` string (Antoine du Hamel)
`)
  t.end()
})

test('test markdown punctuation chars in commit message and author name', (t) => {
  t.equal(
    exec('--md --start-ref=f12fe589c4 --end-ref=f12fe589c4 --filter-release --commit-url=https://yeehaw.com/{ref}/{ref}/{ghUser}/{ghRepo}/'),
    `* \\[[\`f12fe589c4\`](https://yeehaw.com/f12fe589c4/f12fe589c4/nodejs/changelog-maker/)] - **group\\_with\\_underscore**: test commit message (Author\\_name\\_with\\_underscore)
`)
  t.end()
})

test('test find-matching-prs', (t) => {
  t.equal(
    exec('--start-ref=a059bc7ca9 --end-ref=a059bc7ca9 --find-matching-prs=true nodejs changelog-maker'),
    `* [a059bc7ca9] - chore(deps): remove package-lock.json (Rod Vagg) https://github.com/nodejs/changelog-maker/pull/118
`)
  t.end()
})

test('test group, CVE-ID', (t) => {
  const out = exec('--md --start-ref=43d428b3d2 --end-ref=43d428b3d2 --group --filter-release')
  t.equal(
    out,
    `* \\[[\`43d428b3d2\`](https://github.com/nodejs/changelog-maker/commit/43d428b3d2)] - **(CVE-2024-22020)** **feat**: add cveId support to commmit output (RafaelGSS) [nodejs/node#55819](https://github.com/nodejs/node/pull/55819)
`)
  t.end()
})
