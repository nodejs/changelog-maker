'use strict'

const ghauth = require('ghauth')
const { graphql } = require('@octokit/graphql')

const authOptions = {
  configName: 'changelog-maker',
  scopes: ['repo']
}

function collectCommitLabels (list, callback) {
  const sublist = list.filter((commit) => {
    return typeof commit.ghIssue === 'number' && commit.ghUser && commit.ghProject
  })

  if (!sublist.length) {
    return setImmediate(callback)
  }

  ghauth(authOptions, (err, authData) => {
    if (err) {
      return callback(err)
    }

    const allPrs = list.map(item => item.ghIssue)
    const uniquePrs = Array.from(new Set(allPrs))

    const bits = uniquePrs.map(prNumber => {
      return `pr${prNumber}: pullRequest (number: ${prNumber}){
        labels (first: 100) {
          nodes {
            name
          }
        }
      }`
    }).join('\n')

    const query = `query ($owner: String!, $name: String!) {
      repository (owner: $owner, name: $name) {
        ${bits}
      }
    }`

    graphql(query, {
      owner: list[0].ghUser,
      name: list[0].ghProject,
      headers: {
        authorization: `token ${authData.token}`
      }
    }).then(res => {
      for (let i = 0; i < list.length; i++) {
        const pr = res.repository[`pr${list[i].ghIssue}`]
        list[i].labels = pr.labels.nodes.map(n => n.name)
      }

      callback()
    })
  })
}

module.exports = collectCommitLabels
