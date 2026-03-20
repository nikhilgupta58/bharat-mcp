# भारत MCP — India's Business Brain for AI

> Open-source MCP servers that give Claude real-time access to India's GST and MCA business registries. Verify GSTINs, look up companies, assess vendor risk — in English and Hindi.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@bharat-mcp/gst?label=npm%20%40bharat-mcp%2Fgst)](https://www.npmjs.com/package/@bharat-mcp/gst)
[![10 Tools](https://img.shields.io/badge/tools-10-orange)](https://github.com/nikhilkumargupta/bharat-mcp)
[![Hindi + English](https://img.shields.io/badge/language-Hindi%20%2B%20English-saffron)](https://github.com/nikhilkumargupta/bharat-mcp)

<!-- Demo GIF placeholder — 30s vendor verification flow -->
![Demo](docs/demo.gif)

---

## Quick Start

```bash
# Install GST Intelligence Server
npx @bharat-mcp/gst

# Install Company Intelligence Server
npx @bharat-mcp/mca
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bharat-mcp-gst": {
      "command": "npx",
      "args": ["@bharat-mcp/gst"],
      "env": {
        "SANDBOX_API_KEY": "your-key-here",
        "SANDBOX_API_SECRET": "your-secret-here"
      }
    },
    "bharat-mcp-mca": {
      "command": "npx",
      "args": ["@bharat-mcp/mca"],
      "env": {
        "SANDBOX_API_KEY": "your-key-here",
        "SANDBOX_API_SECRET": "your-secret-here"
      }
    }
  }
}
```

> Without an API key, Bharat MCP uses curated mock data — perfect for trying it out.

---

## Tools

| GST Intelligence | Company Intelligence |
|---|---|
| `gstin_verify` — Verify GSTIN registration status | `company_lookup` — Look up company by CIN, name, or PAN |
| `hsn_search` — Search HSN/SAC codes and descriptions | `director_search` — Search director by DIN or name |
| `gst_rate_calculator` — Calculate applicable GST rates | `cin_validate` — Validate and parse a CIN |
| `gst_return_status` — Check GST filing status | `company_compliance_check` — Check MCA filing compliance |
| `gstin_by_pan` — List all GSTINs registered to a PAN | `director_network_map` — Map all companies linked to a director |

### Cross-Module Features

- **Entity Resolution** — GSTIN → PAN → CIN automatic cross-referencing
- **Risk Scoring** — Weighted risk assessment across GST + MCA signals
- **Vendor Due Diligence** — One-command comprehensive vendor check
- **Business Health Report** — Full business assessment report in English or Hindi

---

## Why Bharat MCP?

**For CAs and Tax Professionals** — Stop spending hours on manual GSTIN verification. Ask Claude and get instant, structured results with filing history.

**For Startup Founders** — Verify vendors before signing contracts. Cross-reference GST registration and MCA filings in seconds.

**For MSME Business Owners** — "मेरे vendor का GST number check करो" — Hindi queries work natively.

**For Developers** — Build Indian compliance features into your SaaS using MCP-standard tools with full TypeScript types.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Claude (AI Client)                  │
└────────────────────────┬────────────────────────────────┘
                         │  MCP Protocol (JSON-RPC 2.0)
           ┌─────────────┴──────────────┐
           │                            │
  ┌────────▼────────┐          ┌────────▼────────┐
  │   GST Server    │          │   MCA Server    │
  │  @bharat-mcp/   │          │  @bharat-mcp/   │
  │      gst        │          │      mca        │
  └────────┬────────┘          └────────┬────────┘
           │                            │
           └─────────────┬──────────────┘
                         │
              ┌──────────▼──────────┐
              │    @bharat-mcp/     │
              │       core          │
              │  AdapterChain +     │
              │  i18n + Risk Score  │
              └──────────┬──────────┘
                         │
           ┌─────────────┴──────────────┐
           │                            │
  ┌────────▼────────┐          ┌────────▼────────┐
  │ Sandbox Adapter │          │  Mock Adapter   │
  │ (sandbox.co.in) │          │ (dev / no key)  │
  └─────────────────┘          └─────────────────┘
```

---

## Getting a Sandbox API Key

1. Sign up at [sandbox.co.in](https://sandbox.co.in)
2. Get your API key and secret from the dashboard
3. Add them to your Claude Desktop config or a `.env` file at the repo root

```env
SANDBOX_API_KEY=your-key-here
SANDBOX_API_SECRET=your-secret-here
```

---

## Docker Deployment

```bash
docker compose -f docker/docker-compose.yml up
```

---

## Development

```bash
# Clone the repo
git clone https://github.com/nikhilkumargupta/bharat-mcp.git
cd bharat-mcp

# Install dependencies (requires pnpm)
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for a full guide on adding tools, adapters, and languages.

---

## Roadmap

- [ ] Module 3: Compliance Hub (EPFO, Udyam, FSSAI)
- [ ] Full Indic localisation (9 additional languages)
- [ ] Interactive docs playground
- [ ] API Setu adapter (alternative to Sandbox)
- [ ] Webhook notifications for compliance changes
- [ ] Enterprise features (SLA, audit logs, billing)

See [TODOS.md](TODOS.md) for the full prioritised backlog.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## License

MIT — see [LICENSE](LICENSE)
