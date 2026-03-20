#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { CacheLayer, AdapterChain, I18nService } from '@bharat-mcp/core'

// GST imports
import {
  GSTMockAdapter,
  GSTReturnStatusMockAdapter,
  GSTINByPANMockAdapter,
  SandboxGSTAdapter,
  GSTINVerifyTool,
  HSNSearchTool,
  GSTRateCalcTool,
  GSTReturnStatusTool,
  GSTINByPANTool,
  vendorDueDiligencePrompt,
  buildVendorDueDiligenceMessages,
} from '@bharat-mcp/gst'

// MCA imports
import {
  MCACompanyMockAdapter,
  MCADirectorMockAdapter,
  MCAComplianceMockAdapter,
  CompanyLookupTool,
  DirectorSearchTool,
  CINValidateTool,
  ComplianceCheckTool,
  DirectorNetworkTool,
  businessHealthReportPrompt,
  buildBusinessHealthReportMessages,
} from '@bharat-mcp/mca'

// --setup flag: print Claude Desktop config and exit
if (process.argv.includes('--setup')) {
  const config = {
    mcpServers: {
      'bharat-mcp': {
        command: 'npx',
        args: ['-y', '@bharat-mcp/server@latest'],
      },
    },
  }
  console.log('\nAdd this to your Claude Desktop config:\n')
  console.log('macOS: ~/Library/Application Support/Claude/claude_desktop_config.json')
  console.log('Windows: %APPDATA%\\Claude\\claude_desktop_config.json\n')
  console.log(JSON.stringify(config, null, 2))
  console.log('\nThen restart Claude Desktop.\n')
  console.log('For real data, add env vars:')
  console.log('  "env": { "SANDBOX_API_KEY": "your-key", "SANDBOX_API_SECRET": "your-secret" }\n')
  process.exit(0)
}

function createBharatServer(options?: {
  sandboxApiKey?: string
  sandboxApiSecret?: string
  redisUrl?: string
  locale?: 'en' | 'hi'
}) {
  const server = new Server(
    { name: 'bharat-mcp', version: '0.1.0' },
    { capabilities: { tools: {}, prompts: {} } }
  )

  const cache = new CacheLayer(options?.redisUrl)
  const i18n = new I18nService(options?.locale || 'en')

  // GST adapter chains
  const gstAdapters: any[] = []
  if (options?.sandboxApiKey) {
    gstAdapters.push(new SandboxGSTAdapter(options.sandboxApiKey, options.sandboxApiSecret || ''))
  }
  gstAdapters.push(new GSTMockAdapter())
  const gstChain = new AdapterChain(gstAdapters) as any

  // GST tools
  const gstinVerify = new GSTINVerifyTool(cache, gstChain, i18n)
  const hsnSearch = new HSNSearchTool()
  const gstRateCalc = new GSTRateCalcTool()
  const gstReturnStatus = new GSTReturnStatusTool(cache, new AdapterChain([new GSTReturnStatusMockAdapter()]) as any, i18n)
  const gstinByPAN = new GSTINByPANTool(cache, new AdapterChain([new GSTINByPANMockAdapter()]) as any, i18n)

  // MCA adapter chains
  const companyAdapter = new AdapterChain([new MCACompanyMockAdapter()]) as any
  const directorAdapter = new AdapterChain([new MCADirectorMockAdapter()]) as any
  const complianceAdapter = new AdapterChain([new MCAComplianceMockAdapter()]) as any

  // MCA tools
  const companyLookup = new CompanyLookupTool(cache, companyAdapter, i18n)
  const directorSearch = new DirectorSearchTool(cache, directorAdapter, i18n)
  const cinValidate = new CINValidateTool(cache, i18n)
  const complianceCheck = new ComplianceCheckTool(cache, complianceAdapter, i18n)
  const directorNetwork = new DirectorNetworkTool(cache, directorAdapter, i18n)

  // Register all 10 tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      // GST tools
      {
        name: 'gstin_verify',
        description: i18n.t('gstin_verify.description'),
        inputSchema: {
          type: 'object',
          properties: {
            gstin: { type: 'string', description: 'GSTIN to verify (15 characters)' },
          },
          required: ['gstin'],
        },
      },
      {
        name: 'hsn_search',
        description: 'Search HSN codes by code number or description keyword',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'HSN code (numeric) or keyword to search in description (min 2 chars)' },
            limit: { type: 'number', description: 'Maximum number of results to return (default: 20)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'gst_rate_calc',
        description: 'Calculate GST breakdown (CGST/SGST/IGST) for a given HSN code and supply type',
        inputSchema: {
          type: 'object',
          properties: {
            hsn_code: { type: 'string', description: 'HSN code (4 digit or more)' },
            supply_type: { type: 'string', enum: ['intra_state', 'inter_state'], description: 'Type of supply' },
            taxable_value: { type: 'number', description: 'Taxable value in INR (optional, for tax amount calculation)' },
          },
          required: ['hsn_code', 'supply_type'],
        },
      },
      {
        name: 'gst_return_status',
        description: 'Check GST return filing status for a GSTIN',
        inputSchema: {
          type: 'object',
          properties: {
            gstin: { type: 'string', description: 'GSTIN to check returns for (15 characters)' },
            financial_year: { type: 'string', description: 'Financial year in format YYYY-YY (e.g. 2023-24). Defaults to current FY.' },
            return_type: { type: 'string', enum: ['GSTR1', 'GSTR3B', 'GSTR9', 'all'], description: 'Type of return to query (default: all)' },
          },
          required: ['gstin'],
        },
      },
      {
        name: 'gstin_by_pan',
        description: 'List all GSTINs registered against a PAN number',
        inputSchema: {
          type: 'object',
          properties: {
            pan: { type: 'string', description: 'PAN number (10 characters, e.g. ABCDE1234F)' },
          },
          required: ['pan'],
        },
      },
      // MCA tools
      {
        name: 'company_lookup',
        description: 'Look up company information from MCA by CIN, company name, or PAN',
        inputSchema: {
          type: 'object',
          properties: {
            cin: { type: 'string', description: 'Corporate Identification Number (21 chars, e.g. U72200KA2009PTC049889)' },
            company_name: { type: 'string', description: 'Company name (partial, case-insensitive)' },
            pan: { type: 'string', description: 'Permanent Account Number (10 chars, e.g. AAACI1234A)' },
          },
          anyOf: [{ required: ['cin'] }, { required: ['company_name'] }, { required: ['pan'] }],
        },
      },
      {
        name: 'director_search',
        description: 'Search for a company director by DIN (Director Identification Number)',
        inputSchema: {
          type: 'object',
          properties: {
            din: { type: 'string', description: 'Director Identification Number (8 digits, e.g. 00000111)' },
          },
          required: ['din'],
        },
      },
      {
        name: 'cin_validate',
        description: 'Validate a CIN and extract embedded metadata (listing status, NIC code, state, year, company type)',
        inputSchema: {
          type: 'object',
          properties: {
            cin: { type: 'string', description: 'Corporate Identification Number to validate' },
          },
          required: ['cin'],
        },
      },
      {
        name: 'company_compliance_check',
        description: 'Check MCA compliance filings for a company by CIN',
        inputSchema: {
          type: 'object',
          properties: {
            cin: { type: 'string', description: 'Corporate Identification Number (21 chars)' },
          },
          required: ['cin'],
        },
      },
      {
        name: 'director_network_map',
        description: 'Get all companies associated with a director by DIN',
        inputSchema: {
          type: 'object',
          properties: {
            din: { type: 'string', description: 'Director Identification Number (8 digits)' },
          },
          required: ['din'],
        },
      },
    ],
  }))

  // Handle all 10 tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      let result: unknown

      switch (name) {
        // GST tools
        case 'gstin_verify':
          result = await gstinVerify.execute(args)
          break
        case 'hsn_search':
          result = await hsnSearch.execute(args)
          break
        case 'gst_rate_calc':
          result = await gstRateCalc.execute(args)
          break
        case 'gst_return_status':
          result = await gstReturnStatus.execute(args)
          break
        case 'gstin_by_pan':
          result = await gstinByPAN.execute(args)
          break
        // MCA tools
        case 'company_lookup':
          result = await companyLookup.execute(args)
          break
        case 'director_search':
          result = await directorSearch.execute(args)
          break
        case 'cin_validate':
          result = await cinValidate.execute(args)
          break
        case 'company_compliance_check':
          result = await complianceCheck.execute(args)
          break
        case 'director_network_map':
          result = await directorNetwork.execute(args)
          break
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: err.message, code: err.code }) }],
        isError: true,
      }
    }
  })

  // Register both prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [vendorDueDiligencePrompt, businessHealthReportPrompt],
  }))

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptArgs = request.params.arguments || {}

    if (request.params.name === 'vendor_due_diligence') {
      return buildVendorDueDiligenceMessages(
        promptArgs.gstin || '',
        promptArgs.include_directors === 'true'
      )
    }

    if (request.params.name === 'business_health_report') {
      return buildBusinessHealthReportMessages({
        gstin: promptArgs.gstin,
        cin: promptArgs.cin,
        pan: promptArgs.pan,
        includeDirectors: promptArgs.include_directors === 'true',
        includeComplianceHistory: promptArgs.include_compliance_history === 'true',
      })
    }

    throw new Error(`Unknown prompt: ${request.params.name}`)
  })

  return server
}

// Start the server
const server = createBharatServer({
  sandboxApiKey: process.env.SANDBOX_API_KEY,
  sandboxApiSecret: process.env.SANDBOX_API_SECRET,
  redisUrl: process.env.REDIS_URL,
  locale: (process.env.BHARAT_MCP_LOCALE as 'en' | 'hi') || 'en',
})

const transport = new StdioServerTransport()
server.connect(transport).catch(console.error)
