import { createI18n } from 'vue-i18n'
import { Locale } from 'vant'
import enUS from 'vant/es/locale/lang/en-US.mjs'
import zhCN from 'vant/es/locale/lang/zh-CN.mjs'
import english from './locales/en-US.js'
import chinese from './locales/zh-CN.js'

export const getBrowserLocale = (
  language = typeof navigator === 'undefined' ? undefined : navigator.language
) =>
  /^zh(?:-|$)/i.test(language || '') && !/^zh-(?:Hant|TW|HK|MO)(?:-|$)/i.test(language || '')
    ? 'zh-CN'
    : 'en-US'

const locale = getBrowserLocale()
export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale,
  fallbackLocale: 'en-US',
  messages: { 'zh-CN': chinese, 'en-US': english }
})

Locale.use(locale, locale === 'zh-CN' ? zhCN : enUS)

export const t = (key, params) => i18n.global.t(key, params)
export const localizeApiResponse = (response) => {
  if (!response || response.code === 0) return response
  const type = Object.prototype.hasOwnProperty.call(english.api, response.type)
    ? response.type
    : 'unknown'
  return { ...response, message: t(`api.${type}`) }
}
