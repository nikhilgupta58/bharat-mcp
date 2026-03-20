import { BaseTool, validateGSTIN, normalizeInput, ValidationError } from '@bharat-mcp/core'
import type { GSTINResult } from '@bharat-mcp/core'

export class GSTINVerifyTool extends BaseTool<{ gstin: string }, GSTINResult> {
  validate(rawInput: unknown) {
    const input = rawInput as Record<string, unknown>
    const gstin = typeof input?.gstin === 'string' ? normalizeInput(input.gstin) : ''
    if (!validateGSTIN(gstin)) {
      throw new ValidationError('Invalid GSTIN format. Expected 15 alphanumeric characters with valid checksum.')
    }
    return { gstin }
  }

  cacheKey(input: { gstin: string }) { return `gstin:verify:${input.gstin}` }
  get ttl() { return 86400 }
}
