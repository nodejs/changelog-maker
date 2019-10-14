#!/usr/bin/env node

'use strict'

const fs = require('fs')
const path = require('path')
const promisify = require('util').promisify
const pipeline = promisify(require('stream').pipeline)
const split2 = require('split2')
const list = require('list-stream')
const stripAnsi = require('strip-ansi')
const pkgtoId = require('pkg-to-id')
const commitStream = require('commit-stream')
const gitexec = require('gitexec')
const commitToOutput = require('./commit-to-output')
const groupCommits = require('./group-commits')
const collectCommitLabels = promisify(require('./collect-commit-labels')) // TODO
const { isReleaseCommit } = require('./groups')
const pkg = require('./package.json')
const debug = require('debug')(pkg.name)
const argv = require('minimist')(process.argv.slice(2))

const quiet = argv.quiet || argv.q
const simple = argv.simple || argv.s
const help = argv.h || argv.help
const commitUrl = argv['commit-url'] || 'https://github.com/{ghUser}/{ghRepo}/commit/{ref}'
const pkgFile = path.join(process.cwd(), 'package.json')
const pkgData = fs.existsSync(pkgFile) ? require(pkgFile) : {}
const pkgId = pkgtoId(pkgData)

const ghId = {
  user: argv._[0] || pkgId.user || 'nodejs',
  repo: argv._[1] || (pkgId.name && stripScope(pkgId.name)) || 'node'
}
const gitcmd = 'git log --pretty=full --since="{{since}}" --until="{{until}}"'
const commitdatecmd = 'git show -s --format=%cd {{ref}}'
const refCmd = 'git rev-list --max-count=1 {{ref}}'
const allRefCmd = 'git rev-list --max-parents=0 HEAD'
const startRefGuessCmd = [
  'git rev-list --max-count=1 --tags=v*.*.*',
  'git rev-list --max-count=1 --tags=*.*.*',
  'git rev-list --max-count=1 HEAD'
]

debug('using id:', ghId)

if (help) {
  showUsage()
  process.exit(0)
}

function showUsage () {
  let usage = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8')
    .replace(/[\s\S]+(## Usage\n[\s\S]*)\n## [\s\S]+/m, '$1')
  if (process.stdout.isTTY) {
    usage = usage
      .replace(/## Usage\n[\s]*/m, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
  }

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

function printCommits (list) {
  let out = `${list.join('\n')}\n`

  if (!process.stdout.isTTY) {
    out = stripAnsi(out)
  }

  process.stdout.write(out)
}

async function processCommitList (list) {
  list = organiseCommits(list)

  await collectCommitLabels(list)

  if (argv.group) {
    list = groupCommits(list)
  }

  list = list.map((commit) => commitToOutput(commit, simple, ghId, commitUrl))

  if (!quiet) {
    printCommits(list)
  }
}

async function runGit (cmd, isCommitList) {
  const ge = gitexec.exec(process.cwd(), cmd)
  const streams = [ge, split2()]
  if (isCommitList) {
    streams.push(commitStream(ghId.user, ghId.repo))
  }

  // awkward callback construction is required because list.obj() rolls up
  // the stream into an array provided to the callback, but we want to use
  // stream.pipeline() to do a nice error-forwarding & cleanup pipeline
  let err, data
  streams.push(list.obj((_err, _data) => {
    err = _err
    data = _data
  }))

  await pipeline(streams)

  // we land here _after_ the callback to list.obj() so `err` and `data` should be populated
  if (err) {
    throw err
  }

  return data
}

async function guessStartRef () {
  for (const cmd of startRefGuessCmd) {
    debug('guessing startRef with:', cmd)
    const startRef = (await runGit(cmd))[0]
    if (startRef) {
      return startRef
    }
  }

  throw new Error(`Unexpected error finding default start ref, \`${startRefGuessCmd[startRefGuessCmd.length - 1]}\` didn't even work`)
}

async function findStartDate () {
  let cmd
  let startRef

  if (argv.a || argv.all) {
    cmd = allRefCmd
  } else if (argv['start-ref']) {
    cmd = replace(refCmd, { ref: argv['start-ref'] })
  }

  if (cmd) {
    debug('startRef command: %s', cmd)
    startRef = (await runGit(cmd))[0]
  } else {
    startRef = await guessStartRef()
  }

  cmd = replace(commitdatecmd, { ref: startRef })
  debug('converting ref to date:', cmd)
  return (await runGit(cmd))[0]
}

async function findEndDate () {
  if (!argv['end-ref']) {
    debug('using blank endRef')
    return '' // --until=''
  }
  let cmd = replace(refCmd, { ref: argv['end-ref'] })
  debug('endRef command: %s', cmd)
  const endRef = (await runGit(cmd))[0]
  cmd = replace(commitdatecmd, { ref: endRef })
  debug('converting ref to date:', cmd)
  return (await runGit(cmd))[0]
}

async function run () {
  const [startDate, endDate] = await Promise.all([findStartDate(), findEndDate()])

  const cmd = replace(gitcmd, { since: startDate, until: endDate })
  debug('executing:', cmd)
  const commits = await runGit(cmd, true)
  return processCommitList(commits)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
