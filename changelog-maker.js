#!/usr/bin/env node

const gitcmd = 'git log --pretty=full --since="$(git show -s --format=%ad `git rev-list --tags --max-count=1`)"'


const spawn    = require('child_process').spawn
    , bl       = require('bl')
    , split2   = require('split2')
    , list     = require('list-stream')
    , after    = require('after')
    , ghauth   = require('ghauth')
    , ghissues = require('ghissues')
    , chalk    = require('chalk')

    , commitStream = require('./commit-stream')

    , ghUser        = process.argv[2] || 'iojs'
    , ghProject     = process.argv[3] || 'io.js'
    , authOptions   = {
          configName : `changelog-maker`
        , scopes     : []
      }


function organiseCommits (list) {
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
  }).reverse()
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
          console.error(`Error fetching issue #${commit.ghIssue}: ${err.message}`)
          return done()
        }

        if (issue.labels)
          commit.labels = issue.labels.map(function (label) { return label.name })
        done()
      }

      ghissues.get(authData, commit.ghUser, commit.ghProject, commit.ghIssue, onFetch)
    })
  })
}


function commitToOutput (commit) {
  var semver     = commit.labels && commit.labels.filter(function (l) { return l.indexOf('semver') > -1 }) || false
    , mod        = (/^\w+:/.test(commit.summary) && commit.summary.split(':')[0]) || ''
    , summaryOut = !mod ? commit.summary : commit.summary.substr(mod.length + 2)
    , shaOut     = `[\`${commit.sha.substr(0,10)}\`](https://github.com/${ghUser}/${ghProject}/commit/${commit.sha.substr(0,10)})`
    , labelOut   = (semver.length ? '(' + semver.join(', ').toUpperCase() + ') ' : '') + mod
    , prUrlMatch = commit.prUrl && commit.prUrl.match(/^https?:\/\/.+\/([^\/]+\/[^\/]+)\/\w+\/\d+$/i)
    , out

  if (labelOut.length)
    summaryOut = `**${labelOut}**: ${summaryOut}`
  out = `* [${shaOut}] - ${summaryOut} (${commit.author.name})`

  if (prUrlMatch)
    out += ` [${prUrlMatch[1] != ghUser + '/' + ghProject ? prUrlMatch[1] : ''}#${commit.ghIssue || commit.prUrl}](${commit.prUrl})`

  return semver.length
      ? chalk.green(chalk.bold(out))
      : mod == 'doc' ? chalk.grey(out) : out
}


function printCommits (list) {
  var out = `${list.join('\n')} \n`

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

    list = list.map(commitToOutput)

    printCommits(list)
  })
}


var cmd = spawn('bash', [ '-c', gitcmd ])

cmd.stdout.pipe(split2()).pipe(commitStream(ghUser, ghProject)).pipe(list.obj(onCommitList))

cmd.stderr.pipe(bl(function (err, _data) {
  if (err)
    throw err

  if (_data.length)
    process.stderr.write(_data)
}))

cmd.on('close', function (code) {
  if (code)
    throw new Error(`git command [${gitcmd}] exited with code ${code}`)
})
