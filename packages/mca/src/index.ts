#!/usr/bin/env node
export { createMCAServer, startServer } from './server.js'
export type { MCAServerOptions } from './server.js'

import { startServer } from './server.js'

// Only run when executed directly (not imported as a library)
if (process.argv[1] && process.argv[1].includes('index')) {
  const locale = (process.env['MCA_LOCALE'] as 'en' | 'hi' | undefined) ?? 'en'
  const redisUrl = process.env['REDIS_URL']
  const sandboxApiKey = process.env['SANDBOX_API_KEY']

  startServer({ locale, redisUrl, sandboxApiKey }).catch((err) => {
    console.error('Failed to start MCA MCP server:', err)
    process.exit(1)
  })
}
