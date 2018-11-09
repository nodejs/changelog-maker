#!/usr/bin/env node

const split2 = require('split2')
const list = require('list-stream')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const pkgtoId = require('pkg-to-id')
const commitStream = require('commit-stream')
const gitexec = require('gitexec')
const commitToOutput = require('./commit-to-output')
const groupCommits = require('./group-commits')
const collectCommitLabels = require('./collect-commit-labels')
const isReleaseCommit = require('./groups').isReleaseCommit
const pkg = require('./package.json')
const debug = require('debug')(pkg.name)
const argv = require('minimist')(process.argv.slice(2))

const quiet = argv.quiet || argv.q
const simple = argv.simple || argv.s
const help = argv.h || argv.help
const commitUrl = argv['commit-url']
const pkgFile = path.join(process.cwd(), 'package.json')
const pkgData = fs.existsSync(pkgFile) ? require(pkgFile) : {}
const pkgId = pkgtoId(pkgData)

const ghId = {
  user: argv._[0] || pkgId.user || 'nodejs',
  name: argv._[1] || (pkgId.name && stripScope(pkgId.name)) || 'node'
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
  var usage = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8')
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
  Object.keys(m).forEach(function (k) {
    s = s.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), m[k])
  })
  return s
}

function organiseCommits (list) {
  if (argv['start-ref'] || argv.a || argv.all) {
    if (argv['filter-release']) {
      list = list.filter(function (commit) { return !isReleaseCommit(commit.summary) })
    }
    return list
  }

  // filter commits to those _before_ 'working on ...'
  var started = false
  return list.filter(function (commit) {
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
  var out = list.join('\n') + '\n'

  if (!process.stdout.isTTY) {
    out = chalk.stripColor(out)
  }

  process.stdout.write(out)
}

function onCommitList (err, list) {
  if (err) {
    throw err
  }

  list = organiseCommits(list)

  collectCommitLabels(list, function (err) {
    if (err) {
      throw err
    }

    if (argv.group) {
      list = groupCommits(list)
    }

    list = list.map(function (commit) {
      return commitToOutput(commit, simple, ghId, commitUrl)
    })

    if (!quiet) {
      printCommits(list)
    }
  })
}

let _startrefcmd = replace(refcmd, { ref: argv['start-ref'] || defaultRef })
let _endrefcmd = argv['end-ref'] && replace(refcmd, { ref: argv['end-ref'] })
let _sincecmd = replace(commitdatecmd, { refcmd: _startrefcmd })
let _untilcmd = argv['end-ref'] ? replace(commitdatecmd, { refcmd: _endrefcmd }) : untilcmd
let _gitcmd = replace(gitcmd, { sincecmd: _sincecmd, untilcmd: _untilcmd })

debug('%s', _startrefcmd)
debug('%s', _endrefcmd)
debug('%s', _sincecmd)
debug('%s', _untilcmd)
debug('%s', _gitcmd)

gitexec.exec(process.cwd(), _gitcmd)
  .pipe(split2())
  .pipe(commitStream(ghId.user, ghId.name))
  .pipe(list.obj(onCommitList))
