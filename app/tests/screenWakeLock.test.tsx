import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Brew } from '../src/Brew'
import { ScreenAwakeNotice } from '../src/ScreenAwakeNotice'
import { keepScreenAwake } from '../src/screenWakeLock'
import { sampleRecipes } from '../src/recipes'

class FakeLock extends EventTarget {
  released = false
  release = vi.fn(async () => {
    this.released = true
    this.dispatchEvent(new Event('release'))
  })
}

beforeEach(() => vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible'))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('screen wake lock', () => {
  it('requests screen wake lock and releases it after use', async () => {
    const lock = new FakeLock()
    const request = vi.fn(async () => lock)
    vi.stubGlobal('navigator', { wakeLock: { request } })
    const onStatus = vi.fn()
    const stop = keepScreenAwake(onStatus)
    await waitFor(() => expect(onStatus).toHaveBeenLastCalledWith('active'))
    expect(request).toHaveBeenCalledWith('screen')
    stop()
    expect(lock.release).toHaveBeenCalledOnce()
  })

  it('reacquires the lock when the visible tab returns after automatic release', async () => {
    const first = new FakeLock()
    const second = new FakeLock()
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    vi.stubGlobal('navigator', { wakeLock: { request } })
    const onStatus = vi.fn()
    const stop = keepScreenAwake(onStatus)
    await waitFor(() => expect(onStatus).toHaveBeenLastCalledWith('active'))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await first.release()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(request).toHaveBeenCalledTimes(1)
    expect(onStatus).toHaveBeenLastCalledWith('released')
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(onStatus).toHaveBeenLastCalledWith('active'))
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
    const onStatus = vi.fn()
    const stop = keepScreenAwake(onStatus)
    stop()
    const lock = new FakeLock()
    finish(lock)
    await waitFor(() => expect(lock.release).toHaveBeenCalledOnce())
    expect(onStatus).not.toHaveBeenCalledWith('active')
  })

  it('shows an explanation when the API is unavailable', () => {
    vi.stubGlobal('navigator', {})
    render(<ScreenAwakeNotice />)
    expect(screen.getByText(/この環境では画面オフを防止できません/)).toBeTruthy()
  })

  it('shows an explanation when the device denies the request', async () => {
    const error = new DOMException('Power saving mode', 'NotAllowedError')
    vi.stubGlobal('navigator', { wakeLock: { request: vi.fn().mockRejectedValue(error) } })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<ScreenAwakeNotice />)
    expect(await screen.findByText(/画面オフを防止できませんでした/)).toBeTruthy()
    expect(warn).toHaveBeenCalledWith('Could not acquire screen wake lock', error)
  })

  it('holds the lock while paused and releases it on completion', async () => {
    const lock = new FakeLock()
    const request = vi.fn(async () => lock)
    vi.stubGlobal('navigator', { wakeLock: { request } })
    render(<Brew recipe={sampleRecipes[0]} audio={null} onExit={vi.fn()} onHome={vi.fn()} />)
    await screen.findByText('抽出中は画面が自動でオフにならないようにしています。')
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
    await screen.findByText('抽出中は画面が自動でオフにならないようにしています。')
    act(() => view.unmount())
    expect(lock.release).toHaveBeenCalledOnce()
  })
})
