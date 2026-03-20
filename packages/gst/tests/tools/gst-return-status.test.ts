import { describe, it, expect, vi } from 'vitest'
import { GSTReturnStatusTool } from '../../src/tools/gst-return-status'
import { GSTReturnStatusMockAdapter } from '../../src/adapters/mock'
import { CacheLayer, AdapterChain, I18nService, ValidationError, EntityNotFoundError } from '@bharat-mcp/core'

function makeTool(cacheStore: Map<string, unknown> = new Map()) {
  const cache = new CacheLayer()
  vi.spyOn(cache, 'get').mockImplementation(async (key: string) => cacheStore.get(key) as any)
  vi.spyOn(cache, 'set').mockImplementation(async (key: string, value: unknown) => { cacheStore.set(key, value) })
  const chain = new AdapterChain([new GSTReturnStatusMockAdapter()])
  const i18n = new I18nService('en')
  return { tool: new GSTReturnStatusTool(cache, chain, i18n), cache, cacheStore }
}

describe('GSTReturnStatusTool', () => {
  it('returns filing returns for a valid GSTIN', async () => {
    const { tool } = makeTool()
    const response = await tool.execute({ gstin: '27AABCU9603R1ZN' })
    expect(response.data.gstin).toBe('27AABCU9603R1ZN')
    expect(response.data.returns).toBeInstanceOf(Array)
    expect(response.data.returns.length).toBeGreaterThan(0)
  })

  it('filters returns by return_type GSTR1', async () => {
    const { tool } = makeTool()
    const response = await tool.execute({ gstin: '27AABCU9603R1ZN', return_type: 'GSTR1' })
    expect(response.data.returns.every(r => r.type === 'GSTR1')).toBe(true)
  })

  it('filters returns by return_type GSTR3B', async () => {
    const { tool } = makeTool()
    const response = await tool.execute({ gstin: '27AABCU9603R1ZN', return_type: 'GSTR3B' })
    expect(response.data.returns.every(r => r.type === 'GSTR3B')).toBe(true)
  })

  it('returns all return types when return_type is "all"', async () => {
    const { tool } = makeTool()
    const response = await tool.execute({ gstin: '27AABCU9603R1ZN', return_type: 'all' })
    const types = new Set(response.data.returns.map(r => r.type))
    expect(types.size).toBeGreaterThan(1)
  })

  it('defaults return_type to "all" when not provided', async () => {
    const { tool } = makeTool()
    const response = await tool.execute({ gstin: '27AABCU9603R1ZN' })
    const types = new Set(response.data.returns.map(r => r.type))
    expect(types.size).toBeGreaterThan(1)
  })

  it('throws EntityNotFoundError for GSTIN with no fixture data', async () => {
    const { tool } = makeTool()
    // GSTIN 33AAACT2727Q1Z3 exists in gstinFixtures but is in returnStatusFixtures too
    // Use a valid GSTIN format that has no return status fixture
    await expect(
      tool.execute({ gstin: '06AAKCS7169P2ZE' })
    ).rejects.toThrow(EntityNotFoundError)
  })

  it('throws ValidationError for invalid GSTIN format', async () => {
    const { tool } = makeTool()
    await expect(tool.execute({ gstin: 'INVALID123' })).rejects.toThrow(ValidationError)
  })

  it('caches results on second call', async () => {
    const store = new Map<string, unknown>()
    const { tool, cache } = makeTool(store)
    const getSpy = vi.spyOn(cache, 'get')
    await tool.execute({ gstin: '27AABCU9603R1ZN' })
    const secondResponse = await tool.execute({ gstin: '27AABCU9603R1ZN' })
    expect(getSpy).toHaveBeenCalledTimes(2)
    expect(secondResponse._meta.cached).toBe(true)
  })

  it('returns correct _meta adapter name', async () => {
    const { tool } = makeTool()
    const response = await tool.execute({ gstin: '27AABCU9603R1ZN' })
    expect(response._meta.adapter).toBe('mock')
  })

  it('returns FilingPeriod objects with required fields', async () => {
    const { tool } = makeTool()
    const response = await tool.execute({ gstin: '27AABCU9603R1ZN' })
    const firstReturn = response.data.returns[0]
    expect(firstReturn).toHaveProperty('period')
    expect(firstReturn).toHaveProperty('type')
    expect(firstReturn).toHaveProperty('status')
  })
})
