#!/usr/bin/env node
import {
  formatGuardrailReport,
  runContentGuardrails,
} from './lib/content-guardrails.mjs'

function parseArgs(argv) {
  const options = {}
  const flags = {
    '--root': 'rootDir',
    '--content': 'contentDir',
    '--app': 'appDir',
    '--server': 'serverDir',
    '--public': 'publicDir',
    '--config': 'configPath',
  }

  for (let index = 0; index < argv.length; index++) {
    const key = flags[argv[index]]
    if (!key) {
      continue
    }
    const value = argv[++index]
    if (!value) {
      throw new Error(`参数 ${argv[index - 1]} 缺少路径`)
    }
    options[key] = value
  }

  return options
}

try {
  const result = await runContentGuardrails(parseArgs(process.argv.slice(2)))

  if (result.errors.length > 0) {
    process.stderr.write(`${formatGuardrailReport(result)}\n`)
    process.exit(1)
  }

  process.stdout.write(
    `内容护栏通过：${result.counts.published} 篇已发布，${result.counts.drafts} 篇草稿。\n`,
  )
} catch (error) {
  process.stderr.write(`内容护栏执行失败：${error?.message ?? '未知错误'}\n`)
  process.exit(1)
}
