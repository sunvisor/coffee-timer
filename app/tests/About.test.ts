import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LANGUAGE_STORAGE_KEY } from '../src/i18n'
import { STORAGE_KEY } from '../src/recipes'

const publicRoot = resolve(process.cwd(), 'public')
const read = (path: string) => readFileSync(resolve(publicRoot, path), 'utf8')
const script = read('about/open-app.js')
const variants = [
  {
    language: 'ja',
    path: '/about/',
    file: 'about/index.html',
    heading: 'いつもの一杯を、もう一度。',
  },
  {
    language: 'en',
    path: '/about/en/',
    file: 'about/en/index.html',
    heading: 'A great cup.Worth repeating.',
  },
]

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('promotional pages', () => {
  for (const variant of variants) {
    it(`provides readable ${variant.language} content, language links, and metadata without JavaScript`, () => {
      const page = new DOMParser().parseFromString(read(variant.file), 'text/html')
      expect(page.documentElement.lang).toBe(variant.language)
      expect(page.querySelectorAll('h1')).toHaveLength(1)
      expect(page.querySelector('h1')?.textContent?.replace(/\s+/g, '')).toBe(
        variant.heading.replace(/\s+/g, ''),
      )
      expect(page.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
        `https://coffee.sunvisor.net${variant.path}`,
      )
      for (const target of variants) {
        expect(
          page.querySelector(`link[hreflang="${target.language}"]`)?.getAttribute('href'),
        ).toBe(`https://coffee.sunvisor.net${target.path}`)
        expect(
          page.querySelector(`nav.languages a[lang="${target.language}"]`)?.getAttribute('href'),
        ).toBe(target.path)
      }
      expect(page.querySelector('nav.languages [aria-current="page"]')?.getAttribute('lang')).toBe(
        variant.language,
      )
      expect(page.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
        `https://coffee.sunvisor.net${variant.path}`,
      )
      expect(page.querySelectorAll('details')).toHaveLength(3)
      expect(page.querySelector('#how-to')).not.toBeNull()
      for (const node of page.querySelectorAll('[src], link[rel="stylesheet"]')) {
        const path = node.getAttribute('src') ?? node.getAttribute('href')!
        expect(readFileSync(resolve(publicRoot, path.slice(1))).length).toBeGreaterThan(0)
      }
      for (const link of page.querySelectorAll('[data-open-app]')) {
        expect(link.getAttribute('href')).toBe('/#/')
      }
    })

    it(`opens the app in ${variant.language} without changing recipe data`, () => {
      const page = new DOMParser().parseFromString(read(variant.file), 'text/html')
      const recipes = '[{"name":"user content"}]'
      localStorage.setItem(STORAGE_KEY, recipes)
      runInNewContext(script, { document: page, localStorage, console })
      page.querySelector('[data-open-app]')!.dispatchEvent(new MouseEvent('click'))
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe(variant.language)
      expect(localStorage.getItem(STORAGE_KEY)).toBe(recipes)
    })
  }

  it('leaves app links usable when preference storage is denied', () => {
    const page = new DOMParser().parseFromString(read('about/en/index.html'), 'text/html')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Denied')
    })
    runInNewContext(script, { document: page, localStorage, console })
    const click = new MouseEvent('click', { cancelable: true })
    page.querySelector('[data-open-app]')!.dispatchEvent(click)
    expect(warn).toHaveBeenCalledOnce()
    expect(click.defaultPrevented).toBe(false)
  })
})
