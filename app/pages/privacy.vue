<script setup lang="ts">
useHead({
  title: `隐私说明 · ${SITE.name}`,
  meta: [
    {
      name: 'description',
      content:
        '一人交付笔记的隐私说明：访问统计、Giscus/GitHub 评论与微信公众号订阅分别处理哪些数据，以及 Cookie 的使用情况。',
    },
  ],
})
</script>

<template>
  <article class="privacy">
    <header class="post-header">
      <p class="eyebrow">一人交付笔记</p>
      <h1>隐私说明</h1>
      <p class="post-meta">
        <span>更新日期：</span>
        <time datetime="2026-11-05">2026-11-05</time>
      </p>
      <p class="post-deck">
        本站是静态站点，没有账号系统，也不主动收集姓名、邮箱或手机号。下面是第三方服务会接触到的数据范围。
      </p>
    </header>

    <div class="post-body">
      <h2>访问统计</h2>
      <p>
        本站使用 Cloudflare Web Analytics 与百度统计了解页面访问情况。统计数据只用于判断哪些内容有人读、页面是否正常，以及改进站点体验；不用于广告投放、用户画像或跨站追踪。
      </p>

      <h3>Cloudflare Web Analytics</h3>
      <ul>
        <li>
          用途：统计页面访问量、来源页面、国家或地区、设备与浏览器类型、页面加载性能等汇总指标。
        </li>
        <li>
          数据：页面地址、来源、粗略地域、设备与浏览器信息、性能指标。Cloudflare 不收集可识别个人身份的信息，也不做跨站跟踪。
        </li>
        <li>
          Cookie：Cloudflare Web Analytics 不使用 Cookie，不使用 localStorage，也不进行浏览器指纹识别。
        </li>
        <li>
          处理方：Cloudflare, Inc.，其
          <a href="https://www.cloudflare.com/privacypolicy/" rel="noopener noreferrer">隐私政策</a>
          适用。
        </li>
      </ul>

      <h3>百度统计</h3>
      <ul>
        <li>
          用途：统计本站来自中国大陆的访问情况，作为全球统计的补充。
        </li>
        <li>
          数据：访问页面、来源、访问时间、浏览器与设备信息，以及 IP 地址（用于粗略地域统计）。
        </li>
        <li>
          Cookie：百度统计会使用 Cookie（例如用于区分访问者与回访的标识），并可能读写与统计相关的本地存储。你可以通过浏览器设置禁用 Cookie；这不会影响正文阅读。
        </li>
        <li>
          处理方：百度，其
          <a href="https://privacy.baidu.com/" rel="noopener noreferrer">隐私政策</a>
          适用。
        </li>
      </ul>

      <p>
        两项统计脚本都以延迟或异步方式加载，不阻塞正文渲染。禁用 JavaScript 时正文仍完整可读，统计也不会运行。
      </p>

      <h2>评论（Giscus / GitHub）</h2>
      <p>
        文章页的评论由 Giscus 提供，评论内容保存在 GitHub Discussions 中。本站不建立评论数据库，也不保存评论副本。
      </p>
      <ul>
        <li>
          发表评论需要登录 GitHub 账号，并授权 Giscus GitHub App 访问你在该仓库 Discussions 中的公开信息。
        </li>
        <li>
          你的 GitHub 用户名、头像、评论内容与时间会显示在文章页，并由 GitHub 按其政策存储和处理。
        </li>
        <li>
          处理方：GitHub, Inc.，其
          <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" rel="noopener noreferrer">隐私声明</a>
          适用；Giscus 本身是开源项目。
        </li>
        <li>
          不愿使用 GitHub 的读者，也可以通过知乎或微信公众号参与讨论，相关平台分别适用其自身规则。
        </li>
      </ul>

      <h2>微信公众号订阅</h2>
      <p>
        本站通过微信公众号提供中文订阅与更新提醒。v1 不提供邮件 Newsletter，也没有订阅表单。
      </p>
      <ul>
        <li>
          订阅关系、消息推送与阅读行为由微信及腾讯处理，适用微信的隐私政策。
        </li>
        <li>
          本站不收集你的邮箱、手机号或微信账号信息，也拿不到公众号订阅者名单。
        </li>
        <li>
          公众号后台提供的阅读与关注统计由微信控制，本站仅查看汇总数据。
        </li>
      </ul>

      <h2>数据共享与保留</h2>
      <p>
        本站不出售、出租或与广告商共享上述数据。第三方服务按其自身隐私政策与保留期限处理数据；本站没有服务器端数据库，无法单独导出或删除第三方服务中的记录。如需请求删除你在 GitHub Discussions 中的评论，可在对应讨论中操作或联系下方邮箱。
      </p>

      <h2>联系</h2>
      <p>
        对隐私说明有疑问，可以发邮件到
        <a href="mailto:hi@yuanhaisu.com">hi@yuanhaisu.com</a>。
      </p>
    </div>
  </article>
</template>
