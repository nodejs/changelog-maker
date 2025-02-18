import _debug from 'debug'
import process from 'process'
import { pipeline as _pipeline } from 'stream'
import { promisify } from 'util'
import commitStream from 'commit-stream'
import gitexec from 'gitexec'
import split2 from 'split2'
import { isReleaseCommit } from './groups.js'

const debug = _debug('changelog-maker')

const pipeline = promisify(_pipeline)
const gitcmd = 'git log --pretty=full --since="{{sincecmd}}" --until="{{untilcmd}}"'
const commitdatecmd = '$(git show -s --format=%cd `{{refcmd}}`)'
const untilcmd = ''
const defaultRef = '--tags=v*.*.* 2> /dev/null ' +
        '|| git rev-list --max-count=1 --tags=*.*.* 2> /dev/null ' +
        '|| git rev-list --max-count=1 HEAD'

function replace (s, m) {
  Object.keys(m).forEach((k) => {
    s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), m[k])
  })
  return s
}

function organiseCommits (argv, list) {
  if (argv['start-ref'] || argv.a || argv.all) {
    if (argv['filter-release']) {
      list = list.filter((commit) => !isReleaseCommit(commit.summary))
    }

    return list
  }

  // filter commits to those _before_ 'working on ...'
  let started = false
  return list.filter((commit) => {
    if (started) {
      return false
    }

    if (isReleaseCommit(commit.summary)) {
      started = true
    }

    return !started
  })
}

export async function commitToList (ghId, argv) {
  const refcmd = argv.a || argv.all ? 'git rev-list --max-parents=0 HEAD' : 'git rev-list --max-count=1 {{ref}}'
  const _startrefcmd = replace(refcmd, { ref: argv['start-ref'] || defaultRef })
  const _endrefcmd = argv['end-ref'] && replace(refcmd, { ref: argv['end-ref'] })
  const _sincecmd = replace(commitdatecmd, { refcmd: _startrefcmd })
  const _untilcmd = argv['end-ref'] ? replace(commitdatecmd, { refcmd: _endrefcmd }) : untilcmd
  const _gitcmd = replace(gitcmd, { sincecmd: _sincecmd, untilcmd: _untilcmd })
  debug('%s', _startrefcmd)
  debug('%s', _endrefcmd)
  debug('%s', _sincecmd)
  debug('%s', _untilcmd)
  debug('%s', _gitcmd)

  let commitList = []
  await pipeline(
    gitexec.exec(process.cwd(), _gitcmd),
    split2(),
    commitStream(ghId.user, ghId.repo),
    async function * (source) {
      for await (const commit of source) {
        commitList.push(commit)
      }
    })
  commitList = organiseCommits(argv, commitList)
  return commitList
}
