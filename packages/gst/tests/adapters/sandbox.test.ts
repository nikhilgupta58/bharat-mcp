import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { SandboxGSTAdapter } from '../../src/adapters/sandbox'
import {
  AuthError,
  RateLimitError,
  TimeoutError,
  MalformedResponseError,
  EntityNotFoundError,
} from '@bharat-mcp/core'

vi.mock('axios')
const mockedAxios = vi.mocked(axios, true)

const SAMPLE_GSTIN = '27AABCU9603R1ZN'

const SAMPLE_RESPONSE_DATA = {
  gstin: SAMPLE_GSTIN,
  lgnm: 'UNISON CHEMICALS PRIVATE LIMITED',
  tradeNam: 'UNISON CHEMICALS',
  sts: 'Active',
  rgdt: '01/07/2017',
  lstupdt: '15/03/2024',
  ctb: 'Private Limited Company',
  dty: 'Regular',
  pradr: { bno: '123', st: 'INDUSTRIAL AREA', loc: 'THANE', dst: 'THANE', stcd: 'Maharashtra', pncd: '400601' },
  stj: 'Maharashtra',
  nba: ['Wholesale Business'],
}

describe('SandboxGSTAdapter', () => {
  let adapter: SandboxGSTAdapter

  beforeEach(() => {
    adapter = new SandboxGSTAdapter('test-api-key', 'test-api-secret')
    vi.clearAllMocks()
  })

  it('maps a successful response to GSTINResult correctly', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { code: 200, data: SAMPLE_RESPONSE_DATA },
    })

    const result = await adapter.fetch({ gstin: SAMPLE_GSTIN })

    expect(result.gstin).toBe(SAMPLE_GSTIN)
    expect(result.legalName).toBe('UNISON CHEMICALS PRIVATE LIMITED')
    expect(result.tradeName).toBe('UNISON CHEMICALS')
    expect(result.status).toBe('Active')
    expect(result.registrationDate).toBe('01/07/2017')
    expect(result.constitutionOfBusiness).toBe('Private Limited Company')
    expect(result.taxpayerType).toBe('Regular')
    expect(result.state).toBe('Maharashtra')
    expect(result.natureOfBusiness).toEqual(['Wholesale Business'])
    expect(result.address).toContain('INDUSTRIAL AREA')
  })

  it('throws AuthError on 401 response', async () => {
    const err: any = new Error('Unauthorized')
    err.response = { status: 401, data: { message: 'Invalid API key' } }
    mockedAxios.get = vi.fn().mockRejectedValue(err)

    await expect(adapter.fetch({ gstin: SAMPLE_GSTIN })).rejects.toThrow(AuthError)
  })

  it('throws AuthError on 403 response', async () => {
    const err: any = new Error('Forbidden')
    err.response = { status: 403, data: { message: 'Access denied' } }
    mockedAxios.get = vi.fn().mockRejectedValue(err)

    await expect(adapter.fetch({ gstin: SAMPLE_GSTIN })).rejects.toThrow(AuthError)
  })

  it('throws RateLimitError on 429 response', async () => {
    const err: any = new Error('Too Many Requests')
    err.response = { status: 429, data: { message: 'Rate limit exceeded' } }
    mockedAxios.get = vi.fn().mockRejectedValue(err)

    await expect(adapter.fetch({ gstin: SAMPLE_GSTIN })).rejects.toThrow(RateLimitError)
  })

  it('throws TimeoutError on ECONNABORTED', async () => {
    const err: any = new Error('timeout')
    err.code = 'ECONNABORTED'
    mockedAxios.get = vi.fn().mockRejectedValue(err)

    await expect(adapter.fetch({ gstin: SAMPLE_GSTIN })).rejects.toThrow(TimeoutError)
  })

  it('throws TimeoutError on ETIMEDOUT', async () => {
    const err: any = new Error('timeout')
    err.code = 'ETIMEDOUT'
    mockedAxios.get = vi.fn().mockRejectedValue(err)

    await expect(adapter.fetch({ gstin: SAMPLE_GSTIN })).rejects.toThrow(TimeoutError)
  })

  it('throws MalformedResponseError when response body is a string (HTML)', async () => {
    const err: any = new Error('HTML response')
    err.response = { status: 200, data: '<html><body>Error</body></html>' }
    mockedAxios.get = vi.fn().mockRejectedValue(err)

    await expect(adapter.fetch({ gstin: SAMPLE_GSTIN })).rejects.toThrow(MalformedResponseError)
  })

  it('throws MalformedResponseError when response code is unexpected', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { code: 500, message: 'Internal Server Error' },
    })

    await expect(adapter.fetch({ gstin: SAMPLE_GSTIN })).rejects.toThrow(MalformedResponseError)
  })

  it('throws EntityNotFoundError when message includes not found', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { code: 422, message: 'GSTIN not found in database' },
    })

    await expect(adapter.fetch({ gstin: '99ZZZZZ9999Z1ZZ' })).rejects.toThrow(EntityNotFoundError)
  })

  it('throws EntityNotFoundError when response code is 404', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { code: 404, message: 'Not found' },
    })

    await expect(adapter.fetch({ gstin: '99ZZZZZ9999Z1ZZ' })).rejects.toThrow(EntityNotFoundError)
  })

  it('healthCheck returns true on successful call', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { code: 200 } })
    const result = await adapter.healthCheck()
    expect(result).toBe(true)
  })

  it('healthCheck returns false on error', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('Network error'))
    const result = await adapter.healthCheck()
    expect(result).toBe(false)
  })

  it('formats address object into a string', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        code: 200,
        data: {
          ...SAMPLE_RESPONSE_DATA,
          pradr: { bno: '5', st: 'MG ROAD', loc: 'PUNE', pncd: '411001' },
        },
      },
    })

    const result = await adapter.fetch({ gstin: SAMPLE_GSTIN })
    expect(result.address).toBe('5, MG ROAD, PUNE, 411001')
  })

  it('handles plain string address', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        code: 200,
        data: { ...SAMPLE_RESPONSE_DATA, address: '123 Main St, Mumbai', pradr: undefined },
      },
    })

    const result = await adapter.fetch({ gstin: SAMPLE_GSTIN })
    expect(result.address).toBe('123 Main St, Mumbai')
  })
})
