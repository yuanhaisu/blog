import { gunzipSync } from 'node:zlib'
import { expect, test } from '@playwright/test'

const draftPath = '/posts/drafts/draft-example-not-published'
const draftTitle = '草稿示例：这篇不会发布'

test('草稿不出现在生产构建、首页列表与站内路由中', async ({ page }) => {
  const home = await page.goto('/')
  expect(home?.status()).toBe(200)
  await expect(page.getByText(draftTitle)).toHaveCount(0)

  const draft = await page.goto(draftPath)
  expect(draft?.status()).toBe(404)
})

test('草稿内容不出现在公开的内容数据库转储中', async ({ request }) => {
  const response = await request.get('/__nuxt_content/posts/sql_dump.txt')
  expect(response.status()).toBe(200)

  const dump = gunzipSync(Buffer.from((await response.text()).trim(), 'base64')).toString('utf8')

  expect(dump).not.toContain('draft-example-not-published')
  expect(dump).not.toContain(draftTitle)
  expect(dump).toContain('fixture-manifesto')
})
