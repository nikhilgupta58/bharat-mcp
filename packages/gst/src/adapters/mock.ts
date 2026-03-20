import type { DataAdapter, GSTINResult } from '@bharat-mcp/core'
import { EntityNotFoundError } from '@bharat-mcp/core'
import fixtures from '../data/mock-fixtures.json'

export class GSTMockAdapter implements DataAdapter<{ gstin: string }, GSTINResult> {
  name = 'mock'

  private data: Map<string, GSTINResult>

  constructor() {
    this.data = new Map(fixtures.map(f => [f.gstin, f as GSTINResult]))
  }

  async fetch(query: { gstin: string }): Promise<GSTINResult> {
    const result = this.data.get(query.gstin.toUpperCase())
    if (!result) throw new EntityNotFoundError('GSTIN', query.gstin)
    return result
  }

  async healthCheck() { return true }
}
