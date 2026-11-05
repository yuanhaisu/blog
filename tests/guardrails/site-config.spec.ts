import { expect, test } from '@playwright/test'
import {
  PROFILE_DEFINITIONS,
  confirmedProfileSameAs,
  resolveProfiles,
} from '../../shared/site-config.mjs'

test('未配置真实 URL 时知乎与公众号保持占位且不进入 sameAs', () => {
  const profiles = resolveProfiles()

  expect(profiles.map((profile) => profile.kind)).toEqual([
    'github',
    'zhihu',
    'wechat',
  ])
  expect(profiles.find((profile) => profile.kind === 'zhihu')?.href).toBeNull()
  expect(profiles.find((profile) => profile.kind === 'wechat')?.href).toBeNull()
  expect(confirmedProfileSameAs(profiles)).toEqual([])
})

test('配置真实 URL 后渲染链接并进入 sameAs', () => {
  const profiles = resolveProfiles({
    zhihu: 'https://www.zhihu.com/people/yuanhaisu',
    wechat: 'https://mp.weixin.qq.com/s/example',
  })
  const sameAs = confirmedProfileSameAs(profiles)

  expect(sameAs).toEqual([
    'https://www.zhihu.com/people/yuanhaisu',
    'https://mp.weixin.qq.com/s/example',
  ])
  expect(
    profiles.find((profile) => profile.kind === 'zhihu')?.detail,
  ).toBe('www.zhihu.com/people/yuanhaisu')
})

test('非法 URL 被忽略，不会写入链接或 sameAs', () => {
  const profiles = resolveProfiles({
    zhihu: 'javascript:alert(1)',
    wechat: 'not-a-url',
  })

  expect(profiles.find((profile) => profile.kind === 'zhihu')?.href).toBeNull()
  expect(profiles.find((profile) => profile.kind === 'wechat')?.href).toBeNull()
  expect(confirmedProfileSameAs(profiles)).toEqual([])
})

test('国内平台通过显式 domestic 字段标识，而不是按标签名过滤', () => {
  const domesticKinds = PROFILE_DEFINITIONS.filter(
    (profile) => profile.domestic,
  ).map((profile) => profile.kind)

  expect(domesticKinds).toEqual(['zhihu', 'wechat'])
})
