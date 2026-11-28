import { en } from './locales/en'
import { ja } from './locales/ja'

export const languages = {
  ja: { name: '日本語', locale: 'ja-JP', messages: ja },
  en: { name: 'English', locale: 'en-US', messages: en },
}
export type Language = keyof typeof languages
export type MessageKey = keyof typeof ja
export type MessageParams = Record<string, string | number>
export const LANGUAGE_STORAGE_KEY = 'coffee-timer.language.v1'
export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && Object.hasOwn(languages, value)

function readLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguage(saved) ? saved : 'ja'
  } catch (error) {
    console.warn('Could not read language preference', error)
    return 'ja'
  }
}

let language = readLanguage()
const listeners = new Set<() => void>()
export const getLanguage = () => language
export const numberText = (value: number, selected = language) =>
  new Intl.NumberFormat(languages[selected].locale, { maximumFractionDigits: 15 }).format(value)

export function translate(key: MessageKey, params: MessageParams = {}, selected = language) {
  return languages[selected].messages[key].replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = params[name]
    if (value === undefined) throw new Error(`Missing translation parameter: ${key}.${name}`)
    return typeof value === 'number' ? numberText(value, selected) : value
  })
}

function notify() {
  listeners.forEach((listener) => listener())
}

function onStorage(event: StorageEvent) {
  if (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null) return
  language = isLanguage(event.newValue) ? event.newValue : 'ja'
  notify()
}

export function subscribeLanguage(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}

export function setLanguage(next: Language) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
  language = next
  notify()
}

export class TranslationError extends Error {
  key: MessageKey
  params: MessageParams
  constructor(key: MessageKey, params: MessageParams = {}) {
    super(translate(key, params))
    this.key = key
    this.params = params
  }
}

export function errorText(error: unknown, fallback: MessageKey) {
  if (error instanceof TranslationError) return translate(error.key, error.params)
  return translate(fallback)
}
