# भारत MCP — India's Business Brain for AI

> Open-source MCP servers that give Claude real-time access to India's GST and MCA business registries. Verify GSTINs, look up companies, assess vendor risk — in English and Hindi.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@bharat-mcp/server?label=npm)](https://www.npmjs.com/package/@bharat-mcp/server)
[![10 Tools](https://img.shields.io/badge/tools-10-FF9933)](https://github.com/nikhilgupta58/bharat-mcp)
[![Hindi + English](https://img.shields.io/badge/lang-Hindi%20%2B%20English-1a1a4e)](https://github.com/nikhilgupta58/bharat-mcp)

---

## Install in Claude Desktop

**One command:**

```bash
npx @bharat-mcp/server --setup
```

This prints the config you need. Or manually add to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bharat-mcp": {
      "command": "npx",
      "args": ["-y", "@bharat-mcp/server@latest"]
    }
  }
}
```

Then **restart Claude Desktop**. That's it — 10 India business tools are now available.

> Works immediately with mock data. Add a [Sandbox.co.in](#getting-real-data) API key for real government data.

---

## Try It

Open Claude Desktop and ask:

- **"Verify GSTIN 27AAPFU0939F1ZV"** — instant GST registration check
- **"Look up company U72200KA2009PTC049889"** — MCA company details
- **"What's the GST rate for HSN 8471?"** — tax rate lookup
- **"Run vendor due diligence on GSTIN 07AADCS4212H1ZP"** — full cross-module check
- **"मेरे vendor का GST number check करो"** — works in Hindi too

---

## Tools

| GST Intelligence | Company Intelligence |
|---|---|
| `gstin_verify` — Verify GSTIN registration | `company_lookup` — Look up company by CIN/name/PAN |
| `hsn_search` — Search HSN/SAC codes | `director_search` — Search director by DIN |
| `gst_rate_calculator` — Calculate GST rates | `cin_validate` — Validate and parse CIN |
| `gst_return_status` — Check filing status | `company_compliance_check` — MCA compliance check |
| `gstin_by_pan` — List GSTINs for a PAN | `director_network_map` — Map director's companies |

### Cross-Module Features

- **Entity Resolution** — GSTIN → PAN → CIN automatic cross-referencing
- **Risk Scoring** — Weighted risk assessment across GST + MCA signals
- **Vendor Due Diligence** — One-command comprehensive vendor check
- **Business Health Report** — Full business assessment in English or Hindi

---

## Getting Real Data

Without an API key, Bharat MCP uses curated mock data — perfect for demos and evaluation.

For **real government data**, get a free API key from [Sandbox.co.in](https://sandbox.co.in):

1. Sign up at [sandbox.co.in](https://sandbox.co.in) (free trial available)
2. Copy your API key and secret from the dashboard
3. Update your Claude Desktop config:

```json
{
  "mcpServers": {
    "bharat-mcp": {
      "command": "npx",
      "args": ["-y", "@bharat-mcp/server@latest"],
      "env": {
        "SANDBOX_API_KEY": "your-key",
        "SANDBOX_API_SECRET": "your-secret"
      }
    }
  }
}
```

4. Restart Claude Desktop

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
│                     Claude Desktop                       │
└────────────────────────┬────────────────────────────────┘
                         │  MCP Protocol (stdio / HTTP)
           ┌─────────────┴──────────────┐
           │                            │
  ┌────────▼────────┐          ┌────────▼────────┐
  │   GST Server    │          │   MCA Server    │
  │ @bharat-mcp/gst │          │ @bharat-mcp/mca │
  │   5 tools       │          │   5 tools       │
  └────────┬────────┘          └────────┬────────┘
           │                            │
           └─────────────┬──────────────┘
                         │
              ┌──────────▼──────────┐
              │   @bharat-mcp/core  │
              │   AdapterChain      │
              │   EntityResolver    │
              │   RiskScorer        │
              │   i18n (EN + HI)    │
              └──────────┬──────────┘
                         │
           ┌─────────────┴──────────────┐
           │                            │
  ┌────────▼────────┐          ┌────────▼────────┐
  │ Sandbox.co.in   │          │  Mock Adapter   │
  │  (real data)    │          │  (no API key)   │
  └─────────────────┘          └─────────────────┘
```

---

## Docker Deployment

For team or remote deployments, run all 10 tools in one container:

```bash
git clone https://github.com/nikhilgupta58/bharat-mcp.git
cd bharat-mcp
docker compose -f docker/docker-compose.yml up
```

---

## Development

```bash
git clone https://github.com/nikhilgupta58/bharat-mcp.git
cd bharat-mcp
pnpm install && pnpm build && pnpm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for adding tools, adapters, and languages.

---

## Roadmap

- [ ] Compliance Hub (EPFO, Udyam, FSSAI)
- [ ] 9 more Indic languages
- [ ] Interactive docs playground
- [ ] API Setu adapter
- [ ] Webhook notifications
- [ ] Enterprise features (SLA, audit logs)

See [TODOS.md](TODOS.md) for the full backlog.

---

## License

MIT — see [LICENSE](LICENSE)

Made with ❤️ for Indian businesses by [Year1 Design](https://year1.design)
