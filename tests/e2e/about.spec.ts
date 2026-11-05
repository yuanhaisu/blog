import { expect, test } from '@playwright/test'

const aboutPath = '/about'

test('About 页展示身份主张、可验证经历、代表项目、技能与公开联系方式', async ({
  page,
  request,
}) => {
  const response = await page.goto(aboutPath)

  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/关于.*袁海粟/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '袁海粟（Yuan Haisu）',
  )

  const article = page.locator('article')

  await expect(article).toContainText('一人公司的 AI 交付实验')
  await expect(article).toContainText('11 年后端与分布式系统研发')
  await expect(article).toContainText('4 年半数据分析部门主管')

  await expect(article).toContainText('养成星球')
  await expect(article).toContainText('金融级私有化 AI 模型服务')
  await expect(article).toContainText('LLM 意图识别与工具编排')

  await expect(article).toContainText('Go')
  await expect(article).toContainText('多 agent 流水线')

  await expect(
    page.getByRole('link', { name: 'hi@yuanhaisu.com' }),
  ).toHaveAttribute('href', 'mailto:hi@yuanhaisu.com')
  await expect(
    page.getByRole('link', { name: /github\.com\/yuanhaisu/ }),
  ).toHaveAttribute('href', 'https://github.com/yuanhaisu')

  // 知乎与公众号尚未确认真实主页 URL，页面只能展示明确的待补充占位，
  // 不得编造链接。
  await expect(article).toContainText('知乎：账号准备中')
  await expect(article).toContainText('微信公众号：账号准备中')
  await expect(page.locator('a[href*="zhihu.com"]')).toHaveCount(0)
  await expect(page.locator('a[href*="weixin"]')).toHaveCount(0)

  const avatar = page.locator('img[src="/avatar.png"]')
  await expect(avatar).toHaveAttribute('alt', /袁海粟/)

  const avatarResponse = await request.get('/avatar.png')
  expect(avatarResponse.status()).toBe(200)
  expect(avatarResponse.headers()['content-type']).toContain('image/png')
})

test('About 页不含错误姓名变体、手机号、客户名称或儿童信息', async ({
  page,
}) => {
  await page.goto(aboutPath)
  const html = await page.content()

  expect(html).not.toContain('袁海苏')
  expect(html).not.toMatch(/kindergarten/i)
  expect(html).not.toMatch(
    /(?<!\d)(?:\+?86[\s-]?)?1[3-9]\d(?:[\s-]?\d{4}){2}(?!\d)/,
  )
  expect(html).not.toMatch(
    /(?:孩子|女儿|儿子|宝宝|小朋友|儿童|幼儿)[^\n。；;]{0,12}(?:姓名|名字|生日|出生日期|出生|身份证|幼儿园|学校|班级)/,
  )
})
