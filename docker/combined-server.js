#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Combined MCP server — all 10 tools (5 GST + 5 MCA) via stdio transport.
 * Also starts an HTTP server on PORT (default 3000) for Docker health checks.
 *
 * Build: tsc (uses docker/tsconfig.json)
 * Run:   node docker/combined-server.js
 */
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const http_1 = require("http");
const core_1 = require("@bharat-mcp/core");
// ── GST tool + adapter imports (resolved through workspace symlink) ───────────
const mock_1 = require("@bharat-mcp/gst/src/adapters/mock");
const sandbox_1 = require("@bharat-mcp/gst/src/adapters/sandbox");
const gstin_verify_1 = require("@bharat-mcp/gst/src/tools/gstin-verify");
const hsn_search_1 = require("@bharat-mcp/gst/src/tools/hsn-search");
const gst_rate_calc_1 = require("@bharat-mcp/gst/src/tools/gst-rate-calc");
const gst_return_status_1 = require("@bharat-mcp/gst/src/tools/gst-return-status");
const gstin_by_pan_1 = require("@bharat-mcp/gst/src/tools/gstin-by-pan");
// ── MCA tool + adapter imports ───────────────────────────────────────────────
const mock_2 = require("@bharat-mcp/mca/src/adapters/mock");
const company_lookup_1 = require("@bharat-mcp/mca/src/tools/company-lookup");
const director_search_1 = require("@bharat-mcp/mca/src/tools/director-search");
const cin_validate_1 = require("@bharat-mcp/mca/src/tools/cin-validate");
const compliance_check_1 = require("@bharat-mcp/mca/src/tools/compliance-check");
const director_network_1 = require("@bharat-mcp/mca/src/tools/director-network");
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const locale = process.env.BHARAT_MCP_LOCALE ?? 'en';
const redisUrl = process.env.REDIS_URL;
const sandboxApiKey = process.env.SANDBOX_API_KEY;
const sandboxApiSecret = process.env.SANDBOX_API_SECRET ?? '';
// ── Shared infrastructure ────────────────────────────────────────────────────
const cache = new core_1.CacheLayer(redisUrl);
const i18n = new core_1.I18nService(locale);
// ── GST tools ────────────────────────────────────────────────────────────────
const gstAdapters = [];
if (sandboxApiKey) {
    gstAdapters.push(new sandbox_1.SandboxGSTAdapter(sandboxApiKey, sandboxApiSecret));
}
gstAdapters.push(new mock_1.GSTMockAdapter());
const gstChain = new core_1.AdapterChain(gstAdapters);
const gstinVerify = new gstin_verify_1.GSTINVerifyTool(cache, gstChain, i18n);
const hsnSearch = new hsn_search_1.HSNSearchTool();
const gstRateCalc = new gst_rate_calc_1.GSTRateCalcTool();
const gstReturnStatus = new gst_return_status_1.GSTReturnStatusTool(cache, new core_1.AdapterChain([new mock_1.GSTReturnStatusMockAdapter()]), i18n);
const gstinByPAN = new gstin_by_pan_1.GSTINByPANTool(cache, new core_1.AdapterChain([new mock_1.GSTINByPANMockAdapter()]), i18n);
// ── MCA tools ────────────────────────────────────────────────────────────────
const companyLookup = new company_lookup_1.CompanyLookupTool(cache, new core_1.AdapterChain([new mock_2.MCACompanyMockAdapter()]), i18n);
const directorSearch = new director_search_1.DirectorSearchTool(cache, new core_1.AdapterChain([new mock_2.MCADirectorMockAdapter()]), i18n);
const cinValidate = new cin_validate_1.CINValidateTool(cache, i18n);
const complianceCheck = new compliance_check_1.ComplianceCheckTool(cache, new core_1.AdapterChain([new mock_2.MCAComplianceMockAdapter()]), i18n);
const directorNetwork = new director_network_1.DirectorNetworkTool(cache, new core_1.AdapterChain([new mock_2.MCADirectorMockAdapter()]), i18n);
// ── MCP Server ───────────────────────────────────────────────────────────────
const server = new index_js_1.Server({ name: 'bharat-mcp-combined', version: '0.1.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: [
        // ── GST ──────────────────────────────────────────────────────────────────
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
                    taxable_value: { type: 'number', description: 'Taxable value in INR (optional)' }
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
                    financial_year: { type: 'string', description: 'Financial year in format YYYY-YY (e.g. 2023-24)' },
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
        },
        // ── MCA ──────────────────────────────────────────────────────────────────
        {
            name: 'company_lookup',
            description: 'Look up company information from MCA by CIN, company name, or PAN',
            inputSchema: {
                type: 'object',
                properties: {
                    cin: { type: 'string', description: 'Corporate Identification Number (21 chars)' },
                    company_name: { type: 'string', description: 'Company name (partial, case-insensitive)' },
                    pan: { type: 'string', description: 'Permanent Account Number (10 chars)' }
                },
                anyOf: [{ required: ['cin'] }, { required: ['company_name'] }, { required: ['pan'] }]
            }
        },
        {
            name: 'director_search',
            description: 'Search for a company director by DIN (Director Identification Number)',
            inputSchema: {
                type: 'object',
                properties: {
                    din: { type: 'string', description: 'Director Identification Number (8 digits)' }
                },
                required: ['din']
            }
        },
        {
            name: 'cin_validate',
            description: 'Validate a CIN and extract embedded metadata (listing status, NIC code, state, year, company type)',
            inputSchema: {
                type: 'object',
                properties: {
                    cin: { type: 'string', description: 'Corporate Identification Number to validate' }
                },
                required: ['cin']
            }
        },
        {
            name: 'company_compliance_check',
            description: 'Check MCA compliance filings for a company by CIN',
            inputSchema: {
                type: 'object',
                properties: {
                    cin: { type: 'string', description: 'Corporate Identification Number (21 chars)' }
                },
                required: ['cin']
            }
        },
        {
            name: 'director_network_map',
            description: 'Get all companies associated with a director by DIN',
            inputSchema: {
                type: 'object',
                properties: {
                    din: { type: 'string', description: 'Director Identification Number (8 digits)' }
                },
                required: ['din']
            }
        }
    ]
}));
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        let result;
        switch (name) {
            // GST
            case 'gstin_verify':
                result = await gstinVerify.execute(args);
                break;
            case 'hsn_search':
                result = await hsnSearch.execute(args);
                break;
            case 'gst_rate_calc':
                result = await gstRateCalc.execute(args);
                break;
            case 'gst_return_status':
                result = await gstReturnStatus.execute(args);
                break;
            case 'gstin_by_pan':
                result = await gstinByPAN.execute(args);
                break;
            // MCA
            case 'company_lookup':
                result = await companyLookup.execute(args);
                break;
            case 'director_search':
                result = await directorSearch.execute(args);
                break;
            case 'cin_validate':
                result = await cinValidate.execute(args);
                break;
            case 'company_compliance_check':
                result = await complianceCheck.execute(args);
                break;
            case 'director_network_map':
                result = await directorNetwork.execute(args);
                break;
            default:
                return {
                    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
                    isError: true
                };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const code = err.code;
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: message, code }) }],
            isError: true
        };
    }
});
// ── Health HTTP endpoint (Docker HEALTHCHECK + readiness probe) ───────────────
const httpServer = (0, http_1.createServer)((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', server: 'bharat-mcp-combined', version: '0.1.0', tools: 10 }));
        return;
    }
    res.writeHead(404);
    res.end();
});
httpServer.listen(PORT, () => {
    console.error(`[bharat-mcp] Health endpoint: http://0.0.0.0:${PORT}/health`);
});
// ── Start stdio MCP transport ─────────────────────────────────────────────────
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport).catch((err) => {
    console.error('[bharat-mcp] Fatal: could not connect transport:', err);
    process.exit(1);
});
