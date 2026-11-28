import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import App from '../src/App'
import { LOG_STORAGE_KEY, readBrewLogs, saveBrewLog } from '../src/brewLogs'
import { advanceBrew, createBrewSession } from '../src/brewSession'
import { sampleRecipes, STORAGE_KEY } from '../src/recipes'

const recipe = {
  ...sampleRecipes[0],
  name: '実測テスト',
  tasks: sampleRecipes[0].tasks.slice(0, 2),
}
const routers: ReturnType<typeof createMemoryRouter>[] = []
function renderApp(initialEntries = ['/'], strict = false) {
  const router = createMemoryRouter([{ path: '*', Component: App }], { initialEntries })
  routers.push(router)
  const provider = <RouterProvider router={router} />
  const view = render(strict ? <StrictMode>{provider}</StrictMode> : provider)
  return { router, view }
}

async function storedLog() {
  const session = createBrewSession(recipe, Date.parse('2026-11-28T00:00:00Z'))
  advanceBrew(session, session.startedAt + 40_000)
  await saveBrewLog(session.log!)
  return session.log!
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([recipe]))
  vi.stubGlobal('AudioContext', undefined)
})
afterEach(() => {
  cleanup()
  routers.splice(0).forEach((router) => router.dispose())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('brew history', () => {
  it('shows and saves actual steps, then creates a recipe using the measured durations', async () => {
    vi.useFakeTimers()
    renderApp(['/recipes/house-blend'])
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '抽出開始' })))
    act(() => vi.advanceTimersByTime(2500))
    fireEvent.click(screen.getByRole('button', { name: '一時停止' }))
    act(() => vi.advanceTimersByTime(3500))
    fireEvent.click(screen.getByRole('button', { name: 'スキップ' }))
    act(() => vi.advanceTimersByTime(1500))
    fireEvent.click(screen.getByRole('button', { name: '再開する' }))
    await act(async () => vi.advanceTimersByTime(30_000))
    expect(screen.getByRole('heading', { name: '実際の抽出手順' })).toBeTruthy()
    expect(screen.getByText('抽出時間：37.5 秒（一時停止を含む）')).toBeTruthy()
    const steps = screen.getAllByRole('listitem')
    expect(
      within(steps[0]).getByText(/実行 2.5 秒 · 一時停止 3.5 秒 · スキップで終了/),
    ).toBeTruthy()
    expect(within(steps[1]).getByText(/実行 30 秒 · 一時停止 1.5 秒/)).toBeTruthy()
    expect(readBrewLogs()).toHaveLength(1)
    const log = readBrewLogs()[0]
    expect(log.recipe.name).toBe(recipe.name)
    expect(log.steps[0]).toMatchObject({ activeMs: 2500, pausedMs: 3500, skipped: true })

    fireEvent.click(screen.getByRole('button', { name: 'ホームに戻る' }))
    fireEvent.click(screen.getByRole('button', { name: '設定' }))
    fireEvent.click(screen.getByRole('button', { name: '抽出記録を見る' }))
    fireEvent.click(screen.getByRole('button', { name: /実測テスト/ }))
    expect(screen.getByRole('heading', { name: '実測テスト' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'レシピとして保存' }))
    const groups = screen.getAllByRole('group')
    expect(within(groups[0]).getByLabelText<HTMLInputElement>('時間（秒）').value).toBe('6')
    expect(within(groups[1]).getByLabelText<HTMLInputElement>('時間（秒）').value).toBe('32')
    fireEvent.change(screen.getByLabelText('レシピ名'), { target: { value: '実測から作成' } })
    fireEvent.click(screen.getByRole('button', { name: 'レシピを保存' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved).toHaveLength(2)
    expect(saved[0]).toEqual(recipe)
    expect(saved[1].tasks.map((task: { seconds: number }) => task.seconds)).toEqual([6, 32])
    expect(saved[1].id).not.toBe(recipe.id)
    expect(readBrewLogs()[0]).toEqual(log)
  })

  it('restores log details after reload even if the original recipe was deleted', async () => {
    const log = await storedLog()
    localStorage.setItem(STORAGE_KEY, '[]')
    const { router, view } = renderApp([`/logs/${log.id}`])
    expect(screen.getByRole('heading', { name: recipe.name })).toBeTruthy()
    expect(screen.getByText(/開始：/).querySelector('time')?.dateTime).toBe(log.startedAt)
    fireEvent.click(screen.getByRole('button', { name: '記録一覧に戻る' }))
    expect(router.state.location.pathname).toBe('/logs')
    await act(async () => router.navigate(-1))
    expect(screen.getByRole('heading', { name: recipe.name })).toBeTruthy()
    view.unmount()
    renderApp([`/logs/${log.id}`])
    expect(screen.getByRole('heading', { name: recipe.name })).toBeTruthy()
  })

  it('shows an empty list and explains missing or unreadable logs', async () => {
    const { router } = renderApp(['/logs'])
    expect(screen.getByText('抽出記録はまだありません。')).toBeTruthy()
    await act(async () => router.navigate('/logs/missing'))
    expect(screen.getByRole('heading', { name: '抽出記録が見つかりません' })).toBeTruthy()
    cleanup()
    localStorage.setItem(LOG_STORAGE_KEY, 'broken')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderApp(['/logs'])
    expect(screen.getByRole('alert').textContent).toContain('抽出記録を読み込めませんでした')
    expect(localStorage.getItem(LOG_STORAGE_KEY)).toBe('broken')
  })

  it('allows retrying failed saves from completion without losing measured steps', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    renderApp(['/recipes/house-blend'])
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '抽出開始' })))
    await act(async () => vi.advanceTimersByTime(40_000))
    expect(
      screen
        .getAllByRole('alert')
        .some((alert) => alert.textContent?.includes('抽出記録を保存できませんでした')),
    ).toBe(true)
    expect(screen.getByRole('heading', { name: '実際の抽出手順' })).toBeTruthy()
    setItem.mockRestore()
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: '記録の保存を再試行' })),
    )
    expect(screen.queryByRole('button', { name: '記録の保存を再試行' })).toBeNull()
    expect(readBrewLogs()).toHaveLength(1)
  })

  it('does not save unfinished or cancelled brews', async () => {
    vi.useFakeTimers()
    renderApp(['/recipes/house-blend'])
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '抽出開始' })))
    act(() => vi.advanceTimersByTime(2500))
    expect(readBrewLogs()).toHaveLength(0)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: '抽出を中止' }))
    expect(readBrewLogs()).toHaveLength(0)
  })

  it('saves only one log when completion effects run twice in StrictMode', async () => {
    vi.useFakeTimers()
    renderApp(['/recipes/house-blend'], true)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '抽出開始' })))
    await act(async () => vi.advanceTimersByTime(40_000))
    expect(readBrewLogs()).toHaveLength(1)
    expect(screen.getByRole('heading', { name: '美味しいコーヒーをどうぞ。' })).toBeTruthy()
  })
})
