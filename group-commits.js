const toGroups = require('./groups').toGroups

function groupCommits (list) {
  var groupList = list.reduce(function (groupList, commit) {
    var group = toGroups(commit.summary) || '*'
    if (!groupList[group]) {
      groupList[group] = []
    }
    groupList[group].push(commit)
    return groupList
  }, {})

  return Object.keys(groupList).sort().reduce(function (p, group) {
    return p.concat(groupList[group])
  }, [])
}

module.exports = groupCommits
