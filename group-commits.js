'use strict'

const { toGroups } = require('./groups')

function groupCommits (list) {
  const groupList = list.reduce((groupList, commit) => {
    const group = toGroups(commit.summary) || '*'

    if (!groupList[group]) {
      groupList[group] = []
    }

    groupList[group].push(commit)
    return groupList
  }, {})

  return Object.keys(groupList).sort().reduce((p, group) => {
    return p.concat(groupList[group])
  }, [])
}

module.exports = groupCommits
