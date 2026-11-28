import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import App from '../src/App'
import { setLanguage } from '../src/i18n'
import { sampleRecipes } from '../src/recipes'
import { advanceBrew, createBrewSession } from '../src/brewSession'
import { saveBrewLog } from '../src/brewLogs'

const routers: ReturnType<typeof createMemoryRouter>[] = []
function renderApp(path = '/') {
  const router = createMemoryRouter([{ path: '*', Component: App }], { initialEntries: [path] })
  routers.push(router)
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  routers.splice(0).forEach((router) => router.dispose())
  setLanguage('ja')
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('breadcrumb navigation', () => {
  it('shows the settings hierarchy with one current page and links to each parent', () => {
    const router = renderApp('/logs')
    const nav = screen.getByRole('navigation', { name: 'パンくずリスト' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['ホーム', '設定'])
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('抽出記録')
    expect(within(nav).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'ホームに戻る' })).toBeNull()
    expect(screen.queryByRole('button', { name: '設定に戻る' })).toBeNull()
    fireEvent.click(within(nav).getByRole('link', { name: '設定' }))
    expect(router.state.location.pathname).toBe('/settings')
    expect(screen.getByRole('heading', { name: '設定' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'ホーム' }))
    expect(router.state.location.pathname).toBe('/')
    expect(screen.queryByRole('navigation', { name: 'パンくずリスト' })).toBeNull()
  })

  it('links from a record detail to both the list and settings', async () => {
    const session = createBrewSession(sampleRecipes[0], Date.now())
    advanceBrew(session, session.startedAt + 150_000)
    await saveBrewLog(session.log!)
    const router = renderApp(`/logs/${session.id}`)
    const nav = screen.getByRole('navigation', { name: 'パンくずリスト' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['ホーム', '設定', '抽出記録'])
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('記録の詳細')
    fireEvent.click(within(nav).getByRole('link', { name: '抽出記録' }))
    expect(router.state.location.pathname).toBe('/logs')
    expect(screen.getByRole('heading', { name: '抽出記録' })).toBeTruthy()
  })

  it('localizes breadcrumbs and links recipe editing to its saved recipe', () => {
    setLanguage('en')
    const router = renderApp('/recipes/house-blend/edit')
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('Edit recipe')
    fireEvent.click(within(nav).getByRole('link', { name: 'Everyday pour-over (Sample)' }))
    expect(router.state.location.pathname).toBe('/recipes/house-blend')
    expect(screen.getByRole('button', { name: 'Start brewing' })).toBeTruthy()
  })

  it('keeps breadcrumbs off the active timer', async () => {
    vi.stubGlobal('AudioContext', undefined)
    renderApp('/recipes/house-blend')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '抽出開始' })))
    expect(screen.getByRole('timer')).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'パンくずリスト' })).toBeNull()
  })
})
