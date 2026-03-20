import type { DataAdapter, GSTINResult, ReturnStatusResult, FilingPeriod } from '@bharat-mcp/core'
import { EntityNotFoundError } from '@bharat-mcp/core'
import fixtures from '../data/mock-fixtures.json'

// ---------------------------------------------------------------------------
// GSTIN Verify mock
// ---------------------------------------------------------------------------

export class GSTMockAdapter implements DataAdapter<{ gstin: string }, GSTINResult> {
  name = 'mock'

  private data: Map<string, GSTINResult>

  constructor() {
    this.data = new Map(fixtures.gstinFixtures.map(f => [f.gstin, f as GSTINResult]))
  }

  async fetch(query: { gstin: string }): Promise<GSTINResult> {
    const result = this.data.get(query.gstin.toUpperCase())
    if (!result) throw new EntityNotFoundError('GSTIN', query.gstin)
    return result
  }

  async healthCheck() { return true }
}

// ---------------------------------------------------------------------------
// GST Return Status mock
// ---------------------------------------------------------------------------

export interface GSTReturnStatusQuery {
  gstin: string
  financial_year: string
  return_type: 'GSTR1' | 'GSTR3B' | 'GSTR9' | 'all'
}

export class GSTReturnStatusMockAdapter implements DataAdapter<GSTReturnStatusQuery, ReturnStatusResult> {
  name = 'mock'

  private data: Map<string, FilingPeriod[]>

  constructor() {
    this.data = new Map(
      fixtures.returnStatusFixtures.map(f => [f.gstin, f.returns as FilingPeriod[]])
    )
  }

  async fetch(query: GSTReturnStatusQuery): Promise<ReturnStatusResult> {
    const returns = this.data.get(query.gstin.toUpperCase())
    if (!returns) throw new EntityNotFoundError('GSTIN', query.gstin)

    const filteredReturns =
      query.return_type === 'all'
        ? returns
        : returns.filter(r => r.type === query.return_type)

    return { gstin: query.gstin, returns: filteredReturns }
  }

  async healthCheck() { return true }
}

// ---------------------------------------------------------------------------
// GSTIN by PAN mock
// ---------------------------------------------------------------------------

export interface GSTINByPANQuery {
  pan: string
}

export class GSTINByPANMockAdapter implements DataAdapter<GSTINByPANQuery, GSTINResult[]> {
  name = 'mock'

  private gstinData: GSTINResult[]

  constructor() {
    this.gstinData = fixtures.gstinFixtures as GSTINResult[]
  }

  async fetch(query: GSTINByPANQuery): Promise<GSTINResult[]> {
    const pan = query.pan.toUpperCase()
    // PAN is embedded at chars 3-12 (index 2..11) of a GSTIN
    const results = this.gstinData.filter(
      g => g.gstin.slice(2, 12).toUpperCase() === pan
    )
    if (results.length === 0) throw new EntityNotFoundError('PAN', query.pan)
    return results
  }

  async healthCheck() { return true }
}
