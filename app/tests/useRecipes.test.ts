import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecipes } from '../src/useRecipes'
import { sampleRecipes, STORAGE_KEY } from '../src/recipes'

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('recipe save conflicts', () => {
  it('preserves additions from another tab and rejects stale edits repeatedly', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleRecipes))
    const tabA = renderHook(useRecipes)
    const tabB = renderHook(useRecipes)
    const added = { ...sampleRecipes[0], id: 'new-in-a', name: 'タブAで追加' }
    const updated = [{ ...sampleRecipes[0], name: 'タブBで編集' }]
    act(() => {
      expect(tabA.result.current.save([...sampleRecipes, added])).toBe(true)
    })
    const stored = localStorage.getItem(STORAGE_KEY)
    act(() => {
      expect(tabB.result.current.save(updated)).toBe(false)
    })
    expect(localStorage.getItem(STORAGE_KEY)).toBe(stored)
    expect(tabB.result.current.recipes).toEqual(sampleRecipes)
    expect(tabB.result.current.error).toContain('別のタブ')
    act(() => {
      expect(tabB.result.current.save(updated)).toBe(false)
    })
    expect(localStorage.getItem(STORAGE_KEY)).toBe(stored)
  })

  it('detects the first save from another tab when storage was initially empty', () => {
    const tabA = renderHook(useRecipes)
    const tabB = renderHook(useRecipes)
    act(() => {
      expect(tabA.result.current.save(sampleRecipes)).toBe(true)
    })
    act(() => {
      expect(tabB.result.current.save([])).toBe(false)
    })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(sampleRecipes)
  })

  it('detects clearing of storage by another tab', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleRecipes))
    const tab = renderHook(useRecipes)
    localStorage.removeItem(STORAGE_KEY)
    act(() => {
      expect(tab.result.current.save(sampleRecipes)).toBe(false)
    })
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('allows subsequent saves after a successful save in the same tab', () => {
    const tab = renderHook(useRecipes)
    act(() => {
      expect(tab.result.current.save(sampleRecipes)).toBe(true)
    })
    const updated = [{ ...sampleRecipes[0], name: '更新' }]
    act(() => {
      expect(tab.result.current.save(updated)).toBe(true)
    })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(updated)
    expect(tab.result.current.error).toBe('')
  })

  it('never writes when storage cannot be checked', () => {
    const tab = renderHook(useRecipes)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied')
    })
    const write = vi.spyOn(Storage.prototype, 'setItem')
    act(() => {
      expect(tab.result.current.save(sampleRecipes)).toBe(false)
    })
    expect(write).not.toHaveBeenCalled()
    expect(tab.result.current.error).toContain('保存できませんでした')
  })

  it('allows restoring a valid backup after detecting malformed saved data', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    const tab = renderHook(useRecipes)
    expect(tab.result.current.error).toContain('読み込めませんでした')
    act(() => {
      expect(tab.result.current.save(sampleRecipes)).toBe(true)
    })
    expect(tab.result.current.error).toBe('')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(sampleRecipes)
  })
})
