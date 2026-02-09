'use strict'

import { auth } from './auth.js'
import { get as ghget } from 'ghissues'
import async from 'async'

export async function collectCommitLabels (list) {
  const sublist = list.filter((commit) => {
    return typeof commit.ghIssue === 'number' && commit.ghUser && commit.ghProject
  })

  if (!sublist.length) {
    return
  }

  const authData = await auth()

  const cache = {}

  const q = async.queue((commit, next) => {
    function onFetch (err, issue) {
      if (err) {
        console.error('Error fetching issue #%s: %s', commit.ghIssue, err.message)
        return next()
      }

      if (issue.labels) {
        commit.labels = issue.labels.map((label) => label.name)
      }

      next()
    }

    if (commit.ghUser === 'iojs') {
      commit.ghUser = 'nodejs' // forcibly rewrite as the GH API doesn't do it for us
    }

    // To prevent multiple simultaneous requests for the same issue
    // from hitting the network at the same time, immediately assign a Promise
    // to the cache that all commits with the same ghIssue value will use.
    const key = `${commit.ghUser}/${commit.ghProject}#${commit.ghIssue}`
    cache[key] = cache[key] || ghget(authData, commit.ghUser, commit.ghProject, commit.ghIssue)
    cache[key].then((val) => onFetch(null, val), (err) => onFetch(err))
  }, 15)

  q.push(sublist)
  await q.drain()
}
