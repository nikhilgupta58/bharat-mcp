import { ValidationError } from '@bharat-mcp/core'
import type { ToolResponse, HSNResult } from '@bharat-mcp/core'
import hsnData from '../data/hsn-codes.json'

export class HSNSearchTool {
  private dataMap: Map<string, typeof hsnData[0]>
  private dataArray: typeof hsnData

  constructor() {
    this.dataArray = hsnData
    this.dataMap = new Map(hsnData.map(h => [h.hsnCode, h]))
  }

  async execute(rawInput: unknown): Promise<ToolResponse<HSNResult[]>> {
    const input = this.validate(rawInput)

    let results: typeof hsnData
    if (/^\d+$/.test(input.query)) {
      // Numeric query: exact match first, then prefix match
      const exact = this.dataMap.get(input.query)
      if (exact) {
        results = [exact]
      } else {
        results = this.dataArray.filter(h => h.hsnCode.startsWith(input.query))
      }
    } else {
      // Text query: case-insensitive description or chapter heading search
      const q = input.query.toLowerCase()
      results = this.dataArray.filter(
        h =>
          h.description.toLowerCase().includes(q) ||
          h.chapterHeading.toLowerCase().includes(q),
      )
    }

    return {
      data: results.slice(0, input.limit).map(this.mapToHSNResult),
      _meta: {
        adapter: 'bundled',
        cached: false,
        fetchedAt: new Date().toISOString(),
        latencyMs: 0,
        partial: results.length > input.limit,
        locale: 'en',
      },
    }
  }

  validate(raw: unknown): { query: string; limit: number } {
    const input = raw as Record<string, unknown>
    if (!input?.query || typeof input.query !== 'string' || input.query.trim().length < 2) {
      throw new ValidationError('Query must be at least 2 characters')
    }
    const limit = typeof input.limit === 'number' ? input.limit : Number(input.limit) || 20
    return { query: input.query.trim(), limit: limit > 0 ? limit : 20 }
  }

  private mapToHSNResult(item: typeof hsnData[0]): HSNResult {
    const half = item.gstRate / 2
    return {
      hsn: item.hsnCode,
      description: item.description,
      igstRate: item.gstRate,
      cgstRate: half,
      sgstRate: half,
      cessRate: 0,
      effectiveDate: '2017-07-01',
    }
  }
}
