#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createGSTServer } from './server.js'

export { createGSTServer } from './server.js'

// Tool exports
export { GSTINVerifyTool } from './tools/gstin-verify.js'
export { HSNSearchTool } from './tools/hsn-search.js'
export { GSTRateCalcTool } from './tools/gst-rate-calc.js'
export { GSTReturnStatusTool } from './tools/gst-return-status.js'
export { GSTINByPANTool } from './tools/gstin-by-pan.js'

// Adapter exports
export { GSTMockAdapter, GSTReturnStatusMockAdapter, GSTINByPANMockAdapter } from './adapters/mock.js'
export { SandboxGSTAdapter } from './adapters/sandbox.js'

// Prompt exports
export { vendorDueDiligencePrompt, buildVendorDueDiligenceMessages } from './prompts/vendor-due-diligence.js'

// Only run when executed directly (not imported as a library)
if (process.argv[1] && process.argv[1].includes('index')) {
  const server = createGSTServer({
    sandboxApiKey: process.env.SANDBOX_API_KEY,
    redisUrl: process.env.REDIS_URL,
    locale: (process.env.BHARAT_MCP_LOCALE as 'en' | 'hi') || 'en'
  })

  const transport = new StdioServerTransport()
  server.connect(transport).catch(console.error)
}
