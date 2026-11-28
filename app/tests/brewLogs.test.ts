import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LOG_STORAGE_KEY,
  MAX_LOG_BYTES,
  MAX_LOGS,
  parseBrewLogs,
  readBrewLogs,
  recipeFromLog,
  saveBrewLog,
  type BrewLog,
} from '../src/brewLogs'
import { parseRecipes, sampleRecipes, STORAGE_KEY } from '../src/recipes'

function makeLog(index = 0): BrewLog {
  return {
    id: `log-${index}`,
    recipe: structuredClone(sampleRecipes[0]),
    startedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    finishedAt: new Date(Date.UTC(2026, 0, 1, 0, index, 150)).toISOString(),
    steps: sampleRecipes[0].tasks.map((task) => ({
      taskId: task.id,
      activeMs: task.seconds * 1000,
      pausedMs: 0,
      skipped: false,
    })),
  }
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('brew log storage', () => {
  it('keeps only the latest 100 records and reads existing data before each append', async () => {
    for (let index = 0; index <= MAX_LOGS; index++) await saveBrewLog(makeLog(index))
    const logs = readBrewLogs()
    expect(logs).toHaveLength(MAX_LOGS)
    expect(logs[0].id).toBe(`log-${MAX_LOGS}`)
    expect(logs.at(-1)?.id).toBe('log-1')
    await saveBrewLog(makeLog(MAX_LOGS))
    expect(readBrewLogs()).toHaveLength(MAX_LOGS)
  })

  it('trims old records to the byte budget even before reaching the count limit', async () => {
    for (let index = 0; index < 10; index++) {
      const log = makeLog(index)
      log.recipe.description = 'a'.repeat(100_000)
      await saveBrewLog(log)
    }
    expect(localStorage.getItem(LOG_STORAGE_KEY)!.length * 2).toBeLessThanOrEqual(MAX_LOG_BYTES)
    expect(readBrewLogs().length).toBeLessThan(10)
    expect(readBrewLogs()[0].id).toBe('log-9')
  })

  it('retries quota failures by removing older logs and leaves recipes untouched', async () => {
    await saveBrewLog(makeLog())
    const recipes = JSON.stringify(sampleRecipes)
    localStorage.setItem(STORAGE_KEY, recipes)
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === LOG_STORAGE_KEY && JSON.parse(value).length > 1) {
        throw new DOMException('Full', 'QuotaExceededError')
      }
      setItem.call(this, key, value)
    })
    await saveBrewLog(makeLog(1))
    expect(readBrewLogs().map((log) => log.id)).toEqual(['log-1'])
    expect(localStorage.getItem(STORAGE_KEY)).toBe(recipes)
  })

  it('preserves stored logs if even the newest log cannot be saved', async () => {
    await saveBrewLog(makeLog())
    const before = localStorage.getItem(LOG_STORAGE_KEY)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    await expect(saveBrewLog(makeLog(1))).rejects.toThrow()
    expect(localStorage.getItem(LOG_STORAGE_KEY)).toBe(before)
  })

  it('rejects a single oversized log without deleting existing logs', async () => {
    await saveBrewLog(makeLog())
    const before = localStorage.getItem(LOG_STORAGE_KEY)
    const large = makeLog(1)
    large.recipe.description = 'a'.repeat(MAX_LOG_BYTES)
    await expect(saveBrewLog(large)).rejects.toThrow('大きすぎる')
    expect(localStorage.getItem(LOG_STORAGE_KEY)).toBe(before)
  })

  it('does not silently overwrite corrupted data or hide non-quota failures', async () => {
    localStorage.setItem(LOG_STORAGE_KEY, '{broken')
    await expect(saveBrewLog(makeLog())).rejects.toThrow()
    expect(localStorage.getItem(LOG_STORAGE_KEY)).toBe('{broken')
    localStorage.removeItem(LOG_STORAGE_KEY)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError')
    })
    await expect(saveBrewLog(makeLog())).rejects.toThrow('Denied')
  })

  it('uses a shared browser lock for read-and-append when available', async () => {
    const request = vi.fn(async (_name: string, write: () => void) => write())
    vi.stubGlobal('navigator', { locks: { request } })
    await saveBrewLog(makeLog())
    expect(request).toHaveBeenCalledWith(LOG_STORAGE_KEY, expect.any(Function))
    expect(readBrewLogs()).toHaveLength(1)
  })

  it('validates step identity, duration, and recipe snapshots', () => {
    const valid = makeLog()
    expect(parseBrewLogs([valid])).toEqual([valid])
    for (const changed of [
      { ...valid, steps: [] },
      { ...valid, startedAt: 'bad-date' },
      { ...valid, recipe: { ...valid.recipe, tasks: [] } },
      { ...valid, steps: valid.steps.map((step) => ({ ...step, pausedMs: -1 })) },
      { ...valid, steps: valid.steps.map((step) => ({ ...step, taskId: 'wrong' })) },
    ])
      expect(() => parseBrewLogs([changed])).toThrow()
  })

  it('creates a distinct recipe with actual durations including pauses and skipped steps', () => {
    const log = makeLog()
    log.steps[0] = { ...log.steps[0], activeMs: 2500, pausedMs: 2000, skipped: true }
    log.steps[1] = { ...log.steps[1], activeMs: 0, skipped: true }
    const recipe = recipeFromLog(log)
    expect(recipe.id).not.toBe(log.recipe.id)
    expect(recipe.tasks[0].id).not.toBe(log.recipe.tasks[0].id)
    expect(recipe.tasks.map((task) => task.seconds)).toEqual([5, 1, 40, 30, 40])
    expect(recipe.tasks[0].amount).toBe(log.recipe.tasks[0].amount)
    expect(parseRecipes([recipe])).toEqual([recipe])
    expect(log.recipe.tasks[0].seconds).toBe(10)
  })
})
