#!/usr/bin/env node

const gitcmd        = 'git log --pretty=full --since="{{sincecmd}}" --until="{{untilcmd}}"'
    , commitdatecmd = '$(git show -s --format=%cd `{{refcmd}}`)'
    , untilcmd      = ''
    , refcmd        = 'git rev-list --max-count=1 {{ref}}'
    , defaultRef    = '--tags=v*.*.*'


const spawn    = require('child_process').spawn
    , bl       = require('bl')
    , split2   = require('split2')
    , list     = require('list-stream')
    , after    = require('after')
    , ghauth   = require('ghauth')
    , ghissues = require('ghissues')
    , chalk    = require('chalk')
    , pkgtoId  = require('pkg-to-id')
    , commitStream = require('./commit-stream')
    , argv     = require('minimist')(process.argv.slice(2))

    , cwd      = process.cwd()
    , pkgFile  = path.join(cwd, 'package.json')
    , pkg      = fs.existsSync(pkgFile) ? require(pkgFile):{}
    , pkgId    = pkgtoId(pkg)
    , argsId   = {
        user: argv._[0] || 'nodejs',
        project: argv._[1] || 'io.js'
    }

    , ghId          = pkgId || argsId
    , authOptions   = {
          configName : 'changelog-maker'
        , scopes     : []
      }

function replace (s, m) {
  Object.keys(m).forEach(function (k) {
    s = s.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), m[k])
  })
  return s
}


function organiseCommits (list) {
  if (argv['start-ref'])
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
  var s = '';
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
  var s = '';
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


function commitToOutput (commit) {
  var data       = {}
    , prUrlMatch = commit.prUrl && commit.prUrl.match(/^https?:\/\/.+\/([^\/]+\/[^\/]+)\/\w+\/\d+$/i)
    , urlHash = '#'+commit.ghIssue || commit.prUrl
    , ghUrl = ghId.user + '/' + ghId.name

  data.sha     = commit.sha
  data.shaUrl  = 'https://github.com/' + ghId.user + '/' + ghId.name + '/commit/' + commit.sha.substr(0,10)
  data.semver  = commit.labels && commit.labels.filter(function (l) { return l.indexOf('semver') > -1 }) || false
  data.revert  = revertRe.test(commit.summary)
  data.group   = commitToGroup(commit) || ''
  data.summary = commit.summary && commit.summary.replace(revertRe, '').replace(/"$/, '').replace(groupRe, '')
  data.author  = (commit.author && commit.author.name) || ''
  data.pr      = prUrlMatch && ((prUrlMatch[1] != ghUrl ? prUrlMatch[1] : '')+urlHash)
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

    printCommits(list)
  })
}


var _startrefcmd = replace(refcmd, { ref: argv['start-ref'] || defaultRef })
  , _endrefcmd   = argv['end-ref'] && replace(refcmd, { ref: argv['end-ref'] })
  , _sincecmd    = replace(commitdatecmd, { refcmd: _startrefcmd })
  , _untilcmd    = argv['end-ref'] ? replace(commitdatecmd, { refcmd: _endrefcmd }) : untilcmd
  , _gitcmd      = replace(gitcmd, { sincecmd: _sincecmd, untilcmd: _untilcmd })
  , child        = spawn('bash', [ '-c', _gitcmd ])

child.stdout.pipe(split2()).pipe(commitStream(ghId.user, ghId.name)).pipe(list.obj(onCommitList))

child.stderr.pipe(bl(function (err, _data) {
  if (err)
    throw err

  if (_data.length)
    process.stderr.write(_data)
}))

child.on('close', function (code) {
  if (code)
    throw new Error('git command [' + gitcmd + '] exited with code ' + code);
})
