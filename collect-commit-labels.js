import { auth } from './auth.js'
import { get as ghget } from 'ghissues'
import { forEachConcurrent } from './for-each-concurrent.js'

export async function collectCommitLabels (list) {
  const sublist = list.filter((commit) => {
    return typeof commit.ghIssue === 'number' && commit.ghUser && commit.ghProject
  })

  if (!sublist.length) {
    return
  }

  const authData = await auth()

  const cache = {}

  await forEachConcurrent(sublist, 15, async (commit) => {
    if (commit.ghUser === 'iojs') {
      commit.ghUser = 'nodejs' // forcibly rewrite as the GH API doesn't do it for us
    }

    // To prevent multiple simultaneous requests for the same issue
    // from hitting the network at the same time, immediately assign a Promise
    // to the cache that all commits with the same ghIssue value will use.
    const key = `${commit.ghUser}/${commit.ghProject}#${commit.ghIssue}`
    cache[key] = cache[key] || ghget(authData, commit.ghUser, commit.ghProject, commit.ghIssue)

    try {
      const issue = await cache[key]
      if (issue.labels) {
        commit.labels = issue.labels.map((label) => label.name)
      }
    } catch (err) {
      console.error('Error fetching issue #%s: %s', commit.ghIssue, err.message)
    }
  })
}
