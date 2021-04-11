'use strict'

const chalk = require('chalk')
const reverts = require('./reverts')
const groups = require('./groups')

function cleanMarkdown (txt) {
  // escape _~*\[]<>
  return txt.replace(/([_~*\\[\]<>])/g, '\\$1')
}

const formatType = {
  PLAINTEXT: 'plaintext',
  MARKDOWN: 'markdown',
  SIMPLE: 'simple'
}

function toStringPlaintext (data) {
  let s = ''
  s += (data.semver || []).length ? `(${data.semver.join(', ').toUpperCase()}) ` : ''

  if (data.revert) {
    s += `Revert "${data.group}: ${data.summary} `
  } else {
    s += `${data.summary} `
  }

  s += data.author ? `(${data.author}) ` : ''
  s += data.pr ? data.prUrl : ''

  return `  * ${s.trim()}`
}

function toStringSimple (data) {
  let s = ''
  s += `* [${data.sha.substr(0, 10)}] - `
  s += (data.semver || []).length ? `(${data.semver.join(', ').toUpperCase()}) ` : ''
  s += data.revert ? 'Revert "' : ''
  s += data.group ? `${data.group}: ` : ''
  s += data.summary
  s += data.revert ? '" ' : ' '
  s += data.author ? `(${data.author}) ` : ''
  s += data.pr ? data.prUrl : ''
  s = s.trim()

  return (data.semver && data.semver.length)
    ? chalk.green(chalk.bold(s))
    : (data.group === 'doc'
        ? chalk.grey(s)
        : s)
}

function toStringMarkdown (data) {
  let s = ''
  s += `* [[\`${data.sha.substr(0, 10)}\`](${data.shaUrl})] - `
  s += (data.semver || []).length ? `**(${data.semver.join(', ').toUpperCase()})** ` : ''
  s += data.revert ? '***Revert*** "' : ''
  s += data.group ? `**${data.group}**: ` : ''
  s += cleanMarkdown(data.summary)
  s += data.revert ? '" ' : ' '
  s += data.author ? `(${data.author}) ` : ''
  s += data.pr ? `[${data.pr}](${data.prUrl})` : ''
  s = s.trim()

  return (data.semver && data.semver.length)
    ? chalk.green(chalk.bold(s))
    : (data.group === 'doc'
        ? chalk.grey(s)
        : s)
}

function commitToOutput (commit, format, ghId, commitUrl) {
  const data = {}
  const prUrlMatch = commit.prUrl && commit.prUrl.match(/^https?:\/\/.+\/([^/]+\/[^/]+)\/\w+\/\d+$/i)
  const urlHash = `#${commit.ghIssue}` || commit.prUrl
  const ref = commit.sha.substr(0, 10)

  data.sha = commit.sha
  data.shaUrl = commitUrl.replace(/\{ghUser\}/g, ghId.user).replace(/\{ghRepo\}/g, ghId.repo).replace(/\{ref\}/g, ref)
  data.semver = commit.labels && commit.labels.filter((l) => l.includes('semver'))
  data.revert = reverts.isRevert(commit.summary)
  data.group = groups.toGroups(commit.summary)
  data.summary = groups.cleanSummary(reverts.cleanSummary(commit.summary))
  data.author = (commit.author && commit.author.name) || ''
  data.pr = prUrlMatch && ((prUrlMatch[1] !== `${ghId.user}/${ghId.repo}` ? prUrlMatch[1] : '') + urlHash)
  data.prUrl = prUrlMatch && commit.prUrl

  if (format === formatType.SIMPLE) {
    return toStringSimple(data)
  } else if (format === formatType.PLAINTEXT) {
    return toStringPlaintext(data)
  }

  return toStringMarkdown(data)
}

module.exports = {
  commitToOutput,
  formatType
}
