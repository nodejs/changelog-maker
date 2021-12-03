import stripAnsi from 'strip-ansi'
import { commitToOutput, formatType } from './commit-to-output.js'
import { groupCommits } from './group-commits.js'
import { toGroups } from './groups.js'
import { formatMarkdown } from './format.js'
import { supportsColor } from 'chalk'
import { collectCommitLabels } from './collect-commit-labels.js'

function getFormat (argv) {
  if (argv.sha) {
    return formatType.SHA
  } else if (argv.plaintext || argv.p) {
    return formatType.PLAINTEXT
  } else if (argv.markdown || argv.md) {
    return formatType.MARKDOWN
  }
  return formatType.SIMPLE
}

async function printCommits (list) {
  for (let commit of list) {
    if (!supportsColor) {
      commit = stripAnsi(commit)
    }
    process.stdout.write(`${commit}\n`)
  }
}

export async function processCommits (argv, ghId, list) {
  const quiet = argv.quiet || argv.q
  const reverse = argv.reverse
  const commitUrl = argv['commit-url'] || 'https://github.com/{ghUser}/{ghRepo}/commit/{ref}'

  await collectCommitLabels(list)

  const format = getFormat(argv)

  if (argv.group || argv.g || format === formatType.PLAINTEXT) {
    list = groupCommits(list)
  }

  if (format === formatType.SHA) {
    list = list.map((commit) => `${commit.sha.substr(0, 10)}`)
  } else if (format === formatType.PLAINTEXT) {
    const formatted = []

    let currentGroup
    for (const commit of list) {
      const commitGroup = toGroups(commit.summary)
      if (currentGroup !== commitGroup) {
        formatted.push(`${commitGroup}:`)
        currentGroup = commitGroup
      }
      formatted.push(commitToOutput(commit, formatType.PLAINTEXT, ghId, commitUrl))
    }
    list = formatted
  } else {
    list = await Promise.all(list.map(async (commit) => {
      let output = commitToOutput(commit, format, ghId, commitUrl)
      if (format === formatType.MARKDOWN) {
        output = stripAnsi(output)
        return (await formatMarkdown(output)).replace(/\n$/, '')
      }
      return output
    }))
  }

  if (format !== formatType.PLAINTEXT && reverse) {
    list = list.reverse()
  }

  if (!quiet) {
    printCommits(list)
  }
}
