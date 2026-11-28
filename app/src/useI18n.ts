import { useSyncExternalStore } from 'react'
import {
  getLanguage,
  numberText,
  subscribeLanguage,
  translate,
  type MessageKey,
  type MessageParams,
} from './i18n'

export function useI18n() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage)
  return {
    language,
    t: (key: MessageKey, params?: MessageParams) => translate(key, params, language),
    number: (value: number) => numberText(value, language),
  }
}
