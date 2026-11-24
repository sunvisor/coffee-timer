import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import App from '../src/App'

const routers: ReturnType<typeof createMemoryRouter>[] = []
function setup() {
  const contexts: TestAudioContext[] = []
  const pending: { resolve: () => void; reject: (reason: unknown) => void }[] = []
  class TestAudioContext {
    state: AudioContextState = 'suspended'
    constructor() {
      contexts.push(this)
    }
    resume = vi.fn(() => new Promise<void>((resolve, reject) => pending.push({ resolve, reject })))
    close = vi.fn(async () => {
      this.state = 'closed'
    })
  }
  vi.stubGlobal('AudioContext', TestAudioContext)
  const router = createMemoryRouter([{ path: '*', Component: App }], {
    initialEntries: ['/', '/recipes/house-blend'],
  })
  routers.push(router)
  const view = render(<RouterProvider router={router} />)
  const start = () => fireEvent.click(screen.getByRole('button', { name: '抽出開始' }))
  return { contexts, pending, router, view, start }
}

afterEach(() => {
  cleanup()
  routers.splice(0).forEach((router) => router.dispose())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('pending brew starts', () => {
  it('does not start after returning home while audio is preparing', async () => {
    const { start, contexts, pending } = setup()
    start()
    fireEvent.click(screen.getByRole('button', { name: 'ホームに戻る' }))
    expect(contexts[0].close).toHaveBeenCalledOnce()
    await act(async () => {
      pending[0].resolve()
    })
    expect(screen.getByRole('heading', { name: /マイレシピ/ })).toBeTruthy()
    expect(screen.queryByRole('timer')).toBeNull()
    expect(contexts[0].close).toHaveBeenCalledOnce()
  })

  it('invalidates a request even if history returns to the same recipe', async () => {
    const { start, contexts, pending, router } = setup()
    start()
    await act(async () => {
      await router.navigate('/settings')
    })
    await act(async () => {
      await router.navigate(-1)
    })
    expect(screen.getByRole('button', { name: '抽出開始' })).toBeTruthy()
    await act(async () => {
      pending[0].resolve()
    })
    expect(screen.queryByRole('timer')).toBeNull()
    expect(contexts[0].close).toHaveBeenCalledOnce()
  })

  it('closes audio that finishes preparing after the app unmounts', async () => {
    const { start, contexts, pending, view } = setup()
    start()
    view.unmount()
    expect(contexts[0].close).toHaveBeenCalledOnce()
    await act(async () => {
      pending[0].resolve()
    })
    expect(contexts[0].close).toHaveBeenCalledOnce()
  })

  it('does not start silently when a cancelled audio request rejects', async () => {
    const { start, contexts, pending } = setup()
    start()
    fireEvent.click(screen.getByRole('button', { name: 'ホームに戻る' }))
    await act(async () => {
      pending[0].reject(new DOMException('Audio denied'))
    })
    expect(screen.getByRole('heading', { name: /マイレシピ/ })).toBeTruthy()
    expect(screen.queryByRole('timer')).toBeNull()
    expect(contexts[0].close).toHaveBeenCalledOnce()
  })

  it('starts only the latest request and closes an older request that resolves later', async () => {
    const { start, contexts, pending } = setup()
    start()
    start()
    await act(async () => {
      pending[1].resolve()
    })
    expect(screen.getByRole('timer')).toBeTruthy()
    const timer = screen.getByRole('timer')
    await act(async () => {
      pending[0].resolve()
    })
    expect(contexts[0].close).toHaveBeenCalledOnce()
    expect(contexts[1].close).not.toHaveBeenCalled()
    expect(screen.getByRole('timer')).toBe(timer)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: '抽出を中止' }))
    expect(contexts[1].close).toHaveBeenCalledOnce()
  })
})
