import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import App from '../src/App'
import { Brew } from '../src/Brew'
import { ScreenAwake } from '../src/ScreenAwake'
import { keepScreenAwake } from '../src/screenWakeLock'
import { sampleRecipes } from '../src/recipes'

class FakeLock extends EventTarget {
  released = false
  release = vi.fn(async () => {
    this.released = true
    this.dispatchEvent(new Event('release'))
  })
}

const routers: ReturnType<typeof createMemoryRouter>[] = []
function renderApp() {
  const router = createMemoryRouter([{ path: '*', Component: App }])
  routers.push(router)
  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
})
afterEach(() => {
  cleanup()
  routers.splice(0).forEach((router) => router.dispose())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('screen wake lock', () => {
  it('prevents screen off on recipe details and releases when going home or editing', async () => {
    const locks: FakeLock[] = []
    const request = vi.fn(async () => {
      const lock = new FakeLock()
      locks.push(lock)
      return lock
    })
    vi.stubGlobal('navigator', { wakeLock: { request } })
    renderApp()
    expect(request).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: sampleRecipes[0].name }))
    await act(async () => {})
    expect(locks[0].release).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('link', { name: 'ホーム' }))
    expect(locks[0].release).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: sampleRecipes[0].name }))
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    expect(locks[1].release).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('keeps preventing screen off through brewing and reacquires on returning to the recipe', async () => {
    const locks: FakeLock[] = []
    const request = vi.fn(async () => {
      const lock = new FakeLock()
      locks.push(lock)
      return lock
    })
    vi.stubGlobal('navigator', { wakeLock: { request } })
    vi.stubGlobal('AudioContext', undefined)
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: sampleRecipes[0].name }))
    await act(async () => {})
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '抽出開始' })))
    expect(screen.getByRole('timer')).toBeTruthy()
    expect(locks[0].release).toHaveBeenCalledOnce()
    expect(locks[1].release).not.toHaveBeenCalled()
    for (const _task of sampleRecipes[0].tasks) {
      fireEvent.click(screen.getByRole('button', { name: 'スキップ' }))
    }
    expect(locks[1].release).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'レシピに戻る' }))
    await act(async () => {})
    expect(locks[2].release).not.toHaveBeenCalled()
    expect(request).toHaveBeenCalledTimes(3)
  })

  it('requests screen wake lock and releases it after use', async () => {
    const lock = new FakeLock()
    const request = vi.fn(async () => lock)
    vi.stubGlobal('navigator', { wakeLock: { request } })
    const stop = keepScreenAwake()
    await Promise.resolve()
    expect(request).toHaveBeenCalledWith('screen')
    stop()
    expect(lock.release).toHaveBeenCalledOnce()
  })

  it('reacquires the lock when the visible tab returns after automatic release', async () => {
    const first = new FakeLock()
    const second = new FakeLock()
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    vi.stubGlobal('navigator', { wakeLock: { request } })
    const stop = keepScreenAwake()
    await Promise.resolve()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await first.release()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(request).toHaveBeenCalledTimes(1)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    stop()
    expect(second.release).toHaveBeenCalledOnce()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('releases a pending request if the timer has already ended', async () => {
    let finish: (lock: FakeLock) => void = () => {
      throw new Error('No pending request')
    }
    const request = vi.fn(
      () =>
        new Promise<FakeLock>((resolve) => {
          finish = resolve
        }),
    )
    vi.stubGlobal('navigator', { wakeLock: { request } })
    const stop = keepScreenAwake()
    stop()
    const lock = new FakeLock()
    finish(lock)
    await waitFor(() => expect(lock.release).toHaveBeenCalledOnce())
  })

  it('renders no notice when the API is unavailable', () => {
    vi.stubGlobal('navigator', {})
    const { container } = render(<ScreenAwake />)
    expect(container.childNodes).toHaveLength(0)
  })

  it('logs a denied request without rendering a notice', async () => {
    const error = new DOMException('Power saving mode', 'NotAllowedError')
    vi.stubGlobal('navigator', { wakeLock: { request: vi.fn().mockRejectedValue(error) } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<ScreenAwake />)
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('Could not acquire screen wake lock', error),
    )
    expect(container.childNodes).toHaveLength(0)
  })

  it('renders no notice while requesting or holding the lock', async () => {
    const lock = new FakeLock()
    let finish!: (lock: FakeLock) => void
    const request = vi.fn(() => new Promise<FakeLock>((resolve) => {
      finish = resolve
    }))
    vi.stubGlobal('navigator', { wakeLock: { request } })
    const { container, unmount } = render(<ScreenAwake />)
    expect(container.childNodes).toHaveLength(0)
    await act(async () => finish(lock))
    expect(container.childNodes).toHaveLength(0)
    unmount()
    expect(lock.release).toHaveBeenCalledOnce()
  })

  it('holds the lock while paused and releases it on completion', async () => {
    const lock = new FakeLock()
    const request = vi.fn(async () => lock)
    vi.stubGlobal('navigator', { wakeLock: { request } })
    render(<Brew recipe={sampleRecipes[0]} audio={null} onExit={vi.fn()} onHome={vi.fn()} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: '一時停止' }))
    expect(lock.release).not.toHaveBeenCalled()
    for (const _task of sampleRecipes[0].tasks) {
      fireEvent.click(screen.getByRole('button', { name: 'スキップ' }))
    }
    expect(screen.getByRole('heading', { name: '美味しいコーヒーをどうぞ。' })).toBeTruthy()
    expect(lock.release).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledOnce()
  })

  it('releases the lock when the timer screen unmounts', async () => {
    const lock = new FakeLock()
    vi.stubGlobal('navigator', { wakeLock: { request: vi.fn(async () => lock) } })
    const view = render(
      <Brew recipe={sampleRecipes[0]} audio={null} onExit={vi.fn()} onHome={vi.fn()} />,
    )
    await act(async () => {})
    act(() => view.unmount())
    expect(lock.release).toHaveBeenCalledOnce()
  })
})
