# Bharat MCP — Deferred Items & Roadmap

This file tracks all items deferred from the CEO review and engineering plan. Items are prioritised P1–P3 and grouped by theme.

---

## P1 — Do Next (after GST + MCA validated in production)

### Module 3: Compliance Hub
- **Scope:** New MCP server `@bharat-mcp/compliance` covering EPFO (provident fund), Udyam (MSME registration), and FSSAI (food safety licence).
- **Why deferred:** GST and MCA servers must prove the adapter pattern and risk-scoring model in production before expanding the surface area.
- **Acceptance criteria:**
  - At minimum 2 tools per registry (lookup + status check)
  - Shares `@bharat-mcp/core` AdapterChain and i18n layer
  - Full test coverage via mock adapter
  - Integrated into cross-module risk score

---

## P2 — Next Quarter

### Full Indic Localisation
- **Scope:** Support 9 additional Indian languages beyond Hindi: Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Odia.
- **Approach:** Extend `packages/core/src/i18n/` with new locale files. Locale detection via Claude conversation language or explicit user preference.
- **Dependency:** i18n architecture is in place; this is a translation + QA effort.
- **Note:** Coordinate with native speakers for financial/legal terminology accuracy.

### API Setu Adapter
- **Scope:** Alternative adapter for [API Setu](https://apisetu.gov.in/) — a government-run API gateway — so users without a Sandbox.co.in account can authenticate via the official India Stack route.
- **Why deferred:** Sandbox covers the MVP; API Setu adds redundancy and avoids third-party dependency for government data.
- **Acceptance criteria:** Drop-in replacement for `SandboxAdapter`, same interface, same tests passing with Setu mock responses.

### Interactive Docs Playground
- **Scope:** A web-based playground where developers can run Bharat MCP tools against mock data without installing anything.
- **Approach:** Lightweight Next.js app hosted on Vercel; calls a thin edge function that wraps the MCP servers in HTTP.
- **Why deferred:** Core MCP servers ship first; docs playground is a DX improvement.

### Webhook Notifications
- **Scope:** Enterprise-facing feature — push notifications when a tracked GSTIN or CIN changes status (e.g., GSTIN cancelled, company struck off).
- **Approach:** Polling worker that stores last-known state per entity, fires webhooks on diff.
- **Why deferred:** Requires persistent state (database) and a deployment target beyond the local MCP process model.

---

## P3 — Future / Enterprise

### India Stack Integration
- **Scope:** Deep integration with DigiLocker, eSign, and Account Aggregator APIs via India Stack.
- **Why deferred:** Complex onboarding (entity registration required), niche use case for initial open-source audience.
- **Revisit when:** Bharat MCP has demonstrated production adoption and there is clear demand from enterprise users.

### Pro / Enterprise Billing
- **Scope:** SaaS tier with higher rate limits, SLA guarantees, audit logs, and team management.
- **Approach:** Billing via Stripe; usage tracked per API key; metered billing for high-volume tool calls.
- **Why deferred:** Open-source traction must come first; monetisation before product-market fit is premature.
- **Note:** Architecture should avoid coupling the open-source core to any billing-specific code. Billing layer sits outside the MCP servers.

### GSP Adapter (GST Suvidha Provider)
- **Scope:** Direct integration with a licensed GST Suvidha Provider for enterprise-grade, production-certified GST API access.
- **Why deferred:** GSP agreements require legal entity registration and GST Council approval — not suitable for an early-stage open-source project.
- **Target tier:** Enterprise only; Sandbox and API Setu adapters serve all other tiers.

---

## Notes

- All P1 items should be scoped and planned before the end of the quarter following initial launch.
- P2 items should be groomed into issues with acceptance criteria before starting implementation.
- P3 items are intentionally vague — revisit with new context when the time comes.
- This file is the source of truth for deferred scope. Update it as items are completed or re-prioritised.
