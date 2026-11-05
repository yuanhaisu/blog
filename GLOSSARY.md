# 术语表（Ubiquitous Language）

本项目的统一语言。出现分歧时，以本表定义为准。具体技术选型见 ADR-0004 / ADR-0007 与 `docs/plan.md`，本表只定义概念。

| 术语 | 英文 / 缩写 | 定义 | 在本项目中的含义 |
| --- | --- | --- | --- |
| 博客 | Blog | 由作者持续发布文章的独立网站 | 指 `yuanhaisu.com` 主站，不含知乎/公众号等外部平台 |
| 个人品牌 | Personal Brand | 他人在提及你时形成的稳定认知 | 以「人」为核心，跨技术/产品/职业思考 |
| 生成式引擎优化 | GEO (Generative Engine Optimization) | 让生成式 AI 在回答中准确识别、引用、推荐某实体或内容的优化实践 | 本项目的首要成功标准 |
| AI Agent | AI Agent / LLM Agent | 能自主搜索、抓取、整合信息并生成回答的智能体 | 包括国内外 AI 搜索与助手产品 |
| 实体 | Entity | 可被知识图谱或模型稳定识别的人、组织、作品等对象 | 本项目中指「袁海粟这个人」 |
| 实体锚点 | Entity Anchor | 外部可公开抓取、用于交叉验证身份的来源 | GitHub、知乎、微信公众号、博客；GitHub 是技术身份的主锚点之一 |
| 实体认知 | Entity Recognition | AI 能准确说出某实体是谁、做什么 | GEO 场景之一 |
| 内容引用 | Citation | AI 在回答中检索并链接本站文章 | GEO 场景之一 |
| 机器可读接口 | Machine-readable Interface | 供 agent 低成本读取的结构化入口（JSON-LD、RSS、sitemap、llms.txt、API） | GEO 场景之一 |
| 信任传递 | Trust Transfer | AI 在决策场景中主动推荐作者 | GEO 场景之一 |
| 结构化数据 | Structured Data / JSON-LD | 嵌入页面的 schema.org 标记 | 用于 `Person`、`Article`、`BreadcrumbList` 等 |
| 身份主张 | Positioning Statement | 一句话说明「你是谁、为谁、提供什么价值」 | 必须能被机器复述 |
| 一人交付笔记 | — | 本站站名与出版物名 | 浏览器标题、首页展示、外部简介保持一致；v1 不涉及备案命名 |
| 一人公司 | One-person Company | 由一个人完成产品、开发、交付与运营的组织形态 | 本项目内容主线，不是法律意义上的公司 |
| 一人交付 | One-person Delivery | 一个人借助 AI agent 流水线完成过去需要团队完成的软件交付 | 本站旗舰叙事 |
| 一人交付实验 | One-person Delivery Experiment | 以连载形式复盘一人 + AI agent 的真实交付过程 | 第一季从养成星球案例开始，不是「建站连载」 |
| 范围冻结 | Scope Freeze | v1 功能清单确定后不追加新功能 | 新需求进入 v1.1，或替换清单项 |
| 上线门槛 | Launch Gate | 允许上线的最低条件 | 3 篇中文博客 + 2 篇中文平台文章；功能清单完成 |
| 技术杂志感 | Technical Magazine | 强排版、案例式布局、图表与代码并重的视觉方向 | 本站视觉基调 |
| 内容源 | Content Source | 文章的唯一真相源 | GitHub 公开仓库中的 Markdown；草稿放私有仓库 |
| 发布托管 | Hosting | 把构建产物放到公网的服务 | Cloudflare Pages，从 GitHub 构建 |
| 规范 URL | Canonical URL | 一个页面对外声明的唯一正式地址 | `https://yuanhaisu.com`（apex）；`www` 301 |
| 分发渠道 | Distribution Channel | 同一内容触达不同读者的渠道 | 博客、知乎、微信公众号；小红书/抖音 v2 |
| 镜像 | Mirror | 在另一个域名上部署的完整副本 | 未来国内镜像 `yuanhaisu.cn`，canonical 指向主站 |
| 同步转载 | Syndication | 在第三方平台发布的部分内容或改编版 | 知乎/公众号发布，不等于镜像 |
| 中文 canonical | Chinese Canonical | v1 以中文页面为规范版本 | 英文 v1.1 使用 `/en/` 与 `hreflang` |
| 英文 v1.1 | English v1.1 | 上线后 3 个月内的英文翻译版本 | 3 篇首发文章 + About + 首页；硬性 gate |
| GitHub 优先 | GitHub-first | 以 GitHub 为内容源、协作入口与主要技术身份锚点 | 不等于用 GitHub Pages 托管；托管是 Cloudflare Pages |
| Profile README | — | GitHub 个人主页的自我介绍仓库 | `yuanhaisu/yuanhaisu`，中英双语，链接博客/知乎/公众号 |
| 案例仓库 | Case-study Repository | 脱敏后的公开项目作品集仓库 | `nurture-planet-case-study`；完整 `kindergarten` 保持私有 |
| 国内镜像 | Domestic Mirror | 部署在中国大陆、服务国内读者的副本 | v2 再决策；需独立域名 + ICP；canonical 指向 `yuanhaisu.com` |
| CC BY 4.0 | Creative Commons Attribution 4.0 | 允许复制、分发、改编、商业使用，需署名 | 本站内容授权 |
| canonical | Canonical URL | 声明页面正式地址的链接标签 | 用于跨平台同步与去重 |
| llms.txt | — | 面向 AI agent 的站点索引文本 | 列出核心页面、文章与作者信息 |
| sameAs | — | schema.org 属性，声明同一实体的其他主页 | 指向 GitHub、知乎、微信公众号、RSS；掘金可选 |
| ICP 备案 | ICP Filing | 中国大陆境内网站依法进行的工信部备案 | **v1 不执行**；未来国内镜像需要 |
| 公安联网备案 | Public Security Filing | ICP 备案后向公安机关进行的网站备案 | **v1 不执行**；未来国内镜像需要 |
| 个人备案 | Individual ICP Filing | 以自然人身份进行的非经营性网站备案 | **v1 不执行**；未来国内镜像需要 |
| ADR | Architecture Decision Record | 记录重要架构决策及其后果的短文档 | 存放于 `docs/adr/` |
| 术语表 | Glossary | 项目统一语言表 | 本文件 |
