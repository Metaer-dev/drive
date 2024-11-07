import { createI18n } from "vue-i18n"
import enLang from "./locales/en.json"
import zhLang from "./locales/zh.json"
import { useTimeAgo as vueUseTimeAgo } from "@vueuse/core"

const messages = {
  en: {
    ...enLang,
  },
  zh: {
    ...zhLang,
  },
}

export const i18n = createI18n({
  locale: "zh",
  fallbackLocale: "en",
  messages,
})

export const t = (key) => i18n.global.t(key)

export const useTimeAgoChinese = (date, options = {}) => {
  const zhConfig = {
    ...options,
    messages: {
      justNow: "刚刚",
      past: (n) => (n.match(/\d/) ? `${n}前` : n),
      future: (n) => (n.match(/\d/) ? `未来 ${n}` : n),
      month: (n, past) => (n === 1 ? (past ? "上个月" : "下个月") : `${n}个月`),
      year: (n, past) => (n === 1 ? (past ? "去年" : "明年") : `${n}年`),
      day: (n, past) => (n === 1 ? (past ? "昨天" : "明天") : `${n}天`),
      week: (n, past) => (n === 1 ? (past ? "上一周" : "下一周") : `${n}周`),
      hour: (n) => `${n}小时`,
      minute: (n) => `${n}分钟`,
      second: (n) => `${n}秒`,
    },
  }

  return vueUseTimeAgo(date, zhConfig)
}

export const useTimeAgo = useTimeAgoChinese
