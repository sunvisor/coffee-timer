import { describe, expect, it } from 'vitest'
import { formatTime, getBrewProgress, parseRecipes, sampleRecipes } from '../src/recipes'

describe('recipe import validation', () => {
  it('accepts a JSON round trip and an empty backup', () => {
    expect(parseRecipes(JSON.parse(JSON.stringify(sampleRecipes)))).toEqual(sampleRecipes)
    expect(parseRecipes([])).toEqual([])
  })

  it.each([
    { name: ' ' },
    { coffee: 0 },
    { water: -1 },
    { temperature: 101 },
    { coffee: Infinity },
    { tasks: [] },
    { tasks: [{ ...sampleRecipes[0].tasks[0], seconds: 0 }] },
    { tasks: [{ ...sampleRecipes[0].tasks[0], seconds: 1.5 }] },
    { tasks: [{ ...sampleRecipes[0].tasks[0], amount: -1 }] },
    { tasks: [{ ...sampleRecipes[0].tasks[0], type: 'wait', amount: 50 }] },
    { tasks: [sampleRecipes[0].tasks[0], sampleRecipes[0].tasks[0]] },
  ])('rejects invalid recipe fields: %j', (fields) => {
    expect(() => parseRecipes([{ ...sampleRecipes[0], ...fields }])).toThrow()
  })

  it('rejects invalid shapes and duplicate recipe identifiers', () => {
    for (const value of [null, {}, [null], [sampleRecipes[0], sampleRecipes[0]]]) {
      expect(() => parseRecipes(value)).toThrow()
    }
  })
})

describe('brewing timeline', () => {
  const tasks = sampleRecipes[0].tasks
  it('interpolates the current pour independently of previous pours', () => {
    expect(getBrewProgress(tasks, 5)).toMatchObject({
      index: 0,
      remaining: 5,
      amount: 15,
      poured: 0,
    })
    expect(getBrewProgress(tasks, 60)).toMatchObject({
      index: 2,
      remaining: 20,
      amount: 60,
      poured: 30,
    })
  })
  it('moves to the next step at the exact boundary', () => {
    expect(getBrewProgress(tasks, 10)).toMatchObject({
      index: 1,
      remaining: 30,
      amount: 0,
      poured: 30,
    })
    expect(getBrewProgress(tasks, 40)).toMatchObject({
      index: 2,
      remaining: 40,
      amount: 0,
      poured: 30,
    })
  })
  it('catches up after delayed timer callbacks and completes', () => {
    expect(getBrewProgress(tasks, 111)).toMatchObject({ index: 4, remaining: 39, poured: 250 })
    expect(getBrewProgress(tasks, 150)).toMatchObject({ index: 5, remaining: 0, poured: 250 })
    expect(getBrewProgress(tasks, 900)).toMatchObject({ index: 5, remaining: 0, poured: 250 })
  })
  it('rounds countdowns before separating minutes and seconds', () => {
    expect(formatTime(59.5)).toBe('01:00')
    expect(formatTime(60)).toBe('01:00')
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(-1)).toBe('00:00')
  })
})
