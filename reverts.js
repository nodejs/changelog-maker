const revertRe = /^revert\s+"?/i

export function isRevert (summary) {
  return summary && revertRe.test(summary)
}

export function cleanSummary (summary = '') {
  if (!isRevert(summary)) {
    return summary
  }

  return summary.replace(revertRe, '').replace(/"$/, '')
}
