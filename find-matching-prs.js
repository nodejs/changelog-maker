'use strict'

import { auth } from './auth.js'
import { graphql } from '@octokit/graphql'
import async from 'async'

// Query to find the first 4 pull requests that include the commit that we're
// concerned about. We'll filter them and take the first one that was MERGED
// as our prUrl.
const query = `
  query ($owner: String!, $name: String!, $commit: GitObjectID!) {
    repository(owner: $owner, name: $name) {
      object(oid: $commit) {
        ... on Commit {
          associatedPullRequests(first: 4) {
            ... on PullRequestConnection {
              edges {
                node {
                  ... on PullRequest {
                    number
                    url
                    title
                    state
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

export async function findMatchingPrs (ghId, list) {
  // only look up commits that don't have a prUrl from metadata
  const sublist = list.filter((commit) => typeof commit.prUrl !== 'string')
  if (!sublist.length) {
    return
  }

  const authData = await auth()
  const headers = { authorization: `token ${authData.token}` }
  const cache = {}

  const q = async.queue(async (commit, next) => {
    if (commit.ghUser === 'iojs') {
      commit.ghUser = 'nodejs' // forcibly rewrite as the GH API doesn't do it for us
    }

    // cache on commit, so we don't run the same commit twice (is this possible?)
    cache[commit.sha] = cache[commit.sha] || (async () => {
      try {
        const res = await graphql(query, { owner: ghId.user, name: ghId.repo, commit: commit.sha, headers })
        if (res.repository?.object?.associatedPullRequests?.edges?.length) {
          const pr = res.repository.object.associatedPullRequests.edges.filter((e) => e.node?.state === 'MERGED')[0]
          if (pr) {
            commit.ghIssue = pr.node.number
            commit.prUrl = pr.node.url
          }
        }
      } catch (err) {
        console.error(`Error querying GitHub to find pull request for commit: ${err}`)
      }
    })()
    await cache[commit.sha]
    next()
  }, 15)

  q.push(sublist)
  await q.drain()
}
