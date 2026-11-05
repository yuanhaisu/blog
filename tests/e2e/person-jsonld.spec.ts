import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const personId = 'https://yuanhaisu.com/#person'
const articlePath = '/posts/why-i-started-one-person-delivery-notes'

type JsonLdNode = Record<string, unknown>

async function readJsonLd(page: Page): Promise<JsonLdNode[]> {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents()

  return blocks.map((block) => JSON.parse(block) as JsonLdNode)
}

function findPerson(nodes: JsonLdNode[]): JsonLdNode | undefined {
  return nodes.find((node) => node['@type'] === 'Person')
}

function expectAbsoluteUrl(value: unknown, label: string) {
  expect(typeof value, `${label} 应为字符串`).toBe('string')
  expect(() => new URL(value as string), `${label} 应为绝对 URL`).not.toThrow()
}

test('About 页输出字段完整、URL 合法的 Person JSON-LD', async ({ page }) => {
  await page.goto('/about')

  const nodes = await readJsonLd(page)
  expect(nodes.length).toBeGreaterThan(0)

  const people = nodes.filter((node) => node['@type'] === 'Person')
  expect(people, '每页应只有一个 Person 实体').toHaveLength(1)

  const person = people[0]!
  expect(person['@context']).toBe('https://schema.org')
  expect(person['@id']).toBe(personId)
  expect(person.name).toBe('袁海粟')
  expect(person.alternateName).toEqual(
    expect.arrayContaining(['Yuan Haisu', 'yuanhaisu']),
  )
  expect(person.url).toBe('https://yuanhaisu.com')
  expect(person.image).toBe('https://yuanhaisu.com/avatar.png')
  expectAbsoluteUrl(person.url, 'Person.url')
  expectAbsoluteUrl(person.image, 'Person.image')

  expect(typeof person.jobTitle).toBe('string')
  expect((person.jobTitle as string).length).toBeGreaterThan(0)
  expect(typeof person.description).toBe('string')
  expect((person.description as string).length).toBeGreaterThan(0)

  expect(Array.isArray(person.knowsAbout)).toBe(true)
  const knowsAbout = person.knowsAbout as string[]
  expect(knowsAbout.length).toBeGreaterThan(0)
  for (const topic of knowsAbout) {
    expect(typeof topic).toBe('string')
    expect(topic.length).toBeGreaterThan(0)
  }

  expect(Array.isArray(person.sameAs)).toBe(true)
  const sameAs = person.sameAs as string[]
  expect(sameAs.length).toBeGreaterThan(0)
  for (const url of sameAs) {
    expectAbsoluteUrl(url, 'Person.sameAs 条目')
  }
  expect(sameAs).toContain('https://github.com/yuanhaisu')
  expect(sameAs).toContain('https://yuanhaisu.com/feed.xml')

  // 知乎与微信公众号主页 URL 尚未确认：不得写入编造的 sameAs 地址。
  expect(sameAs.some((url) => /zhihu\.com|weixin|wechat/i.test(url))).toBe(false)

  const raw = JSON.stringify(person)
  expect(raw).not.toContain('袁海苏')
})

test('Person 实体在首页、About、文章页与隐私页保持一致', async ({ page }) => {
  const paths = ['/', '/about', articlePath, '/privacy']
  const entities: JsonLdNode[] = []

  for (const path of paths) {
    await page.goto(path)
    const person = findPerson(await readJsonLd(page))
    expect(person, `${path} 应输出 Person JSON-LD`).toBeTruthy()
    entities.push(person!)
  }

  for (const entity of entities.slice(1)) {
    expect(entity).toEqual(entities[0])
  }
})
