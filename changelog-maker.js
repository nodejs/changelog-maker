#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import process from 'process'
import { pipeline as _pipeline } from 'stream'
import { promisify } from 'util'
import split2 from 'split2'
import pkgtoId from 'pkg-to-id'
import commitStream from 'commit-stream'
import gitexec from 'gitexec'
import _debug from 'debug'
import minimist from 'minimist'
import { processCommits } from './process-commits.js'
import { isReleaseCommit } from './groups.js'

const pipeline = promisify(_pipeline)
const debug = _debug('changelog-maker')
const argv = minimist(process.argv.slice(2))
const help = argv.h || argv.help
const pkgFile = join(process.cwd(), 'package.json')
const pkgData = existsSync(pkgFile) ? JSON.parse(readFileSync(pkgFile)) : {}
const pkgId = pkgtoId(pkgData)

const ghId = {
  user: argv._[0] || pkgId.user || 'nodejs',
  repo: argv._[1] || (pkgId.name && stripScope(pkgId.name)) || 'node'
}

const gitcmd = 'git log --pretty=full --since="{{sincecmd}}" --until="{{untilcmd}}"'
const commitdatecmd = '$(git show -s --format=%cd `{{refcmd}}`)'
const untilcmd = ''
const refcmd = argv.a || argv.all ? 'git rev-list --max-parents=0 HEAD' : 'git rev-list --max-count=1 {{ref}}'
const defaultRef = '--tags=v*.*.* 2> /dev/null ' +
        '|| git rev-list --max-count=1 --tags=*.*.* 2> /dev/null ' +
        '|| git rev-list --max-count=1 HEAD'

debug(ghId)

if (help) {
  showUsage()
  process.exit(0)
}

function showUsage () {
  const usage = readFileSync(new URL('README.md', import.meta.url), 'utf8')
    .replace(/[\s\S]+(## Usage\n[\s\S]*)\n## [\s\S]+/m, '$1')
    .replace(/## Usage\n[\s]*/m, 'Usage: ')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')

  process.stdout.write(usage)
}

function stripScope (name) {
  return name[0] === '@' && name.indexOf('/') > 0 ? name.split('/')[1] : name
}

function replace (s, m) {
  Object.keys(m).forEach((k) => {
    s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), m[k])
  })
  return s
}

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

function organiseCommits (list) {
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

async function run () {
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
  commitList = organiseCommits(commitList)
  await processCommits(argv, ghId, commitList)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
