const chalk   = require('chalk')
    , reverts = require('./reverts')
    , groups  = require('./groups')


function cleanMarkdown (txt) {
  // escape _~*\[]<>
  return txt.replace(/([_~*\\\[\]<>])/g, '\\$1')
}


function toStringSimple (data) {
  var s = ''
  s += '* [' + data.sha.substr(0, 10) + '] - '
  s += (data.semver || []).length ? '(' + data.semver.join(', ').toUpperCase() + ') ' : ''
  s += data.revert ? 'Revert "' : ''
  s += data.group ? data.group + ': ' : ''
  s += data.summary
  s += data.revert ? '" ' : ' '
  s += data.author ? '(' + data.author + ') ' : ''
  s += data.pr ? data.prUrl : ''

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
  s += data.revert ? '" ' : ' '
  s += data.author ? '(' + data.author + ') ' : ''
  s += data.pr ? '[' + data.pr + '](' + data.prUrl + ')' : ''

  return data.semver.length
      ? chalk.green(chalk.bold(s))
      : data.group == 'doc'
        ? chalk.grey(s)
        : s
}


function commitToOutput (commit, simple, ghId) {
  var data        = {}
    , prUrlMatch  = commit.prUrl && commit.prUrl.match(/^https?:\/\/.+\/([^\/]+\/[^\/]+)\/\w+\/\d+$/i)
    , urlHash     = '#'+commit.ghIssue || commit.prUrl
    , ghUrl       = ghId.user + '/' + ghId.name

  data.sha     = commit.sha
  data.shaUrl  = 'https://github.com/' + ghUrl + '/commit/' + commit.sha.substr(0,10)
  data.semver  = commit.labels && commit.labels.filter(function (l) { return l.indexOf('semver') > -1 }) || false
  data.revert  = reverts.isRevert(commit.summary)
  data.group   = groups.toGroups(commit.summary)
  data.summary = groups.cleanSummary(reverts.cleanSummary(commit.summary))
  data.author  = (commit.author && commit.author.name) || ''
  data.pr      = prUrlMatch && ((prUrlMatch[1] != ghUrl ? prUrlMatch[1] : '') + urlHash)
  data.prUrl   = prUrlMatch && commit.prUrl

  return (simple ? toStringSimple : toStringMarkdown)(data)
}


module.exports = commitToOutput
