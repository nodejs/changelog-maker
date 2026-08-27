#!/usr/bin/env node

import _debug from 'debug'
import process from 'process'
import pkgtoId from 'pkg-to-id'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { parseArgs } from 'util'
import { processCommits } from './process-commits.js'
import { commitToList } from './commit-to-list.js'

const debug = _debug('changelog-maker')

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    all: { type: 'boolean', short: 'a' },
    'commit-url': { type: 'string' },
    'end-ref': { type: 'string' },
    'filter-release': { type: 'boolean' },
    'sequence-drop': { type: 'string' },
    'find-matching-prs': { type: 'boolean' },
    format: { type: 'string' },
    group: { type: 'boolean', short: 'g' },
    help: { type: 'boolean', short: 'h' },
    quiet: { type: 'boolean', short: 'q' },
    reverse: { type: 'boolean' },
    'start-ref': { type: 'string' }
  }
})

const pkgFile = join(process.cwd(), 'package.json')
const pkgData = existsSync(pkgFile) ? JSON.parse(readFileSync(pkgFile)) : {}
const pkgId = pkgtoId(pkgData)

const ghId = {
  user: positionals[0] || pkgId.user || 'nodejs',
  repo: positionals[1] || (pkgId.name && stripScope(pkgId.name)) || 'node'
}
debug(ghId)

if (values.help) {
  showUsage()
  process.exit(0)
}

function stripScope (name) {
  return name[0] === '@' && name.indexOf('/') > 0 ? name.split('/')[1] : name
}

function showUsage () {
  const usage = readFileSync(new URL('README.md', import.meta.url), 'utf8')
    .replace(/[\s\S]+(## Usage\n[\s\S]*)\n## [\s\S]+/m, '$1')
    .replace(/## Usage\n[\s]*/m, 'Usage: ')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')

  process.stdout.write(usage)
}

async function run () {
  const commitList = await commitToList(ghId, values)
  await processCommits(values, ghId, commitList)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
