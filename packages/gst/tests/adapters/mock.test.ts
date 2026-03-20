import { describe, it, expect } from 'vitest'
import { GSTMockAdapter } from '../../src/adapters/mock'
import { EntityNotFoundError } from '@bharat-mcp/core'

describe('GSTMockAdapter', () => {
  const adapter = new GSTMockAdapter()

  it('returns data for a known GSTIN', async () => {
    const result = await adapter.fetch({ gstin: '27AABCU9603R1ZN' })
    expect(result.gstin).toBe('27AABCU9603R1ZN')
    expect(result.legalName).toBe('UNISON CHEMICALS PRIVATE LIMITED')
    expect(result.status).toBe('Active')
    expect(result.state).toBe('Maharashtra')
  })

  it('is case-insensitive for GSTIN lookup', async () => {
    const result = await adapter.fetch({ gstin: '27aabcu9603r1zn' })
    expect(result.gstin).toBe('27AABCU9603R1ZN')
  })

  it('throws EntityNotFoundError for an unknown GSTIN', async () => {
    await expect(adapter.fetch({ gstin: '99ZZZZZ9999Z1ZZ' })).rejects.toThrow(EntityNotFoundError)
  })

  it('healthCheck returns true', async () => {
    const healthy = await adapter.healthCheck()
    expect(healthy).toBe(true)
  })
})
