import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CacheLayer, AdapterChain, I18nService } from '@bharat-mcp/core';
import { MCACompanyMockAdapter, MCADirectorMockAdapter, MCAComplianceMockAdapter } from './adapters/mock';
import { CompanyLookupTool } from './tools/company-lookup';
import { DirectorSearchTool } from './tools/director-search';
import { CINValidateTool } from './tools/cin-validate';
import { ComplianceCheckTool } from './tools/compliance-check';
import { DirectorNetworkTool } from './tools/director-network';

export interface MCAServerOptions {
  sandboxApiKey?: string;
  redisUrl?: string;
  locale?: 'en' | 'hi';
}

export function createMCAServer(options: MCAServerOptions = {}) {
  const cache = new CacheLayer(options.redisUrl);
  const i18n = new I18nService(options.locale ?? 'en');

  // Adapters
  const companyAdapter = new AdapterChain([new MCACompanyMockAdapter()]);
  const directorAdapter = new AdapterChain([new MCADirectorMockAdapter()]);
  const complianceAdapter = new AdapterChain([new MCAComplianceMockAdapter()]);

  // Tools
  const companyLookup = new CompanyLookupTool(cache, companyAdapter, i18n);
  const directorSearch = new DirectorSearchTool(cache, directorAdapter, i18n);
  const cinValidate = new CINValidateTool(cache, i18n);
  const complianceCheck = new ComplianceCheckTool(cache, complianceAdapter, i18n);
  const directorNetwork = new DirectorNetworkTool(cache, directorAdapter, i18n);

  const server = new Server(
    { name: 'bharat-mcp-mca', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'company_lookup',
        description: 'Look up company information from MCA by CIN, company name, or PAN',
        inputSchema: {
          type: 'object',
          properties: {
            cin: {
              type: 'string',
              description: 'Corporate Identification Number (21 chars, e.g. U72200KA2009PTC049889)',
            },
            company_name: {
              type: 'string',
              description: 'Company name (partial, case-insensitive)',
            },
            pan: {
              type: 'string',
              description: 'Permanent Account Number (10 chars, e.g. AAACI1234A)',
            },
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
            din: {
              type: 'string',
              description: 'Director Identification Number (8 digits, e.g. 00000111)',
            },
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
            cin: {
              type: 'string',
              description: 'Corporate Identification Number to validate',
            },
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
            cin: {
              type: 'string',
              description: 'Corporate Identification Number (21 chars)',
            },
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
            din: {
              type: 'string',
              description: 'Director Identification Number (8 digits)',
            },
          },
          required: ['din'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
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
            isError: true,
          };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      };
    }
  });

  return { server, cache };
}

export async function startServer(options: MCAServerOptions = {}) {
  const { server } = createMCAServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
