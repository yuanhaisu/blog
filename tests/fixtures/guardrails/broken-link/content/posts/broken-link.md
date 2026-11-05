---
title: 内链检查示例
description: 用于证明指向不存在路由的站内链接会让构建失败。
date: 2026-11-05
tags:
  - 内容模型
draft: false
lang: zh
license: CC BY 4.0
---

这里有一个合法内链[首页](/)，也有一个死链[不存在的文章](/posts/does-not-exist)。

外部链接[示例站](https://example.com/missing)与锚点[本节](#section)不应被检查。

```md
[代码块里的链接](/posts/code-only-should-be-ignored)
```
