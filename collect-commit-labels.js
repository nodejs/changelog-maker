const ghauth         = require('ghauth')
    , ghissues       = require('ghissues')
    , async          = require('async')

    , authOptions    = {
          configName : 'changelog-maker'
        , scopes     : ['repo']
      }


function collectCommitLabels (list, callback) {
  var sublist = list.filter(function (commit) {
    return typeof commit.ghIssue == 'number' && commit.ghUser && commit.ghProject
  })

  if (!sublist.length)
    return setImmediate(callback)

  ghauth(authOptions, function (err, authData) {
    const cache = {}

    if (err)
      return callback(err)
    var q = async.queue(function (commit, next) {
      function onFetch (err, issue) {
        if (err) {
          console.error('Error fetching issue #%s: %s', commit.ghIssue, err.message );
          return next()
        }

        if (issue.labels)
          commit.labels = issue.labels.map(function (label) { return label.name })
        next()
      }

      if (commit.ghUser == 'iojs')
        commit.ghUser = 'nodejs' // forcably rewrite as the GH API doesn't do it for us

      const promise = cache[commit.ghIssue] || new Promise((resolve, reject) => {
        ghissues.get(authData, commit.ghUser, commit.ghProject, commit.ghIssue, (err, issue) => {
          if (err) {
            reject(err)
          } else {
            resolve(issue)
          }
        })
      })
      cache[commit.ghIssue] = promise
      promise
        .then(val => {
          onFetch(null, val)
        }, err => {
          onFetch(err)
        })
    }, 15)
    q.drain = callback
    q.push(sublist)
  })
}


module.exports = collectCommitLabels