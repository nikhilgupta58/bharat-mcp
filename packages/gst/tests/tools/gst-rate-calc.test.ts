import { describe, it, expect } from 'vitest'
import { GSTRateCalcTool } from '../../src/tools/gst-rate-calc'
import { ValidationError, EntityNotFoundError } from '@bharat-mcp/core'

function makeTool() {
  return new GSTRateCalcTool()
}

describe('GSTRateCalcTool', () => {
  it('calculates intra-state rates correctly (CGST + SGST, IGST=0)', async () => {
    const tool = makeTool()
    const response = await tool.execute({ hsn_code: '8471', supply_type: 'intra_state' })
    expect(response.data.cgstRate).toBe(9)
    expect(response.data.sgstRate).toBe(9)
    expect(response.data.igstRate).toBe(0)
  })

  it('calculates inter-state rates correctly (IGST, CGST=0, SGST=0)', async () => {
    const tool = makeTool()
    const response = await tool.execute({ hsn_code: '8471', supply_type: 'inter_state' })
    expect(response.data.igstRate).toBe(18)
    expect(response.data.cgstRate).toBe(0)
    expect(response.data.sgstRate).toBe(0)
  })

  it('includes tax amounts when taxable_value is provided', async () => {
    const tool = makeTool()
    const response = await tool.execute({
      hsn_code: '8471',
      supply_type: 'intra_state',
      taxable_value: 10000,
    })
    expect(response.data.taxableValue).toBe(10000)
    expect(response.data.taxAmount).toBe(1800) // 18% of 10000
    expect(response.data.totalValue).toBe(11800)
  })

  it('omits tax amounts when taxable_value is not provided', async () => {
    const tool = makeTool()
    const response = await tool.execute({ hsn_code: '8471', supply_type: 'inter_state' })
    expect(response.data.taxableValue).toBeUndefined()
    expect(response.data.taxAmount).toBeUndefined()
    expect(response.data.totalValue).toBeUndefined()
  })

  it('includes cess in tax amount when applicable', async () => {
    const tool = makeTool()
    // 8703 - cars: 28% + 17% cess
    const response = await tool.execute({
      hsn_code: '8703',
      supply_type: 'inter_state',
      taxable_value: 100000,
    })
    expect(response.data.cessRate).toBe(17)
    // taxAmount = 28% + 17% = 45% of 100000 = 45000
    expect(response.data.taxAmount).toBe(45000)
  })

  it('throws EntityNotFoundError for unknown HSN code', async () => {
    const tool = makeTool()
    await expect(
      tool.execute({ hsn_code: '9999', supply_type: 'intra_state' })
    ).rejects.toThrow(EntityNotFoundError)
  })

  it('throws ValidationError for missing hsn_code', async () => {
    const tool = makeTool()
    await expect(
      tool.execute({ supply_type: 'intra_state' })
    ).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for invalid supply_type', async () => {
    const tool = makeTool()
    await expect(
      tool.execute({ hsn_code: '8471', supply_type: 'invalid' })
    ).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for negative taxable_value', async () => {
    const tool = makeTool()
    await expect(
      tool.execute({ hsn_code: '8471', supply_type: 'intra_state', taxable_value: -100 })
    ).rejects.toThrow(ValidationError)
  })

  it('identifies Services correctly from chapter 99', async () => {
    const tool = makeTool()
    const response = await tool.execute({ hsn_code: '9954', supply_type: 'inter_state' })
    expect(response.data.goodsOrServices).toBe('Services')
  })

  it('identifies Goods correctly from non-chapter 99', async () => {
    const tool = makeTool()
    const response = await tool.execute({ hsn_code: '8703', supply_type: 'inter_state' })
    expect(response.data.goodsOrServices).toBe('Goods')
  })

  it('returns adapter=bundled in _meta', async () => {
    const tool = makeTool()
    const response = await tool.execute({ hsn_code: '8471', supply_type: 'intra_state' })
    expect(response._meta.adapter).toBe('bundled')
  })

  it('handles 0% rate correctly (e.g. 0401 milk)', async () => {
    const tool = makeTool()
    const response = await tool.execute({
      hsn_code: '0401',
      supply_type: 'intra_state',
      taxable_value: 5000,
    })
    expect(response.data.cgstRate).toBe(0)
    expect(response.data.sgstRate).toBe(0)
    expect(response.data.taxAmount).toBe(0)
    expect(response.data.totalValue).toBe(5000)
  })
})
