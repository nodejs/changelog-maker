import { remark } from 'remark'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import presetLintNode from 'remark-preset-lint-node'

const formatter = remark()
  .use(remarkParse)
  .use(presetLintNode)
  .use(remarkStringify)

const format = async (markdown) => {
  const result = await formatter.process(markdown)
  return result.toString()
}

export default format
