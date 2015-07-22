#!/usr/bin/env node

const spawn    = require('child_process').spawn
    , bl       = require('bl')
    , split2   = require('split2')
    , list     = require('list-stream')
    , after    = require('after')
    , fs       = require('fs')
    , path     = require('path')
    , ghauth   = require('ghauth')
    , ghissues = require('ghissues')
    , chalk    = require('chalk')
    , pkgtoId  = require('pkg-to-id')
    , commitStream = require('./commit-stream')

    , argv     = require('minimist')(process.argv.slice(2))

    , quiet    = argv.quiet || argv.q || false

    , pkg      = require('./package.json')
    , debug    = require('debug')(pkg.name)

    , needHelp = argv.h || argv.help

    , cwd      = process.cwd()
    , pkgFile  = path.join(cwd, 'package.json')
    , pkgData  = fs.existsSync(pkgFile) ? require(pkgFile) : {}
    , pkgId    = pkgtoId(pkgData)

    , ghId     = {
          user: argv._[0] || pkgId.user || 'nodejs'
        , name: argv._[1] || pkgId.name || 'io.js'
      }
    , authOptions   = {
          configName : 'changelog-maker'
        , scopes     : ['repo']
      }

if (needHelp) {
  showUsage(process.stdout.isTTY)
  process.exit(0)
}

const gitcmd        = 'git log --pretty=full --since="{{sincecmd}}" --until="{{untilcmd}}"'
    , commitdatecmd = '$(git show -s --format=%cd `{{refcmd}}`)'
    , untilcmd      = ''
    , refcmd        = argv.a || argv.all ? 'git rev-list --max-parents=0 HEAD' : 'git rev-list --max-count=1 {{ref}}'
    , defaultRef    = '--tags=v*.*.* 2> /dev/null ' +
        '|| git rev-list --max-count=1 --tags=*.*.* 2> /dev/null ' +
        '|| git rev-list --max-count=1 HEAD'

debug(ghId)

function replace (s, m) {
  Object.keys(m).forEach(function (k) {
    s = s.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), m[k])
  })
  return s
}

function showUsage(removeMd){
  var usage = fs.readFileSync("README.md", "utf8")
    .replace(/[\s\S]+(## Usage\n[\s\S]*)\n## [\s\S]+/m, "$1")
  if (removeMd)
    usage = usage
      .replace(/## Usage\n[\s]*/m, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
  process.stdout.write(usage)
}

function organiseCommits (list) {
  if (argv['start-ref'])
    return list
  else if (argv.a || argv.all)
    return list

  // filter commits to those _before_ 'working on ...'
  var started = false
  return list.filter(function (commit) {
    if (started)
      return false

    if ((/working on v?[\d\.]+/i).test(commit.summary))
      started = true
    else if ((/^v?[\d\.]+$/).test(commit.summary))
      started = true

    return !started
  })
}


function commitTags (list, callback) {
  var sublist = list.filter(function (commit) {
    return typeof commit.ghIssue == 'number' && commit.ghUser && commit.ghProject
  })

  if (!sublist.length)
    return setImmediate(callback)

  ghauth(authOptions, function (err, authData) {
    if (err)
      return callback(err)

    var done = after(sublist.length, callback)

    sublist.forEach(function (commit) {
      function onFetch (err, issue) {
        if (err) {
          console.error('Error fetching issue #%s: %s', commit.ghIssue, err.message );
          return done()
        }

        if (issue.labels)
          commit.labels = issue.labels.map(function (label) { return label.name })
        done()
      }

      if (commit.ghUser == 'iojs')
        commit.ghUser = 'nodejs' // forcably rewrite as the GH API doesn't do it for us

      ghissues.get(authData, commit.ghUser, commit.ghProject, commit.ghIssue, onFetch)
    })
  })
}


var revertRe = /^revert\s+"?/i
  , groupRe  = /^((:?\w|\-|,|, )+):\s*/i

function commitToGroup (commit) {
  var summary = (commit.summary || '').replace(revertRe, '')
    , m       = summary.match(groupRe)

  return m && m[1]
}

function cleanMarkdown (txt) {
  // just escape '[' & ']'
  return txt.replace(/([\[\]])/g, '\\$1')
}

function toStringSimple (data) {
  var s = ''
  s += '* [' + data.sha.substr(0, 10) + '] - '
  s += (data.semver || []).length ? '(' + data.semver.join(', ').toUpperCase() + ') ' : ''
  s += data.revert ? 'Revert "' : ''
  s += data.group ? data.group + ': ' : ''
  s += data.summary
  s += data.revert ? '"' : '' + ' '
  s += data.author ? '(' + data.author + ') ' : ''
  s += data.pr ?  data.pr  : ''

  return data.semver.length
      ? chalk.green(chalk.bold(s))
      : data.group == 'doc'
        ? chalk.grey(s)
	: s
}


function toStringMarkdown (data) {
  var s = ''
  s += '* [[`' + data.sha.substr(0, 10) + '`](' + data.shaUrl + ')] - '
  s += (data.semver || []).length ? '**(' + data.semver.join(', ').toUpperCase() + ')** ' : ''
  s += data.revert ? '***Revert*** "' : ''
  s += data.group ? '**' + data.group + '**: ' : ''
  s += cleanMarkdown(data.summary)
  s += data.revert ? '"' : '' + ' '
  s += data.author ? '(' + data.author + ') ' : ''
  s += data.pr ? '[' + data.pr + '](' + data.prUrl + ')' : ''

  return data.semver.length
      ? chalk.green(chalk.bold(s))
      : data.group == 'doc'
        ? chalk.grey(s)
	: s
}


function commitToOutput (commit) {
  var data        = {}
    , prUrlMatch  = commit.prUrl && commit.prUrl.match(/^https?:\/\/.+\/([^\/]+\/[^\/]+)\/\w+\/\d+$/i)
    , urlHash     = '#'+commit.ghIssue || commit.prUrl
    , ghUrl       = ghId.user + '/' + ghId.name

  data.sha     = commit.sha
  data.shaUrl  = 'https://github.com/' + ghUrl + '/commit/' + commit.sha.substr(0,10)
  data.semver  = commit.labels && commit.labels.filter(function (l) { return l.indexOf('semver') > -1 }) || false
  data.revert  = revertRe.test(commit.summary)
  data.group   = commitToGroup(commit) || ''
  data.summary = (commit.summary && commit.summary.replace(revertRe, '').replace(/"$/, '').replace(groupRe, '')) || ''
  data.author  = (commit.author && commit.author.name) || ''
  data.pr      = prUrlMatch && ((prUrlMatch[1] != ghUrl ? prUrlMatch[1] : '') + urlHash)
  data.prUrl   = prUrlMatch && commit.prUrl

  return (argv.simple ? toStringSimple : toStringMarkdown)(data)
}


function groupCommits (list) {
  var groups = list.reduce(function (groups, commit) {
    var group = commitToGroup(commit) || '*'
    if (!groups[group])
      groups[group] = []
    groups[group].push(commit)
    return groups
  }, {})

  return Object.keys(groups).sort().reduce(function (p, group) {
    return p.concat(groups[group])
  }, [])
}


function printCommits (list) {
  var out = list.join('\n') + '\n'

  if (!process.stdout.isTTY)
    out = chalk.stripColor(out)

  process.stdout.write(out)
}


function onCommitList (err, list) {
  if (err)
    throw err

  list = organiseCommits(list)

  commitTags(list, function (err) {
    if (err)
      throw err

    if (argv.group)
      list = groupCommits(list)

    list = list.map(commitToOutput)

    if( !quiet )
      printCommits(list)
  })
}


var _startrefcmd = replace(refcmd, { ref: argv['start-ref'] || defaultRef })
  , _endrefcmd   = argv['end-ref'] && replace(refcmd, { ref: argv['end-ref'] })
  , _sincecmd    = replace(commitdatecmd, { refcmd: _startrefcmd })
  , _untilcmd    = argv['end-ref'] ? replace(commitdatecmd, { refcmd: _endrefcmd }) : untilcmd
  , _gitcmd      = replace(gitcmd, { sincecmd: _sincecmd, untilcmd: _untilcmd })
  , child        = spawn('bash', [ '-c', _gitcmd ])

debug('%s', _startrefcmd)
debug('%s', _endrefcmd)
debug('%s', _sincecmd)
debug('%s', _untilcmd)
debug('%s', _gitcmd)

child.stdout.pipe(split2()).pipe(commitStream(ghId.user, ghId.name)).pipe(list.obj(onCommitList))

child.stderr.pipe(bl(function (err, _data) {
  if (err)
    throw err

  if (_data.length)
    process.stderr.write(_data)
}))

child.on('close', function (code) {
  if (code)
    throw new Error('git command [' + gitcmd + '] exited with code ' + code)
})
