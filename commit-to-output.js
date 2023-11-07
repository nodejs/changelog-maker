import chalk from 'chalk'
import { isRevert, cleanSummary as cleanRevertSummary } from './reverts.js'
import { toGroups, cleanSummary as cleanGroupSummary } from './groups.js'

function cleanUnsupportedMarkdown (txt) {
  // escape _~*\[]<>`
  return txt.replace(/([_~*\\[\]<>`])/g, '\\$1')
}

function cleanMarkdown (txt) {
  // Escape backticks for edge case scenarii (no code span support).
  if (txt.includes('``') || txt.includes('\\`')) {
    return cleanUnsupportedMarkdown(txt)
  }

  const backtickSplit = txt.split('`')
  // If there's an odd number of backticks, give up and escape them all.
  if (backtickSplit.length % 2 === 0) return cleanUnsupportedMarkdown(txt)

  let cleanMdString = ''
  for (let i = 0; i < backtickSplit.length; i++) {
    const isInsideBacktickString = i % 2
    cleanMdString += isInsideBacktickString
      // No escaping inside a code span.
      ? `\`${backtickSplit[i]}\``
      // otherwise escape _~*\[]<>
      : backtickSplit[i].replace(/([_~*\\[\]<>])/g, '\\$1')
  }
  return cleanMdString
}

export const formatType = {
  SHA: 'sha',
  PLAINTEXT: 'plaintext',
  MARKDOWN: 'markdown',
  SIMPLE: 'simple',
  MESSAGEONLY: 'messageonly'
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
    ? chalk.green.bold(s)
    : (data.group === 'doc'
        ? chalk.grey(s)
        : s)
}

function toStringMarkdown (data) {
  let s = ''
  s += `* \\[[\`${data.sha.substr(0, 10)}\`](${data.shaUrl})] - `
  s += (data.semver || []).length ? `**(${data.semver.join(', ').toUpperCase()})** ` : ''
  s += data.revert ? '***Revert*** "' : ''
  s += data.group ? `**${cleanMarkdown(data.group)}**: ` : ''
  s += cleanMarkdown(data.summary)
  s += data.revert ? '" ' : ' '
  s += data.author ? `(${cleanMarkdown(data.author)}) ` : ''
  s += data.pr ? `[${data.pr}](${data.prUrl})` : ''
  s = s.trim()

  return (data.semver && data.semver.length)
    ? chalk.green.bold(s)
    : (data.group === 'doc'
        ? chalk.grey(s)
        : s)
}

function toStringMessageOnly (data) {
  let s = ''
  s += data.summary
  return `  * ${s.trim()}`
}

export function commitToOutput (commit, format, ghId, commitUrl) {
  const data = {}
  const prUrlMatch = commit.prUrl && commit.prUrl.match(/^https?:\/\/.+\/([^/]+\/[^/]+)\/\w+\/\d+$/i)
  const urlHash = `#${commit.ghIssue}` || commit.prUrl
  const ref = commit.sha.substr(0, 10)

  data.sha = commit.sha
  data.shaUrl = commitUrl.replace(/\{ghUser\}/g, ghId.user).replace(/\{ghRepo\}/g, ghId.repo).replace(/\{ref\}/g, ref)
  data.semver = commit.labels && commit.labels.filter((l) => l.includes('semver'))
  data.revert = isRevert(commit.summary)
  data.group = toGroups(commit.summary)
  data.summary = cleanGroupSummary(cleanRevertSummary(commit.summary))
  data.author = (commit.author && commit.author.name) || ''
  data.pr = prUrlMatch && ((prUrlMatch[1] !== `${ghId.user}/${ghId.repo}` ? prUrlMatch[1] : '') + urlHash)
  data.prUrl = prUrlMatch && commit.prUrl

  if (format === formatType.SIMPLE) {
    return toStringSimple(data)
  } else if (format === formatType.PLAINTEXT) {
    return toStringPlaintext(data)
  } else if (format === formatType.MESSAGEONLY) {
    return toStringMessageOnly(data)
  }

  return toStringMarkdown(data)
}
