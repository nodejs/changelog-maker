#!/usr/bin/env node

const spawn          = require('child_process').spawn
    , bl             = require('bl')
    , split2         = require('split2')
    , list           = require('list-stream')
    , after          = require('after')
    , fs             = require('fs')
    , path           = require('path')
    , ghauth         = require('ghauth')
    , ghissues       = require('ghissues')
    , chalk          = require('chalk')
    , pkgtoId        = require('pkg-to-id')
    , commitStream   = require('commit-stream')
    , commitToOutput = require('./commit-to-output')
    , toGroups       = require('./groups').toGroups

    , argv           = require('minimist')(process.argv.slice(2))

    , quiet          = argv.quiet || argv.q
    , simple         = argv.simple || argv.s

    , pkg            = require('./package.json')
    , debug          = require('debug')(pkg.name)

    , pkgFile        = path.join(process.cwd(), 'package.json')
    , pkgData        = fs.existsSync(pkgFile) ? require(pkgFile) : {}
    , pkgId          = pkgtoId(pkgData)

    , ghId           = {
          user: argv._[0] || pkgId.user || 'nodejs'
        , name: argv._[1] || pkgId.name || 'node'
      }
    , authOptions    = {
          configName : 'changelog-maker'
        , scopes     : ['repo']
      }

const gitcmd         = 'git log --pretty=full --since="{{sincecmd}}" --until="{{untilcmd}}"'
    , commitdatecmd  = '$(git show -s --format=%cd `{{refcmd}}`)'
    , untilcmd       = ''
    , refcmd         = argv.a || argv.all ? 'git rev-list --max-parents=0 HEAD' : 'git rev-list --max-count=1 {{ref}}'
    , defaultRef     = '--tags=v*.*.* 2> /dev/null ' +
        '|| git rev-list --max-count=1 --tags=*.*.* 2> /dev/null ' +
        '|| git rev-list --max-count=1 HEAD'

debug(ghId)

function replace (s, m) {
  Object.keys(m).forEach(function (k) {
    s = s.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), m[k])
  })
  return s
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


function groupCommits (list) {
  var groupList = list.reduce(function (groupList, commit) {
    var group = toGroups(commit.summary) || '*'
    if (!groupList[group])
      groupList[group] = []
    groupList[group].push(commit)
    return groupList
  }, {})

  return Object.keys(groupList).sort().reduce(function (p, group) {
    return p.concat(groupList[group])
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

    list = list.map(function (commit) {
      return commitToOutput(commit, simple, ghId)
    })

    if (!quiet)
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
