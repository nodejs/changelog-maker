const groupRe = /^((:?\w|\-|,|, )+):\s*/i
    , reverts = require('./reverts')


function toGroups (summary) {
  summary = reverts.cleanSummary(summary)
  var m = summary.match(groupRe)
  return (m && m[1]) || ''
}


function cleanSummary (summary) {
  return (summary || '').replace(groupRe, '')
}


function isReleaseCommit (summary) {
  return /^Working on v?\d{1,2}\.\d{1,3}\.\d{1,3}$/.test(summary)
         || /^\d{4}-\d{2}-\d{2},? Version \d{1,2}\.\d{1,3}\.\d{1,3} (["'][A-Za-z ]+["'] )?\((Stable|LTS|Maintenance)\)/.test(summary)
         || /^\d{4}-\d{2}-\d{2},? io.js v\d{1,2}\.\d{1,3}\.\d{1,3} Release/.test(summary)
         || /^\d+\.\d+\.\d+$/.test(summary) // `npm version X` style commit
}


module.exports.toGroups        = toGroups
module.exports.cleanSummary    = cleanSummary
module.exports.isReleaseCommit = isReleaseCommit
