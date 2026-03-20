# Contributing to Bharat MCP

Thank you for helping build India's open-source business intelligence layer for AI. This guide covers everything you need to contribute code, tools, adapters, or translations.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How to Add a New Tool](#how-to-add-a-new-tool)
- [How to Add a New Adapter](#how-to-add-a-new-adapter)
- [How to Add a New Language](#how-to-add-a-new-language)
- [PR Process](#pr-process)
- [Code Style](#code-style)

---

## Development Setup

**Prerequisites:** Node.js 20+, pnpm 9+

```bash
# 1. Fork and clone
git clone https://github.com/<your-fork>/bharat-mcp.git
cd bharat-mcp

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.example .env
# Add your SANDBOX_API_KEY and SANDBOX_API_SECRET, or leave blank for mock mode

# 4. Build all packages
pnpm build

# 5. Run all tests
pnpm test

# 6. Run a server in dev mode (watch mode)
pnpm dev:gst   # GST server
pnpm dev:mca   # MCA server
```

---

## Project Structure

```
bharat-mcp/
├── packages/
│   ├── core/          # Shared: AdapterChain, i18n, risk scoring, types
│   ├── gst/           # GST Intelligence MCP server
│   └── mca/           # Company Intelligence MCP server
├── docker/            # Docker Compose for containerised deployment
├── docs/              # Documentation assets (demo GIFs, diagrams)
├── turbo.json         # Turborepo pipeline config
└── pnpm-workspace.yaml
```

Each package under `packages/` is independently publishable to npm as `@bharat-mcp/<name>`.

---

## How to Add a New Tool

Tools live in `packages/gst/src/tools/` or `packages/mca/src/tools/`. Each tool is a single file exporting a tool definition and handler.

### Steps

1. **Create the tool file**

```typescript
// packages/gst/src/tools/my_new_tool.ts
import { z } from 'zod';
import type { AdapterChain } from '@bharat-mcp/core';

export const myNewToolDefinition = {
  name: 'my_new_tool',
  description: 'What this tool does — shown to Claude',
  inputSchema: z.object({
    param: z.string().describe('Description of the param'),
  }),
};

export async function myNewToolHandler(
  input: z.infer<typeof myNewToolDefinition.inputSchema>,
  adapter: AdapterChain,
  locale: 'en' | 'hi' = 'en'
) {
  const raw = await adapter.call('endpoint/path', { param: input.param });
  // transform and return structured response
  return { result: raw };
}
```

2. **Register the tool** in `packages/gst/src/index.ts` (add to the tools array).

3. **Add i18n strings** for the tool's output labels in `packages/core/src/i18n/en.ts` and `packages/core/src/i18n/hi.ts`.

4. **Write tests** in `packages/gst/src/tools/__tests__/my_new_tool.test.ts` using Vitest. Tests must use the mock adapter — never call live APIs in tests.

```typescript
import { describe, it, expect } from 'vitest';
import { myNewToolHandler } from '../my_new_tool';
import { createMockAdapter } from '@bharat-mcp/core/testing';

describe('myNewTool', () => {
  it('returns structured result', async () => {
    const adapter = createMockAdapter({ 'endpoint/path': { data: 'mock' } });
    const result = await myNewToolHandler({ param: 'test' }, adapter);
    expect(result.result).toBeDefined();
  });
});
```

5. Run `pnpm test` and confirm all tests pass before opening a PR.

---

## How to Add a New Adapter

Adapters live in `packages/core/src/adapters/`. They implement the `Adapter` interface.

```typescript
// packages/core/src/adapters/my_adapter.ts
import type { Adapter, AdapterRequest, AdapterResponse } from '../types';

export class MyAdapter implements Adapter {
  readonly name = 'my-adapter';

  async call(endpoint: string, params: Record<string, unknown>): Promise<AdapterResponse> {
    // Make the HTTP call and return a normalised response
  }
}
```

Register the new adapter in `packages/core/src/adapter-chain.ts` and add its config keys to the `.env.example` file.

---

## How to Add a New Language

All user-facing strings are in `packages/core/src/i18n/`.

1. Copy `en.ts` to `<lang-code>.ts` (e.g., `ta.ts` for Tamil).
2. Translate all string values. Keep the keys identical.
3. Add the new locale to the `Locale` union type in `packages/core/src/types.ts`.
4. Add it to the locale detection logic in `packages/core/src/i18n/index.ts`.
5. Update the `Hindi + English` badge in README.md to reflect the new language count.

---

## PR Process

1. **Branch naming:** `feat/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>`
2. **One concern per PR** — do not bundle unrelated changes.
3. **Tests required** — PRs without tests for new behaviour will not be merged.
4. **All checks must pass** — `pnpm build`, `pnpm test`, `pnpm lint`.
5. **PR description** — explain what changed and why. Link any related issue.
6. A maintainer will review within 48 hours on weekdays.

---

## Code Style

| Concern | Convention |
|---|---|
| Language | TypeScript strict mode (`"strict": true` in tsconfig) |
| Test framework | Vitest |
| Test approach | TDD — write the test first, then the implementation |
| Linting | ESLint with `@typescript-eslint` |
| Formatting | Prettier (run on save) |
| Imports | Named imports preferred; no default exports from tool files |
| Error handling | Always return a typed error object — never throw from a tool handler |
| Commit messages | Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`) |

### Guiding Principles

- **Mock by default in tests.** Never hit live APIs in the test suite.
- **i18n from day one.** Every user-facing string goes through the i18n layer.
- **Schema-first.** Define Zod schemas before writing handler logic.
- **No secrets in code.** API keys and secrets go in `.env` only, which is gitignored.
