#!/usr/bin/env node

import _debug from 'debug'
import process from 'process'
import minimist from 'minimist'
import pkgtoId from 'pkg-to-id'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { processCommits } from './process-commits.js'
import { commitToList } from './commit-to-list.js'

const debug = _debug('changelog-maker')

const argv = minimist(process.argv.slice(2))
const help = argv.h || argv.help

const pkgFile = join(process.cwd(), 'package.json')
const pkgData = existsSync(pkgFile) ? JSON.parse(readFileSync(pkgFile)) : {}
const pkgId = pkgtoId(pkgData)

const ghId = {
  user: argv._[0] || pkgId.user || 'nodejs',
  repo: argv._[1] || (pkgId.name && stripScope(pkgId.name)) || 'node'
}
debug(ghId)

if (help) {
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
  const commitList = await commitToList(ghId, argv)
  await processCommits(argv, ghId, commitList)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
