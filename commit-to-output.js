const chalk = require('chalk')
const reverts = require('./reverts')
const groups = require('./groups')

function cleanMarkdown (txt) {
  // escape _~*\[]<>
  return txt.replace(/([_~*\\[\]<>])/g, '\\$1')
}

function toStringSimple (data) {
  let s = ''
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
    : data.group === 'doc'
      ? chalk.grey(s)
      : s
}

function toStringMarkdown (data) {
  let s = ''
  s += '* [[`' + data.sha.substr(0, 10) + '`](' + data.shaUrl + ')] - '
  s += (data.semver || []).length ? '**(' + data.semver.join(', ').toUpperCase() + ')** ' : ''
  s += data.revert ? '***Revert*** "' : ''
  s += data.group ? '**' + data.group + '**: ' : ''
  s += cleanMarkdown(data.summary)
  s += data.revert ? '" ' : ' '
  s += data.author ? '(' + data.author + ') ' : ''
  s += data.pr ? '[' + data.pr + '](' + data.prUrl + ')' : ''

  return (data.semver && data.semver.length)
    ? chalk.green(chalk.bold(s))
    : data.group === 'doc'
      ? chalk.grey(s)
      : s
}

function commitToOutput (commit, simple, ghId, commitUrl) {
  let data = {}
  let prUrlMatch = commit.prUrl && commit.prUrl.match(/^https?:\/\/.+\/([^/]+\/[^/]+)\/\w+\/\d+$/i)
  let urlHash = '#' + commit.ghIssue || commit.prUrl
  let ghUrl = ghId.user + '/' + ghId.name
  let ref = commit.sha.substr(0, 10)

  data.sha = commit.sha
  data.shaUrl = commitUrl ? commitUrl.replace('{ref}', ref) : 'https://github.com/' + ghUrl + '/commit/' + ref
  data.semver = commit.labels && commit.labels.filter((l) => l.indexOf('semver') > -1)
  data.revert = reverts.isRevert(commit.summary)
  data.group = groups.toGroups(commit.summary)
  data.summary = groups.cleanSummary(reverts.cleanSummary(commit.summary))
  data.author = (commit.author && commit.author.name) || ''
  data.pr = prUrlMatch && ((prUrlMatch[1] !== ghUrl ? prUrlMatch[1] : '') + urlHash)
  data.prUrl = prUrlMatch && commit.prUrl

  return (simple ? toStringSimple : toStringMarkdown)(data)
}

module.exports = commitToOutput
