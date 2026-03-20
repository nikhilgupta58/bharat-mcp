import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { CacheLayer, AdapterChain, I18nService } from '@bharat-mcp/core'
import { GSTMockAdapter } from './adapters/mock'
import { GSTINVerifyTool } from './tools/gstin-verify'

export function createGSTServer(options?: { sandboxApiKey?: string; redisUrl?: string; locale?: 'en' | 'hi' }) {
  const server = new Server(
    { name: 'bharat-mcp-gst', version: '0.1.0' },
    { capabilities: { tools: {} } }
  )

  const cache = new CacheLayer(options?.redisUrl)
  const i18n = new I18nService(options?.locale || 'en')

  // Build adapter chain: Mock for now, Sandbox will be added in Task 7
  const gstAdapters = [new GSTMockAdapter()]
  const gstChain = new AdapterChain(gstAdapters)

  const gstinVerify = new GSTINVerifyTool(cache, gstChain, i18n)

  // Register tool list
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{
      name: 'gstin_verify',
      description: i18n.t('gstin_verify.description'),
      inputSchema: {
        type: 'object',
        properties: {
          gstin: { type: 'string', description: 'GSTIN to verify (15 characters)' }
        },
        required: ['gstin']
      }
    }]
  }))

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'gstin_verify') {
      try {
        const result = await gstinVerify.execute(request.params.arguments)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (err: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: err.message, code: err.code }) }], isError: true }
      }
    }
    throw new Error(`Unknown tool: ${request.params.name}`)
  })

  return server
}
