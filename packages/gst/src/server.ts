import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { CacheLayer, AdapterChain, I18nService } from '@bharat-mcp/core'
import { GSTMockAdapter, GSTReturnStatusMockAdapter, GSTINByPANMockAdapter } from './adapters/mock'
import { SandboxGSTAdapter } from './adapters/sandbox'
import { GSTINVerifyTool } from './tools/gstin-verify'
import { HSNSearchTool } from './tools/hsn-search'
import { GSTRateCalcTool } from './tools/gst-rate-calc'
import { GSTReturnStatusTool } from './tools/gst-return-status'
import { GSTINByPANTool } from './tools/gstin-by-pan'

export function createGSTServer(options?: { sandboxApiKey?: string; sandboxApiSecret?: string; redisUrl?: string; locale?: 'en' | 'hi' }) {
  const server = new Server(
    { name: 'bharat-mcp-gst', version: '0.1.0' },
    { capabilities: { tools: {} } }
  )

  const cache = new CacheLayer(options?.redisUrl)
  const i18n = new I18nService(options?.locale || 'en')

  // Build adapter chain for gstin_verify: Sandbox first (if key provided), Mock as fallback
  const gstAdapters = []
  if (options?.sandboxApiKey) {
    gstAdapters.push(new SandboxGSTAdapter(options.sandboxApiKey, options.sandboxApiSecret || ''))
  }
  gstAdapters.push(new GSTMockAdapter())
  const gstChain = new AdapterChain(gstAdapters)

  // Bundled-data tools (no adapter chain needed)
  const hsnSearch = new HSNSearchTool()
  const gstRateCalc = new GSTRateCalcTool()

  // Adapter-based tools
  const gstinVerify = new GSTINVerifyTool(cache, gstChain, i18n)
  const gstReturnStatusChain = new AdapterChain([new GSTReturnStatusMockAdapter()])
  const gstReturnStatus = new GSTReturnStatusTool(cache, gstReturnStatusChain, i18n)
  const gstinByPANChain = new AdapterChain([new GSTINByPANMockAdapter()])
  const gstinByPAN = new GSTINByPANTool(cache, gstinByPANChain, i18n)

  // Register tool list
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'gstin_verify',
        description: i18n.t('gstin_verify.description'),
        inputSchema: {
          type: 'object',
          properties: {
            gstin: { type: 'string', description: 'GSTIN to verify (15 characters)' }
          },
          required: ['gstin']
        }
      },
      {
        name: 'hsn_search',
        description: 'Search HSN codes by code number or description keyword',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'HSN code (numeric) or keyword to search in description (min 2 chars)' },
            limit: { type: 'number', description: 'Maximum number of results to return (default: 20)' }
          },
          required: ['query']
        }
      },
      {
        name: 'gst_rate_calc',
        description: 'Calculate GST breakdown (CGST/SGST/IGST) for a given HSN code and supply type',
        inputSchema: {
          type: 'object',
          properties: {
            hsn_code: { type: 'string', description: 'HSN code (4 digit or more)' },
            supply_type: { type: 'string', enum: ['intra_state', 'inter_state'], description: 'Type of supply' },
            taxable_value: { type: 'number', description: 'Taxable value in INR (optional, for tax amount calculation)' }
          },
          required: ['hsn_code', 'supply_type']
        }
      },
      {
        name: 'gst_return_status',
        description: 'Check GST return filing status for a GSTIN',
        inputSchema: {
          type: 'object',
          properties: {
            gstin: { type: 'string', description: 'GSTIN to check returns for (15 characters)' },
            financial_year: { type: 'string', description: 'Financial year in format YYYY-YY (e.g. 2023-24). Defaults to current FY.' },
            return_type: { type: 'string', enum: ['GSTR1', 'GSTR3B', 'GSTR9', 'all'], description: 'Type of return to query (default: all)' }
          },
          required: ['gstin']
        }
      },
      {
        name: 'gstin_by_pan',
        description: 'List all GSTINs registered against a PAN number',
        inputSchema: {
          type: 'object',
          properties: {
            pan: { type: 'string', description: 'PAN number (10 characters, e.g. ABCDE1234F)' }
          },
          required: ['pan']
        }
      }
    ]
  }))

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name
    const args = request.params.arguments

    try {
      let result: unknown
      if (toolName === 'gstin_verify') {
        result = await gstinVerify.execute(args)
      } else if (toolName === 'hsn_search') {
        result = await hsnSearch.execute(args)
      } else if (toolName === 'gst_rate_calc') {
        result = await gstRateCalc.execute(args)
      } else if (toolName === 'gst_return_status') {
        result = await gstReturnStatus.execute(args)
      } else if (toolName === 'gstin_by_pan') {
        result = await gstinByPAN.execute(args)
      } else {
        throw new Error(`Unknown tool: ${toolName}`)
      }
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: err.message, code: err.code }) }],
        isError: true
      }
    }
  })

  return server
}
