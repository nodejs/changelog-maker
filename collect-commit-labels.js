const ghauth         = require('ghauth')
    , ghissues       = require('ghissues')
    , after          = require('after')

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
    if (err)
      return callback(err)

    var done = after(sublist.length, callback)

    sublist.forEach(function (commit) {
      function onFetch (err, issue) {
        if (err) {
          console.error('Error fetching issue #%s: %s', commit.ghIssue, err.message );
          return done()
        }

        if (issue.labels)
          commit.labels = issue.labels.map(function (label) { return label.name })
        done()
      }

      if (commit.ghUser == 'iojs')
        commit.ghUser = 'nodejs' // forcably rewrite as the GH API doesn't do it for us

      ghissues.get(authData, commit.ghUser, commit.ghProject, commit.ghIssue, onFetch)
    })
  })
}


module.exports = collectCommitLabels