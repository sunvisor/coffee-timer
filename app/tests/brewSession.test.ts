import { describe, expect, it } from 'vitest'
import {
  advanceBrew,
  brewSnapshot,
  createBrewSession,
  pauseBrew,
  skipBrew,
} from '../src/brewSession'
import { logDuration } from '../src/brewLogs'
import { sampleRecipes } from '../src/recipes'

const start = Date.parse('2026-11-28T00:00:00Z')
const recipe = { ...sampleRecipes[0], tasks: sampleRecipes[0].tasks.slice(0, 2) }

describe('measured brewing', () => {
  it('updates overall elapsed and estimated total from pauses and skips through completion', () => {
    const session = createBrewSession(recipe, start)
    expect(brewSnapshot(session)).toMatchObject({ elapsed: 0, total: 40 })
    pauseBrew(session, start + 2000)
    advanceBrew(session, start + 5000)
    expect(brewSnapshot(session)).toMatchObject({ elapsed: 5, total: 43 })
    skipBrew(session, start + 5000)
    expect(brewSnapshot(session)).toMatchObject({ elapsed: 5, total: 35 })
    pauseBrew(session, start + 7000)
    advanceBrew(session, start + 8000)
    expect(brewSnapshot(session)).toMatchObject({ elapsed: 8, total: 37 })
    skipBrew(session, start + 8500)
    expect(brewSnapshot(session)).toMatchObject({ elapsed: 8.5, total: 8.5 })
    expect(logDuration(session.log!)).toBe(8500)
  })

  it('assigns delayed timer ticks across task boundaries without inflating the duration', () => {
    const session = createBrewSession(recipe, start)
    advanceBrew(session, start + 50_000)
    expect(session.log?.steps.map((step) => step.activeMs)).toEqual([10_000, 30_000])
    expect(session.log?.finishedAt).toBe('2026-11-28T00:00:40.000Z')
    expect(logDuration(session.log!)).toBe(40_000)
    const log = session.log
    advanceBrew(session, start + 100_000)
    expect(session.log).toBe(log)
  })

  it('records the exact time of a skip between ticks and starts the next step immediately', () => {
    const session = createBrewSession(recipe, start)
    advanceBrew(session, start + 1000)
    skipBrew(session, start + 1234)
    expect(session.steps[0]).toEqual({
      taskId: 'bloom',
      activeMs: 1234,
      pausedMs: 0,
      skipped: true,
    })
    expect(brewSnapshot(session).progress.remaining).toBe(30)
    advanceBrew(session, start + 31_234)
    expect(logDuration(session.log!)).toBe(31_234)
    expect(session.log?.steps[1].skipped).toBe(false)
  })

  it('adds multiple pauses to the current task while excluding them from its countdown', () => {
    const session = createBrewSession(recipe, start)
    pauseBrew(session, start + 2000)
    advanceBrew(session, start + 4000)
    expect(brewSnapshot(session).progress.remaining).toBe(8)
    pauseBrew(session, start + 5000)
    pauseBrew(session, start + 6000)
    pauseBrew(session, start + 8000)
    advanceBrew(session, start + 45_000)
    expect(session.log?.steps[0]).toEqual({
      taskId: 'bloom',
      activeMs: 10_000,
      pausedMs: 5000,
      skipped: false,
    })
    expect(session.log?.steps[1].pausedMs).toBe(0)
    expect(logDuration(session.log!)).toBe(45_000)
  })

  it('counts paused time before a skip and preserves pause for the next task', () => {
    const session = createBrewSession(recipe, start)
    pauseBrew(session, start + 2500)
    skipBrew(session, start + 7000)
    expect(session.steps[0]).toMatchObject({ activeMs: 2500, pausedMs: 4500, skipped: true })
    expect(session.paused).toBe(true)
    pauseBrew(session, start + 9000)
    advanceBrew(session, start + 39_000)
    expect(session.log?.steps[1]).toMatchObject({
      activeMs: 30_000,
      pausedMs: 2000,
      skipped: false,
    })
    expect(logDuration(session.log!)).toBe(39_000)
  })

  it('accounts for boundaries before processing pause or skip commands', () => {
    const session = createBrewSession(recipe, start)
    pauseBrew(session, start + 10_001)
    skipBrew(session, start + 11_001)
    expect(session.log?.steps[0]).toMatchObject({ activeMs: 10_000, pausedMs: 0, skipped: false })
    expect(session.log?.steps[1]).toMatchObject({ activeMs: 1, pausedMs: 1000, skipped: true })
  })

  it('retains a recipe snapshot and leaves unfinished brews without a completed log', () => {
    const original = structuredClone(recipe)
    const session = createBrewSession(original, start)
    original.tasks[0].seconds = 999
    original.name = 'changed'
    advanceBrew(session, start + 2000)
    expect(session.recipe).toEqual(recipe)
    expect(session.log).toBeNull()
  })
})
