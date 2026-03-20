import { BaseTool, ValidationError } from '@bharat-mcp/core'
import type { GSTINResult } from '@bharat-mcp/core'

export interface GSTINByPANInput {
  pan: string
}

// PAN format: 5 alpha + 4 numeric + 1 alpha (total 10 chars), uppercase
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/

function normalizePAN(pan: string): string {
  return pan.trim().toUpperCase()
}

export class GSTINByPANTool extends BaseTool<GSTINByPANInput, GSTINResult[]> {
  validate(rawInput: unknown): GSTINByPANInput {
    const input = rawInput as Record<string, unknown>
    const pan = typeof input?.pan === 'string' ? normalizePAN(input.pan) : ''
    if (!PAN_REGEX.test(pan)) {
      throw new ValidationError('Invalid PAN format. Expected 10 alphanumeric characters (e.g., ABCDE1234F).')
    }
    return { pan }
  }

  cacheKey(input: GSTINByPANInput): string {
    return `gstin:pan:${input.pan}`
  }

  get ttl(): number {
    return 86400 // 24 hours
  }
}
