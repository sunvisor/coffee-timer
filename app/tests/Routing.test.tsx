import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHashRouter, createMemoryRouter, RouterProvider } from 'react-router-dom'
import App from '../src/App'
import { sampleRecipes, STORAGE_KEY } from '../src/recipes'

const routers: ReturnType<typeof createMemoryRouter>[] = []
function renderApp(initialEntries = ['/']) {
  const router = createMemoryRouter([{ path: '*', Component: App }], { initialEntries })
  routers.push(router)
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  routers.splice(0).forEach((router) => router.dispose())
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('screen routing', () => {
  it('uses browser back and forward to move between recipe and settings screens', async () => {
    const router = renderApp()
    expect(screen.getByRole('banner')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: sampleRecipes[0].name }))
    expect(router.state.location.pathname).toBe('/recipes/house-blend')
    expect(screen.queryByRole('banner')).toBeNull()
    await act(async () => {
      await router.navigate('/settings')
    })
    expect(router.state.location.pathname).toBe('/settings')
    expect(screen.queryByRole('banner')).toBeNull()
    await act(async () => {
      await router.navigate(-1)
    })
    expect(screen.getByRole('heading', { name: sampleRecipes[0].name })).toBeTruthy()
    await act(async () => {
      await router.navigate(1)
    })
    expect(screen.getByRole('heading', { name: '設定' })).toBeTruthy()
    await act(async () => {
      await router.navigate(-2)
    })
    expect(screen.getByRole('heading', { name: /マイレシピ/ })).toBeTruthy()
    expect(screen.getByRole('banner')).toBeTruthy()
  })

  it('restores saved recipes from direct URLs and handles missing recipes', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleRecipes))
    const router = renderApp(['/recipes/house-blend/edit'])
    expect(screen.getByLabelText<HTMLInputElement>('レシピ名').value).toBe(sampleRecipes[0].name)
    await act(async () => {
      await router.navigate('/recipes/missing')
    })
    expect(screen.getByRole('heading', { name: 'ページが見つかりません' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ホームに戻る' }))
    expect(screen.getByRole('heading', { name: /マイレシピ/ })).toBeTruthy()
  })

  it('replaces a new recipe form with its saved detail route', async () => {
    const router = renderApp()
    fireEvent.click(screen.getByRole('button', { name: /新しいレシピを作る/ }))
    expect(router.state.location.pathname).toBe('/new')
    fireEvent.change(screen.getByLabelText('レシピ名'), { target: { value: '新しい一杯' } })
    fireEvent.click(screen.getByRole('button', { name: 'レシピを保存' }))
    expect(screen.getByRole('heading', { name: '新しい一杯' })).toBeTruthy()
    expect(router.state.location.pathname).toMatch(/^\/recipes\//)
    await act(async () => {
      await router.navigate(-1)
    })
    expect(screen.getByRole('heading', { name: /マイレシピ/ })).toBeTruthy()
  })

  it('returns to the recipe when reloading a timer URL without a live session', async () => {
    const router = renderApp(['/recipes/house-blend/brew'])
    await waitFor(() => expect(router.state.location.pathname).toBe('/recipes/house-blend'))
    expect(screen.getByRole('button', { name: '抽出開始' })).toBeTruthy()
    expect(screen.queryByRole('timer')).toBeNull()
  })

  it('keeps a running timer alive when browser history navigation is attempted', async () => {
    vi.useFakeTimers()
    const router = renderApp(['/', '/recipes/house-blend'])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '抽出開始' }))
    })
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('timer').textContent).toBe('00:09')
    await act(async () => {
      await router.navigate(-1)
    })
    expect(router.state.location.pathname).toBe('/recipes/house-blend/brew')
    expect(screen.getByRole('timer').textContent).toBe('00:09')
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('timer').textContent).toBe('00:08')
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: '抽出を中止' }))
    expect(router.state.location.pathname).toBe('/recipes/house-blend')
    expect(screen.getByRole('button', { name: '抽出開始' })).toBeTruthy()
    const afterStop = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(afterStop)
    expect(afterStop.defaultPrevented).toBe(false)
  })

  it('updates actual URL fragments and responds to browser history', async () => {
    window.history.replaceState(null, '', '/#/')
    const router = createHashRouter([{ path: '*', Component: App }])
    routers.push(router)
    render(<RouterProvider router={router} />)
    fireEvent.click(screen.getByRole('button', { name: sampleRecipes[0].name }))
    expect(window.location.hash).toBe('#/recipes/house-blend')
    act(() => window.history.back())
    await waitFor(() => expect(screen.getByRole('heading', { name: /マイレシピ/ })).toBeTruthy())
    act(() => window.history.forward())
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: sampleRecipes[0].name })).toBeTruthy(),
    )
  })

  it('rolls back a browser back gesture without remounting the active timer', async () => {
    window.history.replaceState(null, '', '/#/')
    const router = createHashRouter([{ path: '*', Component: App }])
    routers.push(router)
    render(<RouterProvider router={router} />)
    fireEvent.click(screen.getByRole('button', { name: sampleRecipes[0].name }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '抽出開始' }))
    })
    const timer = screen.getByRole('timer')
    await act(async () => {
      const popped = new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }))
      window.history.back()
      await popped
    })
    await waitFor(() => expect(window.location.hash).toBe('#/recipes/house-blend/brew'))
    expect(screen.getByRole('timer')).toBe(timer)
  })
})
