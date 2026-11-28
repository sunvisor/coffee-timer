import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from '../src/App'
import {
  errorText,
  getLanguage,
  languages,
  LANGUAGE_STORAGE_KEY,
  numberText,
  setLanguage,
  translate,
  TranslationError,
} from '../src/i18n'
import { durationText, LOG_STORAGE_KEY, logDate, readBrewLogs, saveBrewLog } from '../src/brewLogs'
import { advanceBrew, createBrewSession } from '../src/brewSession'
import { parseRecipes, sampleRecipes, STORAGE_KEY } from '../src/recipes'

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn(() => vi.fn()) }))
const routers: ReturnType<typeof createMemoryRouter>[] = []
function renderApp(initialEntries = ['/']) {
  const router = createMemoryRouter([{ path: '*', Component: App }], { initialEntries })
  routers.push(router)
  return render(<RouterProvider router={router} />)
}
const placeholders = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

beforeEach(() => {
  localStorage.clear()
  setLanguage('ja')
  vi.stubGlobal('AudioContext', undefined)
})
afterEach(() => {
  cleanup()
  routers.splice(0).forEach((router) => router.dispose())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  setLanguage('ja')
  localStorage.clear()
})

describe('translation catalogs', () => {
  it('provides every key and the same placeholders in all registered languages', () => {
    for (const { messages } of Object.values(languages)) {
      expect(Object.keys(messages).sort()).toEqual(Object.keys(languages.ja.messages).sort())
      for (const [key, source] of Object.entries(languages.ja.messages)) {
        const message = messages[key as keyof typeof messages]
        expect(message.trim()).not.toBe('')
        expect(placeholders(message)).toEqual(placeholders(source))
      }
    }
  })

  it('formats parameters without interpreting user text as a key, template, or HTML', () => {
    setLanguage('en')
    const name = '<b>{count}</b>'
    expect(translate('order.up', { name })).toBe(`Move ${name} up`)
    expect(() => translate('order.up')).toThrow('Missing translation parameter')
    expect(numberText(1234.5)).toBe('1,234.5')
    expect(durationText(12_500)).toBe('12.5 s')
    expect(logDate('2026-11-28T00:00:00Z')).toBe(
      new Date('2026-11-28T00:00:00Z').toLocaleString('en-US', { hour12: false }),
    )
  })

  it('translates stored error codes in the current language', () => {
    let error: unknown
    try {
      parseRecipes([{ name: 'invalid' }])
    } catch (reason) {
      error = reason
    }
    expect(error).toBeInstanceOf(TranslationError)
    expect(errorText(error, 'import.failed')).toContain('レシピの形式')
    setLanguage('en')
    expect(errorText(error, 'import.failed')).toContain('Invalid recipe data')
    expect(errorText(new Error('internal'), 'import.failed')).toBe('Could not read the file.')
  })

  it('loads saved language on a fresh module load and falls back for unsupported values', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    vi.resetModules()
    expect((await import('../src/i18n')).getLanguage()).toBe('en')
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'unsupported')
    vi.resetModules()
    expect((await import('../src/i18n')).getLanguage()).toBe('ja')
  })
})

describe('language settings', () => {
  it('switches immediately, persists the choice, updates metadata and localizes the unsaved sample', () => {
    const view = renderApp()
    fireEvent.click(screen.getByRole('button', { name: '設定' }))
    fireEvent.change(screen.getByLabelText('言語'), { target: { value: 'en' } })
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(screen.getByRole('link', { name: 'About this app' }).getAttribute('href')).toBe(
      '/about/en/',
    )
    expect(document.title).toContain('A little ritual')
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    fireEvent.click(screen.getByRole('button', { name: 'Everyday pour-over (Sample)' }))
    expect(
      screen.getByText('Wet all the grounds, pouring in small circles from the center.'),
    ).toBeTruthy()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    view.unmount()
    renderApp(['/settings'])
    expect(screen.getByLabelText<HTMLSelectElement>('Language').value).toBe('en')
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'ja' } })
    expect(document.documentElement.lang).toBe('ja')
    expect(screen.getByRole('link', { name: 'このアプリについて' }).getAttribute('href')).toBe(
      '/about/',
    )
    expect(screen.getByRole('heading', { name: '設定' })).toBeTruthy()
  })

  it('keeps saved recipes unchanged and handles English editing, warnings, and ordering', () => {
    const stored = JSON.stringify(sampleRecipes)
    localStorage.setItem(STORAGE_KEY, stored)
    setLanguage('en')
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: sampleRecipes[0].name }))
    expect(screen.getByRole('button', { name: 'Start brewing' })).toBeTruthy()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(stored)
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    fireEvent.click(screen.getByRole('button', { name: /Create a recipe/ }))
    fireEvent.change(screen.getByLabelText('Recipe name'), { target: { value: 'English test' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Add step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move step 2 up' }))
    expect(screen.getByRole('status').textContent).toContain('Water amounts do not match')
    expect(screen.getByLabelText('Coffee (g)')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save recipe' }))
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move English test up' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save order' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0].name).toBe('English test')
  })

  it('updates an open editor across tabs without discarding its draft', () => {
    renderApp(['/new'])
    fireEvent.change(screen.getByLabelText('レシピ名'), { target: { value: '入力途中' } })
    act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', { key: LANGUAGE_STORAGE_KEY, newValue: 'en' }),
      ),
    )
    expect(screen.getByLabelText<HTMLInputElement>('Recipe name').value).toBe('入力途中')
    expect(screen.getByRole('button', { name: 'Save recipe' })).toBeTruthy()
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null })))
    expect(screen.getByLabelText<HTMLInputElement>('レシピ名').value).toBe('入力途中')
  })

  it('reports a failed preference save and retains the current language', () => {
    renderApp(['/settings'])
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Denied')
    })
    fireEvent.change(screen.getByLabelText('言語'), { target: { value: 'en' } })
    expect(screen.getByRole('alert').textContent).toContain('言語設定を保存できませんでした')
    expect(screen.getByLabelText<HTMLSelectElement>('言語').value).toBe('ja')
    expect(getLanguage()).toBe('ja')
  })

  it('translates import validation and status without losing the pending import', async () => {
    renderApp(['/settings'])
    fireEvent.change(screen.getByLabelText('レシピファイル'), {
      target: { files: [{ size: 10, text: async () => '[{"name":"invalid"}]' }] },
    })
    await screen.findByRole('alert')
    fireEvent.change(screen.getByLabelText('言語'), { target: { value: 'en' } })
    expect(screen.getByRole('alert').textContent).toContain('Invalid recipe data')
    fireEvent.change(screen.getByLabelText('Recipe file'), {
      target: {
        files: [
          { size: 100, name: 'recipes.json', text: async () => JSON.stringify(sampleRecipes) },
        ],
      },
    })
    await screen.findByRole('group', { name: 'Import mode' })
    expect(screen.getByRole('radio', { name: /Add to current recipes/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add recipes (1)' }))
    expect(screen.getByRole('status').textContent).toBe('Recipes added: 1. Total: 2.')
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'ja' } })
    expect(screen.getByRole('status').textContent).toBe(
      '1 件を追加しました。合計 2 件になりました。',
    )
  })

  it('translates the running timer across tabs without restarting it, then saves and shows a record', async () => {
    vi.useFakeTimers()
    renderApp(['/recipes/house-blend'])
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '抽出開始' })))
    act(() => vi.advanceTimersByTime(2000))
    const timer = screen.getByRole('timer')
    act(() => setLanguage('en'))
    expect(screen.getByRole('timer')).toBe(timer)
    expect(timer.textContent).toBe('00:08')
    expect(screen.getByRole('alert').textContent).toContain('Could not enable the tones')
    expect(screen.getByText('Overall 00:02 / 02:30')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    await act(async () => {
      for (const _task of sampleRecipes[0].tasks)
        fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    })
    expect(screen.getByRole('heading', { name: 'Enjoy your coffee.' })).toBeTruthy()
    expect(screen.getByText('Brew time: 2 s (including pauses)')).toBeTruthy()
    expect(screen.getAllByText(/Ended by skipping/)).toHaveLength(sampleRecipes[0].tasks.length)
    expect(readBrewLogs()).toHaveLength(1)
    expect(readBrewLogs()[0].recipe.name).toBe(sampleRecipes[0].name)
  })

  it('localizes existing record details and recipe conversion without changing stored snapshots', async () => {
    const session = createBrewSession(sampleRecipes[0], Date.parse('2026-11-28T00:00:00Z'))
    advanceBrew(session, session.startedAt + 150_000)
    await saveBrewLog(session.log!)
    const saved = localStorage.getItem(LOG_STORAGE_KEY)
    setLanguage('en')
    renderApp(['/settings'])
    fireEvent.click(screen.getByRole('button', { name: 'View brew records' }))
    fireEvent.click(screen.getByRole('button', { name: /いつものハンドドリップ/ }))
    expect(screen.getByRole('heading', { name: 'Actual brewing steps' })).toBeTruthy()
    expect(screen.getByText(/Started:/).querySelector('time')?.textContent).toBe(
      logDate(session.log!.startedAt),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save as recipe' }))
    expect(screen.getByLabelText<HTMLInputElement>('Recipe name').value).toContain('(brew record)')
    expect(within(screen.getAllByRole('group')[0]).getByLabelText('Time (seconds)')).toBeTruthy()
    expect(localStorage.getItem(LOG_STORAGE_KEY)).toBe(saved)
  })

  it('localizes update prompts and missing pages', async () => {
    setLanguage('en')
    const view = renderApp()
    act(() => vi.mocked(registerSW).mock.calls.at(-1)![0]?.onNeedRefresh?.())
    expect(screen.getByRole('button', { name: 'Update' })).toBeTruthy()
    view.unmount()
    renderApp(['/recipes/missing'])
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeTruthy()
  })
})
