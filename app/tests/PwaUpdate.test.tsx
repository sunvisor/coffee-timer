import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { usePwaUpdate } from '../src/usePwaUpdate'
import App from '../src/App'
import { sampleRecipes } from '../src/recipes'

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn() }))
const applyUpdate = vi.fn<() => Promise<void>>()
const reload = vi.fn()
const routers: ReturnType<typeof createMemoryRouter>[] = []
const options = () => vi.mocked(registerSW).mock.calls.at(-1)![0]!

function createRegistration(update: () => Promise<void>) {
  vi.stubGlobal('ServiceWorkerRegistration', class { update = update })
  return new ServiceWorkerRegistration()
}

beforeEach(() => {
  localStorage.clear()
  applyUpdate.mockReset().mockResolvedValue(undefined)
  reload.mockReset()
  vi.mocked(registerSW).mockReset().mockReturnValue(applyUpdate)
  vi.stubGlobal('window', new Proxy(window, {
    get: (target, key) => key === 'location' ? { reload } : Reflect.get(target, key),
  }))
})
afterEach(() => {
  cleanup()
  routers.splice(0).forEach((router) => router.dispose())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('PWA update lifecycle', () => {
  it('checks every minute while visible and online and stops after unmount', async () => {
    vi.useFakeTimers()
    const check = vi.fn().mockResolvedValue(undefined)
    const { unmount } = renderHook(() => usePwaUpdate(true))
    await act(async () => options().onRegisteredSW?.('/sw.js', createRegistration(check)))
    expect(check).toHaveBeenCalledOnce()
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(check).toHaveBeenCalledTimes(2)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(check).toHaveBeenCalledTimes(2)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(check).toHaveBeenCalledTimes(2)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    unmount()
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(check).toHaveBeenCalledTimes(2)
  })

  it('checks on registration, foreground resume, page restore, and reconnect, then cleans up', async () => {
    const check = vi.fn().mockResolvedValue(undefined)
    const { unmount } = renderHook(() => usePwaUpdate(true))
    const registration = createRegistration(check)
    await act(async () => options().onRegisteredSW?.('/sw.js', registration))
    expect(check).toHaveBeenCalledTimes(1)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(check).toHaveBeenCalledTimes(1)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('pageshow'))
    window.dispatchEvent(new Event('online'))
    expect(check).toHaveBeenCalledTimes(4)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    window.dispatchEvent(new Event('pageshow'))
    expect(check).toHaveBeenCalledTimes(4)
    unmount()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    window.dispatchEvent(new Event('pageshow'))
    expect(check).toHaveBeenCalledTimes(4)
  })

  it('waits for user approval and worker activation before reloading', async () => {
    const { result } = renderHook(() => usePwaUpdate(true))
    act(() => options().onNeedRefresh?.())
    expect(result.current.ready).toBe(true)
    expect(reload).not.toHaveBeenCalled()
    await act(async () => result.current.apply())
    expect(applyUpdate).toHaveBeenCalledOnce()
    expect(reload).not.toHaveBeenCalled()
    act(() => options().onNeedReload?.())
    expect(reload).toHaveBeenCalledOnce()
  })

  it('defers an approved reload if the user leaves home while activation is pending', async () => {
    const { result, rerender } = renderHook(({ safe }) => usePwaUpdate(safe), {
      initialProps: { safe: true },
    })
    act(() => options().onNeedRefresh?.())
    await act(async () => result.current.apply())
    rerender({ safe: false })
    act(() => options().onNeedReload?.())
    expect(reload).not.toHaveBeenCalled()
    rerender({ safe: true })
    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not reload or apply while brewing or editing, including updates from another tab', async () => {
    const { result, rerender } = renderHook(({ safe }) => usePwaUpdate(safe), {
      initialProps: { safe: false },
    })
    act(() => options().onNeedReload?.())
    await act(async () => result.current.apply())
    expect(applyUpdate).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
    rerender({ safe: true })
    expect(reload).not.toHaveBeenCalled()
    await act(async () => result.current.apply())
    expect(reload).toHaveBeenCalledOnce()
  })

  it('reports an update failure and allows retrying', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    applyUpdate.mockRejectedValueOnce(new Error('Network error'))
    const { result } = renderHook(() => usePwaUpdate(true))
    act(() => options().onNeedRefresh?.())
    await act(async () => result.current.apply())
    expect(result.current.error).toContain('更新できませんでした')
    expect(result.current.applying).toBe(false)
    await act(async () => result.current.apply())
    expect(applyUpdate).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBe('')
  })

  it('logs a background check failure without breaking the running app', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const registration = createRegistration(vi.fn().mockRejectedValue(new Error('Offline')))
    const { result } = renderHook(() => usePwaUpdate(false))
    await act(async () => options().onRegisteredSW?.('/sw.js', registration))
    expect(warn).toHaveBeenCalledOnce()
    expect(result.current.ready).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})

describe('PWA update notice', () => {
  function renderApp() {
    const router = createMemoryRouter([{ path: '*', Component: App }])
    routers.push(router)
    render(<RouterProvider router={router} />)
  }

  it('shows the update button only at home, including after returning from brewing', async () => {
    renderApp()
    act(() => options().onNeedRefresh?.())
    expect(screen.getByRole('button', { name: '更新する' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: sampleRecipes[0].name }))
    expect(screen.queryByRole('button', { name: '更新する' })).toBeNull()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '抽出開始' })))
    act(() => options().onNeedReload?.())
    expect(screen.getByRole('timer')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '更新する' })).toBeNull()
    expect(reload).not.toHaveBeenCalled()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: '抽出を中止' }))
    fireEvent.click(screen.getByRole('button', { name: 'ホームに戻る' }))
    fireEvent.click(screen.getByRole('button', { name: '更新する' }))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('keeps editing input intact when a new worker activates', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: /新しいレシピを作る/ }))
    fireEvent.change(screen.getByLabelText('レシピ名'), { target: { value: '入力途中' } })
    act(() => options().onNeedReload?.())
    expect(screen.getByLabelText<HTMLInputElement>('レシピ名').value).toBe('入力途中')
    expect(screen.queryByRole('button', { name: '更新する' })).toBeNull()
    expect(reload).not.toHaveBeenCalled()
  })
})
