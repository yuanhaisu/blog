---
title: 测试夹具：目录、代码块与阅读体验
description: 用于验证文章页目录、代码高亮、复制、上下篇与相关文章的测试夹具，不属于正式发布内容。
date: 2026-11-06
updated: 2026-11-08
tags:
  - 一人交付
  - AI Agent
series: one-person-delivery-experiment
order: 1
draft: false
featured: false
lang: zh
license: CC BY 4.0
---

这是一篇测试夹具，用来验证文章页的阅读体验。它包含二级与三级标题、代码块、标签与专题信息，并链接到[首页](/)与[隐私说明](/privacy)，以便在构建产物上检查目录、高亮、复制按钮、上下篇和相关文章。

## 准备工作

这一节用于生成二级标题，下面包含两个三级标题。

### 环境要求

Node.js 版本需要与仓库的 `.nvmrc` 保持一致。安装依赖后先运行一次构建，确认内容护栏通过。

### 目录结构

文章位于 `content/posts`，页面位于 `app/pages`。`npm run build` 会先生成静态产物，再由 Playwright 在产物上断言行为。

## 示例代码

下面的 TypeScript 代码块用于检查语法高亮与复制按钮。代码内容本身没有业务含义，只作为夹具。

```ts
type FixtureItem = {
  slug: string
  title: string
}

const fixtureItems: FixtureItem[] = [
  { slug: 'first', title: '第一项' },
  { slug: 'second', title: '第二项' },
]

export function findFixture(slug: string): FixtureItem | undefined {
  return fixtureItems.find((item) => item.slug === slug)
}
```

再放一个 shell 代码块，检查不同语言的渲染。

```bash
npm run build
npx playwright test
```

## 配图

下面这张站内图片用于验证 Markdown 图片默认启用懒加载与异步解码。

![站点头像](/avatar.png)

## 小结

这篇夹具同时链接回[第一篇正式文章](/posts/why-i-started-one-person-delivery-notes)，用于验证相关文章与内链检查。
