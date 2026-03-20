import axios from 'axios'
import type { DataAdapter, GSTINResult } from '@bharat-mcp/core'
import {
  AuthError,
  RateLimitError,
  TimeoutError,
  MalformedResponseError,
  EntityNotFoundError,
} from '@bharat-mcp/core'

export class SandboxGSTAdapter implements DataAdapter<{ gstin: string }, GSTINResult> {
  name = 'sandbox'

  constructor(
    private apiKey: string,
    private apiSecret: string,
    private baseUrl = 'https://api.sandbox.co.in'
  ) {}

  async fetch(query: { gstin: string }): Promise<GSTINResult> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/gst/search/${query.gstin}`,
        {
          headers: {
            'x-api-key': this.apiKey,
            'x-api-secret': this.apiSecret,
            'x-api-version': '2.0',
            'Accept': 'application/json',
          },
          timeout: 10000,
        }
      )

      if (!response.data || response.data.code !== 200) {
        if (
          response.data?.message?.toLowerCase().includes('not found') ||
          response.data?.code === 404
        ) {
          throw new EntityNotFoundError('GSTIN', query.gstin)
        }
        throw new MalformedResponseError(
          'sandbox',
          `Unexpected response: ${JSON.stringify(response.data).substring(0, 200)}`
        )
      }

      return this.mapResponse(response.data.data)
    } catch (err: any) {
      if (err instanceof EntityNotFoundError) throw err
      if (err instanceof MalformedResponseError) throw err
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new AuthError('sandbox')
      }
      if (err.response?.status === 429) {
        throw new RateLimitError('sandbox')
      }
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        throw new TimeoutError('sandbox', 10000)
      }
      if (err.response && typeof err.response.data === 'string') {
        throw new MalformedResponseError('sandbox', 'HTML response instead of JSON')
      }
      throw err
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/gst/search/07AABCU9603R1ZP`, {
        headers: {
          'x-api-key': this.apiKey,
          'x-api-secret': this.apiSecret,
          'x-api-version': '2.0',
        },
        timeout: 5000,
      })
      return true
    } catch {
      return false
    }
  }

  private mapResponse(data: any): GSTINResult {
    return {
      gstin: data.gstin || data.gst_number || '',
      legalName: data.legal_name || data.lgnm || '',
      tradeName: data.trade_name || data.tradeNam || '',
      status: this.mapStatus(data.status || data.sts || ''),
      registrationDate: data.registration_date || data.rgdt || '',
      lastUpdated: data.last_updated || data.lstupdt || new Date().toISOString(),
      constitutionOfBusiness: data.constitution_of_business || data.ctb || '',
      taxpayerType: data.taxpayer_type || data.dty || '',
      address: this.formatAddress(
        data.address || data.pradr || data.principal_address || {}
      ),
      state: data.state || data.stj || '',
      pincode: data.pincode || '',
      natureOfBusiness: data.nature_of_business || data.nba || [],
    }
  }

  private mapStatus(status: string): GSTINResult['status'] {
    const s = status.toLowerCase()
    if (s.includes('active')) return 'Active'
    if (s.includes('cancel')) return 'Cancelled'
    if (s.includes('suspend')) return 'Suspended'
    return 'Inactive'
  }

  private formatAddress(addr: any): string {
    if (typeof addr === 'string') return addr
    const parts = [
      addr.bno,
      addr.st,
      addr.loc,
      addr.city,
      addr.dst,
      addr.stcd,
      addr.pncd,
    ].filter(Boolean)
    return parts.join(', ') || 'Address not available'
  }
}
