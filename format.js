import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'

const formatter = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkStringify, { emphasis: '_', tightDefinitions: true })

export async function formatMarkdown (markdown) {
  const result = await formatter.process(markdown)
  return result.toString()
}
