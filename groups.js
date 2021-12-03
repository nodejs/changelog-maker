import { fileURLToPath } from 'url'
import process from 'process'
import { readFileSync } from 'fs'
import { cleanSummary as cleanRevertsSummary } from './reverts.js'

const groupRe = /^((:?\w|-|,|, )+):\s*/i

export function toGroups (summary) {
  summary = cleanRevertsSummary(summary)
  const m = summary.match(groupRe)
  return (m && m[1]) || ''
}

export function cleanSummary (summary) {
  return (summary || '').replace(groupRe, '')
}

/*
To test this, run on the command line in a nodejs/node clone:

for br in v4.x v5.x v6.x v7.x; do git log $br --format='%s' | grep -E '^\d+.*elease$' >> /tmp/release-commits-all.txt; done
sort /tmp/release-commits-all.txt | uniq > /tmp/release-commits.txt
rm /tmp/release-commits-all.txt

Then in this directory:

node groups.js /tmp/release-commits.txt

It doesn't cover false positives though.
*/

export function isReleaseCommit (summary) {
  return /^Working on v?\d{1,2}\.\d{1,3}\.\d{1,3}$/.test(summary) ||
    /^\d{4}-\d{2}-\d{2},? (Node\.js|Version) v?\d{1,2}\.\d{1,3}\.\d{1,3} (["'][A-Za-z ]+["'] )?\((Current|Stable|LTS|Maintenance)\)/.test(summary) ||
    /^\d{4}-\d{2}-\d{2},? io.js v\d{1,2}\.\d{1,3}\.\d{1,3} Release/.test(summary) ||
    /^\d+\.\d+\.\d+$/.test(summary) // `npm version X` style commit
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Running tests on lines in ${process.argv[2]}...`)
  const failures = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).filter((summary) => {
    return !isReleaseCommit(summary)
  })
  if (!failures.length) {
    console.log('All good, no failures!')
  } else {
    console.log('Failed on the following commit summaries:')
    console.log(failures.join('\n'))
  }
}
