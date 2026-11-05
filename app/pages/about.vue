<script setup lang="ts">
useHead({
  title: `关于${PERSON.displayName} · ${SITE.name}`,
  meta: [
    {
      name: 'description',
      content:
        '袁海粟（Yuan Haisu）的身份锚点：11 年后端与分布式系统研发、4 年半数据分析部门主管、AI 模型服务与 LLM 工具编排，以及一人交付多租户 SaaS 的实践记录。',
    },
  ],
})
</script>

<template>
  <article class="about">
    <header class="about-header">
      <p class="eyebrow">关于</p>
      <div class="about-identity">
        <img
          class="about-avatar"
          src="/avatar.png"
          :alt="`${PERSON.displayName} 的头像`"
          width="120"
          height="120"
        />
        <div>
          <h1>{{ PERSON.displayName }}</h1>
          <p class="positioning">{{ PERSON.positioning }}</p>
          <p class="about-lede">
            11 年后端工程师、前数据分析部门主管。我用 AI agent
            流水线，以一人之力交付过去需要一个团队才能完成的软件；这里记录交付实验的全过程。
          </p>
        </div>
      </div>
    </header>

    <div class="post-body">
      <h2>身份主张</h2>
      <p>
        我是袁海粟（网络 ID：yuanhaisu）。我关心的不是「AI
        能不能写代码」，而是一个人借助 AI agent 流水线，能把软件交付做到什么程度。这个站点是「一人公司的
        AI 交付实验」的公开记录：方法、取舍、失败与可复核的证据。
      </p>

      <h2>经历摘要</h2>
      <ul>
        <li>
          <strong>11 年后端与分布式系统研发：</strong>
          长期负责服务端架构、接口设计、数据一致性与高并发场景，重视契约、测试与可运维性。
        </li>
        <li>
          <strong>4 年半数据分析部门主管：</strong>
          带领数据分析团队交付数据平台、模型服务与业务分析，连接工程实现与业务判断。
        </li>
        <li>
          <strong>AI 工程落地：</strong>
          建设金融级私有化 AI 模型服务（YOLOv5、PaddleOCR、Triton），并把 LLM
          用于意图识别与工具编排。
        </li>
        <li>
          <strong>一人交付实践：</strong>
          用自建的 Claude Code 多 agent 编排流水线，独立完成多租户 SaaS
          的设计、实现、测试与上线。
        </li>
      </ul>

      <h2>代表项目</h2>

      <h3>养成星球：一人交付的多租户 SaaS</h3>
      <p>
        在约 2.5 个月内独立完成的多租户 SaaS：后端 300+ 接口、70+ 表，三端前端，合计约
        14 万行代码。开发过程由自建的 Claude Code 多 agent
        编排流水线驱动。公开复盘会对客户与业务信息做脱敏处理。
      </p>

      <h3>金融级私有化 AI 模型服务</h3>
      <p>
        面向金融场景的私有化模型服务：整合 YOLOv5、PaddleOCR 与 Triton，完成模型部署、服务化与稳定性保障，满足私有化环境下的交付要求。
      </p>

      <h3>LLM 意图识别与工具编排</h3>
      <p>
        把 LLM 用于意图识别与工具调用编排，让模型在受控边界内完成业务动作，并为关键路径保留人工复核与回滚手段。
      </p>

      <h2>技能</h2>
      <ul>
        <li>
          <strong>后端与架构：</strong>
          Go、分布式系统、契约优先的接口设计、数据建模、测试与 CI/CD。
        </li>
        <li>
          <strong>AI 工程：</strong>
          模型服务化与 Triton 部署、OCR 与视觉模型落地、LLM 意图识别、工具编排。
        </li>
        <li>
          <strong>交付方式：</strong>
          Claude Code 多 agent 流水线、需求拆解、自动化验证、脱敏与发布。
        </li>
        <li>
          <strong>管理与分析：</strong>
          数据分析团队管理、跨团队协作、技术方案评审与交付节奏控制。
        </li>
      </ul>

      <h2>公开联系方式</h2>
      <ul class="profile-list">
        <li>
          <a :href="`mailto:${PERSON.email}`">{{ PERSON.email }}</a>
        </li>
        <li v-for="profile in PERSON_PROFILES" :key="profile.label">
          <a
            v-if="profile.href"
            :href="profile.href"
            rel="me noopener noreferrer"
            target="_blank"
          >
            {{ profile.label }}：{{ profile.detail }}
          </a>
          <span v-else>{{ profile.label }}：{{ profile.detail }}</span>
        </li>
      </ul>
      <p>
        目前开放远程的后端 / 全栈 / AI 应用开发机会，也欢迎一人公司与独立开发者交流合作。邮件是最可靠的公开联系方式。
      </p>
    </div>
  </article>
</template>
