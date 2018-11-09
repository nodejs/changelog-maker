const test = require('tape')
const execSync = require('child_process').execSync

function exec (args) {
  let stdout = execSync(`${process.execPath} ${__dirname}/changelog-maker.js ${args}`).toString()

  return stdout
}

test('test basic commit block', function (t) {
  t.equal(exec('--start-ref=v1.3.9 --end-ref=v1.3.10'),
    `* [[\`e28b3f2813\`](https://github.com/rvagg/changelog-maker/commit/e28b3f2813)] - 1.3.10 (Rod Vagg)
* [[\`ace3af943e\`](https://github.com/rvagg/changelog-maker/commit/ace3af943e)] - Merge pull request #13 from jamsyoung/private-repo-support (Rod Vagg)
* [[\`25ec5428bc\`](https://github.com/rvagg/changelog-maker/commit/25ec5428bc)] - default to repo scope always - revert previous changes (James Young)
* [[\`424d6c22c1\`](https://github.com/rvagg/changelog-maker/commit/424d6c22c1)] - add --private arg to set repo scope, update readme (James Young)
* [[\`7c8c5e6215\`](https://github.com/rvagg/changelog-maker/commit/7c8c5e6215)] - 1.3.9 (Rod Vagg)
`)
  t.end()
})
