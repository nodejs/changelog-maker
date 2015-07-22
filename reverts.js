const revertRe = /^revert\s+"?/i


function isRevert (summary) {
  return summary && revertRe.test(summary)
}


function cleanSummary (summary) {
  summary = summary || ''
  if (!isRevert(summary))
    return summary
  return summary.replace(revertRe, '').replace(/"$/, '')
}


module.exports.isRevert     = isRevert
module.exports.cleanSummary = cleanSummary