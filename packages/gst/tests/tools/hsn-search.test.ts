import { describe, it, expect } from 'vitest'
import { HSNSearchTool } from '../../src/tools/hsn-search'
import { ValidationError } from '@bharat-mcp/core'

function makeTool() {
  return new HSNSearchTool()
}

describe('HSNSearchTool', () => {
  it('returns exact code match for numeric query', async () => {
    const tool = makeTool()
    const response = await tool.execute({ query: '8471' })
    expect(response.data).toHaveLength(1)
    expect(response.data[0].hsn).toBe('8471')
    expect(response.data[0].description).toContain('computer')
  })

  it('returns prefix matches for partial numeric code', async () => {
    const tool = makeTool()
    const response = await tool.execute({ query: '87' })
    expect(response.data.length).toBeGreaterThan(1)
    response.data.forEach(r => expect(r.hsn).toMatch(/^87/))
  })

  it('returns text search results for keyword query', async () => {
    const tool = makeTool()
    const response = await tool.execute({ query: 'motorcycle' })
    expect(response.data.length).toBeGreaterThan(0)
    response.data.forEach(r =>
      expect(r.description.toLowerCase()).toContain('motorcycle')
    )
  })

  it('returns empty array for no matching results', async () => {
    const tool = makeTool()
    const response = await tool.execute({ query: 'xyznonexistentitem99' })
    expect(response.data).toHaveLength(0)
  })

  it('respects limit parameter', async () => {
    const tool = makeTool()
    const response = await tool.execute({ query: '99', limit: 3 })
    expect(response.data.length).toBeLessThanOrEqual(3)
  })

  it('defaults to limit of 20', async () => {
    const tool = makeTool()
    const response = await tool.execute({ query: 'services' })
    expect(response.data.length).toBeLessThanOrEqual(20)
  })

  it('throws ValidationError for query shorter than 2 chars', async () => {
    const tool = makeTool()
    await expect(tool.execute({ query: '8' })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for empty query', async () => {
    const tool = makeTool()
    await expect(tool.execute({ query: '' })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for non-string query', async () => {
    const tool = makeTool()
    await expect(tool.execute({ query: 123 })).rejects.toThrow(ValidationError)
  })

  it('returns adapter=bundled in _meta', async () => {
    const tool = makeTool()
    const response = await tool.execute({ query: '8471' })
    expect(response._meta.adapter).toBe('bundled')
    expect(response._meta.cached).toBe(false)
  })

  it('maps HSN result fields correctly', async () => {
    const tool = makeTool()
    const response = await tool.execute({ query: '8703' })
    const item = response.data[0]
    expect(item).toHaveProperty('hsn')
    expect(item).toHaveProperty('description')
    expect(item).toHaveProperty('igstRate')
    expect(item).toHaveProperty('cgstRate')
    expect(item).toHaveProperty('sgstRate')
    expect(item).toHaveProperty('cessRate')
    expect(item).toHaveProperty('effectiveDate')
    expect(item.igstRate).toBe(28)
    expect(item.cgstRate).toBe(14)
    expect(item.sgstRate).toBe(14)
  })

  it('searches chapter heading text as well', async () => {
    const tool = makeTool()
    const response = await tool.execute({ query: 'plastics' })
    expect(response.data.length).toBeGreaterThan(0)
  })
})
