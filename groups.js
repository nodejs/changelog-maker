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


module.exports.toGroups     = toGroups
module.exports.cleanSummary = cleanSummary
