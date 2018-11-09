const ghauth = require('ghauth')
const ghissues = require('ghissues')
const async = require('async')

const authOptions = {
  configName: 'changelog-maker',
  scopes: ['repo']
}

function collectCommitLabels (list, callback) {
  let sublist = list.filter(function (commit) {
    return typeof commit.ghIssue === 'number' && commit.ghUser && commit.ghProject
  })

  if (!sublist.length) {
    return setImmediate(callback)
  }

  ghauth(authOptions, function (err, authData) {
    const cache = {}

    if (err) {
      return callback(err)
    }
    let q = async.queue(function (commit, next) {
      function onFetch (err, issue) {
        if (err) {
          console.error('Error fetching issue #%s: %s', commit.ghIssue, err.message)
          return next()
        }

        if (issue.labels) {
          commit.labels = issue.labels.map(function (label) { return label.name })
        }
        next()
      }

      if (commit.ghUser === 'iojs') {
        commit.ghUser = 'nodejs'// forcably rewrite as the GH API doesn't do it for us
      }

      // To prevent multiple simultaneous requests for the same issue
      // from hitting the network at the same time, immediately assign a Promise
      // to the cache that all commits with the same ghIssue value will use.
      const key = `${commit.ghUser}/${commit.ghProject}#${commit.ghIssue}`
      cache[key] = cache[key] || new Promise((resolve, reject) => {
        ghissues.get(authData, commit.ghUser, commit.ghProject, commit.ghIssue, (err, issue) => {
          if (err) return reject(err)
          resolve(issue)
        })
      })
      cache[key].then(val => onFetch(null, val), err => onFetch(err))
    }, 15)
    q.drain = callback
    q.push(sublist)
  })
}

module.exports = collectCommitLabels
