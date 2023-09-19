import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import presetLintNode from 'remark-preset-lint-node'

const formatter = unified()
  .use(remarkParse)
  .use(presetLintNode)
  .use(remarkStringify)

export async function formatMarkdown (markdown) {
  const result = await formatter.process(markdown)
  return result.toString()
}
