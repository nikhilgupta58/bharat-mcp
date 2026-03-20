#!/usr/bin/env node
import { startServer } from './server';

const locale = (process.env['MCA_LOCALE'] as 'en' | 'hi' | undefined) ?? 'en';
const redisUrl = process.env['REDIS_URL'];
const sandboxApiKey = process.env['SANDBOX_API_KEY'];

startServer({ locale, redisUrl, sandboxApiKey }).catch((err) => {
  console.error('Failed to start MCA MCP server:', err);
  process.exit(1);
});
