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

    const bits = list.map(item => {
      return `pr${item.ghIssue}: pullRequest (number: ${item.ghIssue}){
        title
        number
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
      headers: {
        authorization: `token ${authData.token}`
      },
      owner: list[0].ghUser,
      name: list[0].ghProject
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
