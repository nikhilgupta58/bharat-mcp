import { ValidationError, EntityNotFoundError } from '@bharat-mcp/core'
import type { ToolResponse, GSTRateResult } from '@bharat-mcp/core'
import gstRates from '../data/gst-rates.json'
import hsnCodes from '../data/hsn-codes.json'

export interface GSTRateCalcInput {
  hsn_code: string
  supply_type: 'intra_state' | 'inter_state'
  taxable_value?: number
}

export interface GSTRateCalcResult extends GSTRateResult {
  taxableValue?: number
  taxAmount?: number
  totalValue?: number
  cessRate: number
  cessAmount?: number
}

export class GSTRateCalcTool {
  private ratesMap: Map<string, typeof gstRates[0]>
  private hsnMap: Map<string, typeof hsnCodes[0]>

  constructor() {
    this.ratesMap = new Map(gstRates.map(r => [r.hsnCode, r]))
    this.hsnMap = new Map(hsnCodes.map(h => [h.hsnCode, h]))
  }

  async execute(rawInput: unknown): Promise<ToolResponse<GSTRateCalcResult>> {
    const input = this.validate(rawInput)

    const rate = this.ratesMap.get(input.hsn_code)
    const hsnInfo = this.hsnMap.get(input.hsn_code)

    if (!rate) {
      throw new EntityNotFoundError('HSN', input.hsn_code)
    }

    let cgstRate: number
    let sgstRate: number
    let igstRate: number

    if (input.supply_type === 'intra_state') {
      cgstRate = rate.baseRate / 2
      sgstRate = rate.baseRate / 2
      igstRate = 0
    } else {
      cgstRate = 0
      sgstRate = 0
      igstRate = rate.baseRate
    }

    const result: GSTRateCalcResult = {
      goodsOrServices: (rate.hsnCode.startsWith('99') ? 'Services' : 'Goods') as 'Goods' | 'Services',
      description: rate.description,
      hsn: rate.hsnCode,
      igstRate,
      cgstRate,
      sgstRate,
      chapter: hsnInfo?.chapterHeading ?? `Chapter ${rate.hsnCode.slice(0, 2)}`,
      cessRate: rate.cessRate,
    }

    if (typeof input.taxable_value === 'number') {
      const taxAmount =
        (input.taxable_value * rate.baseRate) / 100 +
        (input.taxable_value * rate.cessRate) / 100
      const cessAmount = (input.taxable_value * rate.cessRate) / 100
      result.taxableValue = input.taxable_value
      result.taxAmount = Math.round(taxAmount * 100) / 100
      result.cessAmount = Math.round(cessAmount * 100) / 100
      result.totalValue = Math.round((input.taxable_value + taxAmount) * 100) / 100
    }

    return {
      data: result,
      _meta: {
        adapter: 'bundled',
        cached: false,
        fetchedAt: new Date().toISOString(),
        latencyMs: 0,
        partial: false,
        locale: 'en',
      },
    }
  }

  validate(raw: unknown): GSTRateCalcInput {
    const input = raw as Record<string, unknown>
    if (!input?.hsn_code || typeof input.hsn_code !== 'string' || input.hsn_code.trim().length < 2) {
      throw new ValidationError('hsn_code must be a non-empty string of at least 2 characters')
    }
    const supplyType = input.supply_type as string
    if (supplyType !== 'intra_state' && supplyType !== 'inter_state') {
      throw new ValidationError("supply_type must be 'intra_state' or 'inter_state'")
    }
    const result: GSTRateCalcInput = {
      hsn_code: input.hsn_code.trim(),
      supply_type: supplyType,
    }
    if (input.taxable_value !== undefined) {
      const val = Number(input.taxable_value)
      if (isNaN(val) || val < 0) {
        throw new ValidationError('taxable_value must be a non-negative number')
      }
      result.taxable_value = val
    }
    return result
  }
}
