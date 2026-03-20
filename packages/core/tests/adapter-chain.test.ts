import { describe, it, expect, vi } from 'vitest'
import { AdapterChain } from '../src/adapter-chain'
import { UpstreamError, TimeoutError, ValidationError } from '../src/errors'
import type { DataAdapter } from '../src/types'

type Query = { id: string }
type Result = { value: string }

function makeAdapter(name: string, impl: () => Promise<Result>): DataAdapter<Query, Result> {
  return { name, fetch: impl, healthCheck: async () => true }
}

describe('AdapterChain', () => {
  it('throws if constructed with empty adapter array', () => {
    expect(() => new AdapterChain([])).toThrow('AdapterChain requires at least one adapter')
  })

  it('returns result from first adapter on success', async () => {
    const chain = new AdapterChain([
      makeAdapter('mock', async () => ({ value: 'ok' })),
    ])
    const response = await chain.fetch({ id: '1' }, 'en')
    expect(response.data).toEqual({ value: 'ok' })
    expect(response._meta.adapter).toBe('mock')
    expect(response._meta.cached).toBe(false)
    expect(response._meta.partial).toBe(false)
  })

  it('falls to second adapter when first fails with retryable UpstreamError', async () => {
    const retryableErr = new UpstreamError('rate limited', 'first', 429, true)
    const chain = new AdapterChain([
      makeAdapter('first', async () => { throw retryableErr }),
      makeAdapter('second', async () => ({ value: 'fallback' })),
    ])
    const response = await chain.fetch({ id: '1' }, 'hi')
    expect(response.data).toEqual({ value: 'fallback' })
    expect(response._meta.adapter).toBe('second')
    expect(response._meta.locale).toBe('hi')
  })

  it('falls to second adapter when first fails with non-retryable UpstreamError', async () => {
    const nonRetryableErr = new TimeoutError('first', 5000)
    const chain = new AdapterChain([
      makeAdapter('first', async () => { throw nonRetryableErr }),
      makeAdapter('second', async () => ({ value: 'fallback' })),
    ])
    const response = await chain.fetch({ id: '1' }, 'en')
    expect(response.data).toEqual({ value: 'fallback' })
    expect(response._meta.adapter).toBe('second')
  })

  it('throws non-UpstreamError immediately without trying next adapter', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ value: 'never' })
    const chain = new AdapterChain([
      makeAdapter('first', async () => { throw new ValidationError('bad input') }),
      makeAdapter('second', fetchSpy),
    ])
    await expect(chain.fetch({ id: '1' })).rejects.toThrow(ValidationError)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('throws last error when all adapters fail', async () => {
    const err1 = new TimeoutError('adapter1', 5000)
    const err2 = new TimeoutError('adapter2', 5000)
    const chain = new AdapterChain([
      makeAdapter('adapter1', async () => { throw err1 }),
      makeAdapter('adapter2', async () => { throw err2 }),
    ])
    await expect(chain.fetch({ id: '1' })).rejects.toBe(err2)
  })

  it('includes correct _meta: adapter name, latencyMs >= 0, locale, fetchedAt', async () => {
    const chain = new AdapterChain([
      makeAdapter('sandbox', async () => ({ value: 'data' })),
    ])
    const response = await chain.fetch({ id: '42' }, 'hi')
    expect(response._meta.adapter).toBe('sandbox')
    expect(response._meta.latencyMs).toBeGreaterThanOrEqual(0)
    expect(response._meta.locale).toBe('hi')
    expect(response._meta.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(response._meta.cached).toBe(false)
    expect(response._meta.partial).toBe(false)
  })
})
