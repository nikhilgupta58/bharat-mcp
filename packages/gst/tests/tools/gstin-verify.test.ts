import { describe, it, expect, vi } from 'vitest'
import { GSTINVerifyTool } from '../../src/tools/gstin-verify'
import { GSTMockAdapter } from '../../src/adapters/mock'
import { CacheLayer, AdapterChain, I18nService, ValidationError, EntityNotFoundError } from '@bharat-mcp/core'

function makeToolWithCache(cacheStore: Map<string, unknown> = new Map()) {
  const cache = new CacheLayer()
  vi.spyOn(cache, 'get').mockImplementation(async (key: string) => cacheStore.get(key) as any)
  vi.spyOn(cache, 'set').mockImplementation(async (key: string, value: unknown) => { cacheStore.set(key, value) })
  const chain = new AdapterChain([new GSTMockAdapter()])
  const i18n = new I18nService('en')
  return { tool: new GSTINVerifyTool(cache, chain, i18n), cache, cacheStore }
}

describe('GSTINVerifyTool', () => {
  it('returns GSTINResult for a valid active GSTIN', async () => {
    const { tool } = makeToolWithCache()
    const response = await tool.execute({ gstin: '27AABCU9603R1ZN' })
    expect(response.data.gstin).toBe('27AABCU9603R1ZN')
    expect(response.data.status).toBe('Active')
    expect(response.data.legalName).toBe('UNISON CHEMICALS PRIVATE LIMITED')
  })

  it('returns cancelled GSTIN data with correct status', async () => {
    const { tool } = makeToolWithCache()
    const response = await tool.execute({ gstin: '29AAKCS7169P1Z7' })
    expect(response.data.status).toBe('Cancelled')
  })

  it('throws ValidationError for invalid GSTIN format', async () => {
    const { tool } = makeToolWithCache()
    await expect(tool.execute({ gstin: 'INVALID123' })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for GSTIN with bad checksum', async () => {
    const { tool } = makeToolWithCache()
    await expect(tool.execute({ gstin: '27AABCU9603R1ZX' })).rejects.toThrow(ValidationError)
  })

  it('throws EntityNotFoundError for a valid but non-existent GSTIN', async () => {
    const mockAdapter = new GSTMockAdapter()
    const fetchSpy = vi.spyOn(mockAdapter, 'fetch').mockRejectedValueOnce(
      new EntityNotFoundError('GSTIN', '27AABCU9603R1ZN')
    )
    const spyCache = new CacheLayer()
    vi.spyOn(spyCache, 'get').mockResolvedValue(undefined)
    vi.spyOn(spyCache, 'set').mockResolvedValue(undefined)
    const spyChain = new AdapterChain([mockAdapter])
    const spyI18n = new I18nService('en')
    const spyTool = new GSTINVerifyTool(spyCache, spyChain, spyI18n)
    await expect(spyTool.execute({ gstin: '27AABCU9603R1ZN' })).rejects.toThrow(EntityNotFoundError)
    fetchSpy.mockRestore()
  })

  it('response includes _meta with adapter="mock"', async () => {
    const { tool } = makeToolWithCache()
    const response = await tool.execute({ gstin: '27AABCU9603R1ZN' })
    expect(response._meta).toBeDefined()
    expect(response._meta.adapter).toBe('mock')
  })

  it('second call returns cached result', async () => {
    const store = new Map<string, unknown>()
    const { tool, cache } = makeToolWithCache(store)
    const getSpy = vi.spyOn(cache, 'get')
    await tool.execute({ gstin: '27AABCU9603R1ZN' })
    const secondResponse = await tool.execute({ gstin: '27AABCU9603R1ZN' })
    expect(getSpy).toHaveBeenCalledTimes(2)
    expect(secondResponse._meta.cached).toBe(true)
    expect(secondResponse._meta.adapter).toBe('cache')
  })
})
