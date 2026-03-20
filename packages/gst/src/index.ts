#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createGSTServer } from './server.js'

export { createGSTServer } from './server.js'

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
