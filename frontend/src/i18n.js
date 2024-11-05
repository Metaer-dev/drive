import { createI18n } from "vue-i18n"
import enLang from "./locales/en.json"
import zhLang from "./locales/zh.json"

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
