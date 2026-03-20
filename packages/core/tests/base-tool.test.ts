import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseTool } from '../src/base-tool'
import { AdapterChain } from '../src/adapter-chain'
import { CacheLayer } from '../src/cache'
import { I18nService } from '../src/i18n'
import { ValidationError } from '../src/errors'

type Input = { id: string }
type Output = { value: string }

class TestTool extends BaseTool<Input, Output> {
  validate(raw: unknown): Input {
    if (typeof raw !== 'object' || !raw || !('id' in raw)) {
      throw new ValidationError('id required')
    }
    return raw as Input
  }
  cacheKey(input: Input): string {
    return `test:${input.id}`
  }
  get ttl(): number {
    return 60
  }
}

class ZeroTtlTool extends BaseTool<Input, Output> {
  validate(raw: unknown): Input {
    if (typeof raw !== 'object' || !raw || !('id' in raw)) {
      throw new ValidationError('id required')
    }
    return raw as Input
  }
  cacheKey(input: Input): string {
    return `zero:${input.id}`
  }
  get ttl(): number {
    return 0
  }
}

function makeChain(result: Output): AdapterChain<Input, Output> {
  return new AdapterChain([
    { name: 'mock', fetch: async () => result, healthCheck: async () => true },
  ])
}

describe('BaseTool', () => {
  let cache: CacheLayer
  let i18n: I18nService

  beforeEach(() => {
    cache = new CacheLayer()
    i18n = new I18nService('en')
  })

  it('throws ValidationError for invalid input', async () => {
    const tool = new TestTool(cache, makeChain({ value: 'x' }), i18n)
    await expect(tool.execute('not-an-object')).rejects.toThrow(ValidationError)
    await expect(tool.execute({ name: 'no-id' })).rejects.toThrow(ValidationError)
  })

  it('calls adapter chain on cache miss and returns result', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ value: 'fresh' })
    const chain = new AdapterChain([
      { name: 'mock', fetch: fetchSpy, healthCheck: async () => true },
    ])
    const tool = new TestTool(cache, chain, i18n)
    const response = await tool.execute({ id: 'abc' })
    expect(response.data).toEqual({ value: 'fresh' })
    expect(response._meta.cached).toBe(false)
    expect(response._meta.adapter).toBe('mock')
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('returns cached result on cache hit with _meta.cached = true', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ value: 'fresh' })
    const chain = new AdapterChain([
      { name: 'mock', fetch: fetchSpy, healthCheck: async () => true },
    ])
    const tool = new TestTool(cache, chain, i18n)

    // First call populates cache
    await tool.execute({ id: 'xyz' })

    // Second call should use cache
    const cached = await tool.execute({ id: 'xyz' })
    expect(cached.data).toEqual({ value: 'fresh' })
    expect(cached._meta.cached).toBe(true)
    expect(cached._meta.adapter).toBe('cache')
    expect(cached._meta.latencyMs).toBe(0)

    // Adapter should only have been called once
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('does not cache result when ttl = 0', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ value: 'no-cache' })
    const chain = new AdapterChain([
      { name: 'mock', fetch: fetchSpy, healthCheck: async () => true },
    ])
    const tool = new ZeroTtlTool(cache, chain, i18n)

    await tool.execute({ id: '1' })
    await tool.execute({ id: '1' })

    // Adapter called both times — no caching
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('_meta.cached is false for fresh adapter results', async () => {
    const tool = new TestTool(cache, makeChain({ value: 'data' }), i18n)
    const response = await tool.execute({ id: 'fresh-key' })
    expect(response._meta.cached).toBe(false)
  })
})
