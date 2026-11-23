import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { Brew } from '../src/Brew'
import { Settings } from '../src/Settings'
import { sampleRecipes, STORAGE_KEY } from '../src/recipes'

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('recipe management', () => {
  it('creates a recipe, reorders tasks, persists edits, and reloads it', () => {
    const app = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /レシピを追加/ }))
    fireEvent.change(screen.getByLabelText('レシピ名'), { target: { value: '朝の一杯' } })
    fireEvent.click(screen.getByRole('button', { name: /ステップを追加/ }))
    let groups = screen.getAllByRole('group')
    fireEvent.change(within(groups[0]).getByLabelText('説明'), { target: { value: '最初の注湯' } })
    fireEvent.change(within(groups[1]).getByLabelText('種別'), { target: { value: 'wait' } })
    fireEvent.click(screen.getByRole('button', { name: 'タスク2を上へ' }))
    groups = screen.getAllByRole('group')
    expect(within(groups[0]).getByLabelText<HTMLSelectElement>('種別').value).toBe('wait')
    fireEvent.click(screen.getByRole('button', { name: 'レシピを保存' }))
    expect(screen.getByRole('heading', { name: '朝の一杯' })).toBeTruthy()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved[1].tasks.map((task: { type: string }) => task.type)).toEqual(['wait', 'pour'])
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    fireEvent.change(screen.getByLabelText('レシピ名'), { target: { value: '休日の一杯' } })
    fireEvent.click(screen.getByRole('button', { name: 'レシピを保存' }))
    app.unmount()
    render(<App />)
    expect(screen.getByRole('button', { name: '休日の一杯' })).toBeTruthy()
  })

  it('does not overwrite corrupted storage on startup', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    render(<App />)
    expect(screen.getByRole('alert').textContent).toContain('保存データを読み込めませんでした')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken')
  })

  it('deletes only after confirmation and persists an empty list', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: sampleRecipes[0].name }))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(screen.getByRole('button', { name: '抽出開始' })).toBeTruthy()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]')
    expect(screen.queryByRole('button', { name: sampleRecipes[0].name })).toBeNull()
  })

  it('keeps the editor and existing data when saving fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded')
    })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /レシピを追加/ }))
    fireEvent.change(screen.getByLabelText('レシピ名'), { target: { value: '保存できないレシピ' } })
    fireEvent.click(screen.getByRole('button', { name: 'レシピを保存' }))
    expect(screen.getByRole('alert').textContent).toContain('保存できませんでした')
    expect(screen.getByLabelText<HTMLInputElement>('レシピ名').value).toBe('保存できないレシピ')
  })

  it('renders Markdown and line breaks without executing HTML', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { ...sampleRecipes[0], description: '**太字**\n次の行\n<script>alert(1)</script>' },
      ]),
    )
    const { container } = render(<App />)
    expect(container.querySelector('strong')?.textContent).toBe('太字')
    expect(container.querySelector('.markdown br')).toBeTruthy()
    expect(container.querySelector('script')).toBeNull()
  })
})

describe('backup import', () => {
  it('exports every recipe as JSON in a downloadable file', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    let exported: Blob | undefined
    const revoke = vi.fn()
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL(blob: Blob) {
          exported = blob
          return 'blob:recipes'
        }
        static revokeObjectURL = revoke
      },
    )
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<Settings recipes={sampleRecipes} onImport={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'ダウンロード' }))
    expect(click).toHaveBeenCalledOnce()
    expect(exported?.type).toBe('application/json')
    const content = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsText(exported!)
    })
    expect(JSON.parse(content)).toEqual(sampleRecipes)
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith('blob:recipes')
  })

  it('rejects invalid backup data without calling the save handler', async () => {
    const onImport = vi.fn()
    render(<Settings recipes={sampleRecipes} onImport={onImport} />)
    fireEvent.change(screen.getByLabelText('レシピ JSON ファイル'), {
      target: { files: [{ size: 10, text: async () => '[{"name":"invalid"}]' }] },
    })
    expect((await screen.findByRole('alert')).textContent).toContain(
      'レシピの形式が正しくありません',
    )
    expect(onImport).not.toHaveBeenCalled()
  })

  it('imports validated backups only after confirming replacement', async () => {
    const onImport = vi.fn(() => true)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Settings recipes={[]} onImport={onImport} />)
    fireEvent.change(screen.getByLabelText('レシピ JSON ファイル'), {
      target: { files: [{ size: 100, text: async () => JSON.stringify(sampleRecipes) }] },
    })
    expect((await screen.findByRole('status')).textContent).toContain(
      '1 件のレシピを読み込みました',
    )
    expect(onImport).toHaveBeenCalledWith(sampleRecipes)
  })
})

describe('brewing interaction', () => {
  it('pauses, resumes, advances steps, and completes with a notification at every boundary', () => {
    vi.useFakeTimers()
    const recipe = {
      ...sampleRecipes[0],
      tasks: sampleRecipes[0].tasks.slice(0, 2).map((task) => ({ ...task, seconds: 2 })),
    }
    const gain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }
    const oscillator = {
      connect: vi.fn(() => gain),
      frequency: { setValueAtTime: vi.fn() },
      start: vi.fn(),
      stop: vi.fn(),
    }
    const audio = {
      createOscillator: vi.fn(() => oscillator),
      createGain: vi.fn(() => gain),
      currentTime: 0,
      destination: {},
    }
    // jsdom has no Web Audio implementation; only the used audio methods are simulated.
    render(<Brew recipe={recipe} audio={audio as unknown as AudioContext} onExit={vi.fn()} />)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('timer').textContent).toBe('00:01')
    fireEvent.click(screen.getByRole('button', { name: '一時停止' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('timer').textContent).toBe('00:01')
    fireEvent.click(screen.getByRole('button', { name: '再開する' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('status').textContent).toBe('ゆっくり待ちましょう')
    expect(audio.createOscillator).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByRole('heading', { name: '美味しいコーヒーをどうぞ。' })).toBeTruthy()
    expect(audio.createOscillator).toHaveBeenCalledTimes(2)
  })
})
