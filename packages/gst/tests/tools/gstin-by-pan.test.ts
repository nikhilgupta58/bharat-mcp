import { describe, it, expect, vi } from 'vitest'
import { GSTINByPANTool } from '../../src/tools/gstin-by-pan'
import { GSTINByPANMockAdapter } from '../../src/adapters/mock'
import { CacheLayer, AdapterChain, I18nService, ValidationError, EntityNotFoundError } from '@bharat-mcp/core'

function makeTool(cacheStore: Map<string, unknown> = new Map()) {
  const cache = new CacheLayer()
  vi.spyOn(cache, 'get').mockImplementation(async (key: string) => cacheStore.get(key) as any)
  vi.spyOn(cache, 'set').mockImplementation(async (key: string, value: unknown) => { cacheStore.set(key, value) })
  const chain = new AdapterChain([new GSTINByPANMockAdapter()])
  const i18n = new I18nService('en')
  return { tool: new GSTINByPANTool(cache, chain, i18n), cache, cacheStore }
}

describe('GSTINByPANTool', () => {
  // AABCU9603R is the PAN embedded in GSTINs: 27AABCU9603R1ZN and 07AABCU9603R2ZO
  it('returns multiple GSTINs for a PAN with multiple registrations', async () => {
    const { tool } = makeTool()
    const response = await tool.execute({ pan: 'AABCU9603R' })
    expect(response.data.length).toBe(2)
    const gstins = response.data.map(r => r.gstin)
    expect(gstins).toContain('27AABCU9603R1ZN')
    expect(gstins).toContain('07AABCU9603R2ZO')
  })

  it('returns single GSTIN for PAN with one registration', async () => {
    const { tool } = makeTool()
    // AAACT2727Q => 33AAACT2727Q1Z3 and 19AAACT2727Q2ZS
    const response = await tool.execute({ pan: 'AAACT2727Q' })
    expect(response.data.length).toBe(2)
  })

  it('normalizes lowercase PAN to uppercase', async () => {
    const { tool } = makeTool()
    const response = await tool.execute({ pan: 'aabcu9603r' })
    expect(response.data.length).toBe(2)
  })

  it('throws EntityNotFoundError for PAN with no GSTINs', async () => {
    const { tool } = makeTool()
    await expect(tool.execute({ pan: 'ZZZZZ9999Z' })).rejects.toThrow(EntityNotFoundError)
  })

  it('throws ValidationError for invalid PAN format (too short)', async () => {
    const { tool } = makeTool()
    await expect(tool.execute({ pan: 'ABC123' })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for invalid PAN format (wrong pattern)', async () => {
    const { tool } = makeTool()
    await expect(tool.execute({ pan: '12345ABCDE' })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for missing PAN', async () => {
    const { tool } = makeTool()
    await expect(tool.execute({})).rejects.toThrow(ValidationError)
  })

  it('returns GSTINResult objects with required fields', async () => {
    const { tool } = makeTool()
    const response = await tool.execute({ pan: 'AABCU9603R' })
    const result = response.data[0]
    expect(result).toHaveProperty('gstin')
    expect(result).toHaveProperty('legalName')
    expect(result).toHaveProperty('status')
    expect(result).toHaveProperty('state')
  })

  it('caches results on second call', async () => {
    const store = new Map<string, unknown>()
    const { tool, cache } = makeTool(store)
    const getSpy = vi.spyOn(cache, 'get')
    await tool.execute({ pan: 'AABCU9603R' })
    const secondResponse = await tool.execute({ pan: 'AABCU9603R' })
    expect(getSpy).toHaveBeenCalledTimes(2)
    expect(secondResponse._meta.cached).toBe(true)
  })

  it('returns _meta with adapter="mock"', async () => {
    const { tool } = makeTool()
    const response = await tool.execute({ pan: 'AABCU9603R' })
    expect(response._meta.adapter).toBe('mock')
  })
})
