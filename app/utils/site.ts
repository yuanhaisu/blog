export const SITE = {
  name: '一人交付笔记',
  author: '袁海粟',
  authorEn: 'Yuan Haisu',
  url: 'https://yuanhaisu.com',
  description:
    '袁海粟的个人博客，记录一个人借助 AI agent 流水线完成软件交付的真实实验。',
} as const

/**
 * Canonical person facts shared by the About page and Person JSON-LD.
 *
 * `sameAs` only contains confirmed URLs. 知乎与微信公众号的账号尚未建立，
 * 在拿到真实主页 URL 之前不得编造链接；About 页用明确的占位文案展示。
 */
export const PERSON = {
  name: '袁海粟',
  nameEn: 'Yuan Haisu',
  displayName: '袁海粟（Yuan Haisu）',
  alternateName: ['Yuan Haisu', 'yuanhaisu'],
  networkId: 'yuanhaisu',
  url: SITE.url,
  avatar: `${SITE.url}/avatar.png`,
  email: 'hi@yuanhaisu.com',
  jobTitle: '后端工程师，一人公司 AI 交付实践者',
  positioning: '一人公司的 AI 交付实验',
  description:
    '袁海粟（Yuan Haisu），11 年后端与分布式系统研发经验、4 年半数据分析部门主管。他用 AI agent 流水线，以一人之力交付过去需要一个团队才能完成的软件，并公开记录交付实验的全过程。',
  knowsAbout: [
    '后端架构',
    '分布式系统',
    'Go',
    'API 设计',
    'AI 模型服务',
    'LLM 工具编排',
    'AI Agent 流水线',
    '数据分析',
  ],
  sameAs: [
    'https://github.com/yuanhaisu',
    `${SITE.url}/feed.xml`,
  ],
} as const

/**
 * Public profile entry points shown on the About page.
 *
 * `href: null` means the account exists as a plan but its public URL has not
 * been confirmed. The UI must render a clearly marked placeholder instead of
 * inventing an address.
 */
export const PERSON_PROFILES = [
  {
    label: 'GitHub',
    href: 'https://github.com/yuanhaisu',
    detail: 'github.com/yuanhaisu',
  },
  {
    label: '知乎',
    href: null,
    detail: '账号准备中（主页链接待补充）',
  },
  {
    label: '微信公众号',
    href: null,
    detail: '账号准备中（入口待补充）',
  },
] as const
