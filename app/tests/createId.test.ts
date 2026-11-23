import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from '../src/createId'

afterEach(() => vi.unstubAllGlobals())

describe('identifier generation', () => {
  it('uses randomUUID when available', () => {
    const randomUUID = vi.fn(() => '84a0b23e-c761-4bf1-bfe4-c3f0bff1dcb9')
    vi.stubGlobal('crypto', { randomUUID })
    expect(createId()).toBe('84a0b23e-c761-4bf1-bfe4-c3f0bff1dcb9')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('creates a version 4 UUID using getRandomValues on HTTP', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => bytes.fill(255))
    vi.stubGlobal('crypto', { getRandomValues })
    expect(createId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
    expect(getRandomValues).toHaveBeenCalledOnce()
  })
})
