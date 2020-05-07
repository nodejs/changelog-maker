'use strict'

const { toGroups } = require('./groups')

function groupCommits (list, plaintext = false) {
  const groupList = list.reduce((groupList, commit) => {
    const group = toGroups(commit.summary) || '*'

    if (!groupList[group]) {
      groupList[group] = []
    }

    groupList[group].push(commit)
    return groupList
  }, {})

  const grouped = Object.keys(groupList).sort().reduce((p, group) => {
    return p.concat(groupList[group])
  }, [])

  return grouped
}

module.exports = groupCommits
