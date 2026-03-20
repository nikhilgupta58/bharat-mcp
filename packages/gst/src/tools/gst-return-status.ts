import { BaseTool, validateGSTIN, normalizeInput, ValidationError } from '@bharat-mcp/core'
import type { ReturnStatusResult } from '@bharat-mcp/core'

export interface GSTReturnStatusInput {
  gstin: string
  financial_year: string
  return_type: 'GSTR1' | 'GSTR3B' | 'GSTR9' | 'all'
}

function currentFinancialYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-based
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(2)}`
  }
  return `${year - 1}-${String(year).slice(2)}`
}

export class GSTReturnStatusTool extends BaseTool<GSTReturnStatusInput, ReturnStatusResult> {
  validate(rawInput: unknown): GSTReturnStatusInput {
    const input = rawInput as Record<string, unknown>
    const gstin = typeof input?.gstin === 'string' ? normalizeInput(input.gstin) : ''
    if (!validateGSTIN(gstin)) {
      throw new ValidationError('Invalid GSTIN format. Expected 15 alphanumeric characters with valid checksum.')
    }

    const financial_year =
      typeof input.financial_year === 'string' && input.financial_year.trim()
        ? input.financial_year.trim()
        : currentFinancialYear()

    const validReturnTypes = ['GSTR1', 'GSTR3B', 'GSTR9', 'all']
    const return_type =
      typeof input.return_type === 'string' && validReturnTypes.includes(input.return_type)
        ? (input.return_type as GSTReturnStatusInput['return_type'])
        : 'all'

    return { gstin, financial_year, return_type }
  }

  cacheKey(input: GSTReturnStatusInput): string {
    return `gstin:returns:${input.gstin}:${input.financial_year}`
  }

  get ttl(): number {
    return 43200 // 12 hours
  }
}
