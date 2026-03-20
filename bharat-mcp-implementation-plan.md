# Bharat MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an open-source suite of MCP servers that gives Claude real-time access to India's GST and MCA business registries, with cross-module entity resolution, risk scoring, Hindi i18n, batch operations, and Docker deployment.

**Architecture:** 3-package TypeScript monorepo (core, gst, mca) using pnpm + Turborepo. Each MCP server uses the official @modelcontextprotocol/sdk. Data flows through an AdapterChain (Mock -> Sandbox.co.in -> fallback) with BaseTool abstract class for DRY tool implementation. BYOK model — users provide their own Sandbox.co.in API key; no key = mock fixtures.

**Tech Stack:** TypeScript, Node.js 20+, @modelcontextprotocol/sdk v1.x, pnpm, Turborepo, Vitest, Axios, ioredis, Docker, Mintlify

**Spec references:**
- CEO plan: `~/Desktop/bharat-mcp-ceo-plan.md`
- Eng plan: `~/Desktop/bharat-mcp-eng-plan.md`
- Design plan: `~/Desktop/bharat-mcp-design-plan.md`

---

## File Structure

```
bharat-mcp/
├── package.json                          # Monorepo root (pnpm workspace)
├── pnpm-workspace.yaml                   # Workspace config
├── turbo.json                            # Turborepo pipeline config
├── tsconfig.json                         # Root TS config (extends)
├── .gitignore
├── .env.example                          # SANDBOX_API_KEY, SANDBOX_API_SECRET, REDIS_URL
├── LICENSE                               # MIT
├── README.md
├── CONTRIBUTING.md
├── TODOS.md
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                  # Public API exports
│   │   │   ├── types.ts                  # All shared types, interfaces, SourceMeta
│   │   │   ├── errors.ts                 # Error class hierarchy
│   │   │   ├── validation.ts             # GSTIN/CIN/PAN validators (inline)
│   │   │   ├── cache.ts                  # CacheLayer (Redis -> LRU fallback)
│   │   │   ├── i18n.ts                   # I18nService (locale loader)
│   │   │   ├── adapter-chain.ts          # AdapterChain (fallback pattern)
│   │   │   ├── base-tool.ts              # BaseTool abstract class
│   │   │   ├── entity-resolver.ts        # EntityResolver (GSTIN->PAN->CIN, DI)
│   │   │   ├── risk-scorer.ts            # RiskScorer (weighted signals)
│   │   │   ├── batch-processor.ts        # BatchProcessor (chunked, AbortController)
│   │   │   └── locales/
│   │   │       ├── en.json               # English translations
│   │   │       └── hi.json               # Hindi translations
│   │   └── tests/
│   │       ├── validation.test.ts
│   │       ├── cache.test.ts
│   │       ├── adapter-chain.test.ts
│   │       ├── base-tool.test.ts
│   │       ├── entity-resolver.test.ts
│   │       ├── risk-scorer.test.ts
│   │       ├── batch-processor.test.ts
│   │       └── i18n.test.ts
│   ├── gst/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                  # MCP server entry (stdio + HTTP)
│   │   │   ├── server.ts                 # Tool/resource/prompt registration
│   │   │   ├── adapters/
│   │   │   │   ├── mock.ts               # GSTMockAdapter (test fixtures)
│   │   │   │   └── sandbox.ts            # SandboxGSTAdapter (real API)
│   │   │   ├── tools/
│   │   │   │   ├── gstin-verify.ts
│   │   │   │   ├── hsn-search.ts
│   │   │   │   ├── gst-rate-calc.ts
│   │   │   │   ├── gst-return-status.ts
│   │   │   │   └── gstin-by-pan.ts
│   │   │   ├── data/
│   │   │   │   ├── hsn-codes.json        # Bundled HSN taxonomy (~12K entries)
│   │   │   │   ├── gst-rates.json        # Bundled GST rate master
│   │   │   │   └── mock-fixtures.json    # ~10 curated GSTINs with known data
│   │   │   └── prompts/
│   │   │       └── vendor-due-diligence.ts
│   │   └── tests/
│   │       ├── adapters/
│   │       │   ├── mock.test.ts
│   │       │   └── sandbox.test.ts
│   │       └── tools/
│   │           ├── gstin-verify.test.ts
│   │           ├── hsn-search.test.ts
│   │           ├── gst-rate-calc.test.ts
│   │           ├── gst-return-status.test.ts
│   │           └── gstin-by-pan.test.ts
│   └── mca/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── server.ts
│       │   ├── adapters/
│       │   │   ├── mock.ts
│       │   │   └── sandbox.ts
│       │   ├── tools/
│       │   │   ├── company-lookup.ts
│       │   │   ├── director-search.ts
│       │   │   ├── cin-validate.ts
│       │   │   ├── compliance-check.ts
│       │   │   └── director-network.ts
│       │   ├── data/
│       │   │   └── mock-fixtures.json
│       │   └── prompts/
│       │       └── business-health-report.ts
│       └── tests/
│           ├── adapters/
│           │   ├── mock.test.ts
│           │   └── sandbox.test.ts
│           └── tools/
│               ├── company-lookup.test.ts
│               ├── director-search.test.ts
│               ├── cin-validate.test.ts
│               ├── compliance-check.test.ts
│               └── director-network.test.ts
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/
│   ├── mint.json                         # Mintlify config
│   ├── introduction.mdx
│   ├── quickstart.mdx
│   ├── quickstart-hindi.mdx
│   ├── architecture.mdx
│   └── ... (tool reference pages)
└── .github/
    └── workflows/
        ├── ci.yml                        # Test + lint on PR
        └── publish.yml                   # Publish to npm on release tag
```

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `LICENSE`
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`
- Create: `packages/gst/package.json`, `packages/gst/tsconfig.json`
- Create: `packages/mca/package.json`, `packages/mca/tsconfig.json`

- [ ] **Step 1: Create GitHub repo and clone**

```bash
# Create repo on GitHub (year1design/bharat-mcp), MIT license
gh repo create year1design/bharat-mcp --public --license mit --clone
cd bharat-mcp
```

- [ ] **Step 2: Initialize pnpm workspace**

Root `package.json`:
```json
{
  "name": "bharat-mcp",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev:gst": "pnpm --filter @bharat-mcp/gst dev",
    "dev:mca": "pnpm --filter @bharat-mcp/mca dev"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@types/node": "^20.0.0"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 3: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 4: Create package scaffolds for core, gst, mca**

`packages/core/package.json`:
```json
{
  "name": "@bharat-mcp/core",
  "version": "0.1.0",
  "description": "Shared utilities for Bharat MCP servers — validation, caching, i18n, error handling",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "ioredis": "^5.4.0",
    "lru-cache": "^11.0.0"
  },
  "license": "MIT"
}
```

`packages/gst/package.json`:
```json
{
  "name": "@bharat-mcp/gst",
  "version": "0.1.0",
  "description": "Bharat MCP GST Intelligence Server — GSTIN verification, HSN lookup, rate calculator",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "bharat-mcp-gst": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@bharat-mcp/core": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "license": "MIT"
}
```

`packages/mca/package.json` (same structure, name `@bharat-mcp/mca`, description updated for MCA).

Each package gets its own `tsconfig.json` extending root.

- [ ] **Step 5: Create .gitignore, .env.example, LICENSE**

`.env.example`:
```env
# Sandbox.co.in API credentials (BYOK — get yours at sandbox.co.in)
SANDBOX_API_KEY=
SANDBOX_API_SECRET=

# Optional: Redis URL for caching (falls back to in-memory LRU)
REDIS_URL=

# Optional: Locale (default: en)
BHARAT_MCP_LOCALE=en
```

- [ ] **Step 6: Install dependencies and verify build**

```bash
pnpm install
pnpm build
```

Expected: All 3 packages build (empty, but no errors).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialize monorepo with pnpm + turborepo + 3 packages"
```

---

## Task 2: Core — Types, Errors, Validation

**Files:**
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/errors.ts`
- Create: `packages/core/src/validation.ts`
- Create: `packages/core/src/index.ts`
- Test: `packages/core/tests/validation.test.ts`

- [ ] **Step 1: Write validation tests**

```typescript
// packages/core/tests/validation.test.ts
import { describe, it, expect } from 'vitest'
import { validateGSTIN, validateCIN, validatePAN, extractPANFromGSTIN } from '../src/validation'

describe('GSTIN validation', () => {
  it('accepts valid GSTIN', () => {
    expect(validateGSTIN('07AABCU9603R1ZM')).toBe(true)
  })
  it('rejects wrong length', () => {
    expect(validateGSTIN('07AABCU9603R1Z')).toBe(false)
  })
  it('rejects invalid checksum', () => {
    expect(validateGSTIN('07AABCU9603R1ZX')).toBe(false)
  })
  it('rejects empty/null', () => {
    expect(validateGSTIN('')).toBe(false)
    expect(validateGSTIN(null as any)).toBe(false)
  })
  it('converts Devanagari numerals', () => {
    // ०७ = 07 in Devanagari
    expect(validateGSTIN('०७AABCU9603R1ZM')).toBe(true)
  })
  it('handles lowercase input', () => {
    expect(validateGSTIN('07aabcu9603r1zm')).toBe(true)
  })
})

describe('PAN extraction from GSTIN', () => {
  it('extracts PAN (chars 2-11)', () => {
    expect(extractPANFromGSTIN('07AABCU9603R1ZM')).toBe('AABCU9603R')
  })
})

describe('CIN validation', () => {
  it('accepts valid 21-char CIN', () => {
    expect(validateCIN('U72200KA2009PTC049889')).toBe(true)
  })
  it('rejects wrong length', () => {
    expect(validateCIN('U72200KA2009PTC04988')).toBe(false)
  })
})

describe('PAN validation', () => {
  it('accepts valid 10-char PAN', () => {
    expect(validatePAN('AABCU9603R')).toBe(true)
  })
  it('rejects wrong format', () => {
    expect(validatePAN('12345')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/core && pnpm test
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Write types.ts**

```typescript
// packages/core/src/types.ts

export interface SourceMeta {
  adapter: string       // "mock" | "sandbox" | "gstn-public" | "api-setu" | "gsp"
  cached: boolean
  cachedAt?: string     // ISO 8601
  fetchedAt: string     // ISO 8601
  latencyMs: number
  partial: boolean
  locale: 'en' | 'hi'
}

export interface ToolResponse<T> {
  data: T
  _meta: SourceMeta
}

export interface DataAdapter<TQuery, TResult> {
  name: string
  fetch(query: TQuery): Promise<TResult>
  healthCheck(): Promise<boolean>
}

// DI interfaces for entity resolution
export interface GSTDataProvider {
  verifyGSTIN(gstin: string): Promise<GSTINResult>
  getReturnStatus(gstin: string, fy?: string): Promise<ReturnStatusResult>
}

export interface MCADataProvider {
  lookupByPAN(pan: string): Promise<CompanyResult[]>
  getComplianceStatus(cin: string): Promise<ComplianceResult>
}

// --- GST result types ---

export interface GSTINResult {
  gstin: string
  legalName: string
  tradeName: string
  status: 'Active' | 'Cancelled' | 'Suspended' | 'Inactive'
  registrationDate: string
  lastUpdated: string
  constitutionOfBusiness: string
  taxpayerType: string
  gstinType: string
  address: string
  state: string
  pincode: string
  natureOfBusiness: string[]
  filingStatus?: FilingPeriod[]
}

export interface FilingPeriod {
  returnType: string  // GSTR1, GSTR3B, GSTR9
  financialYear: string
  taxPeriod: string
  dateOfFiling?: string
  status: 'Filed' | 'Not Filed' | 'Unknown'
}

export interface ReturnStatusResult {
  gstin: string
  financialYear: string
  filings: FilingPeriod[]
}

export interface HSNResult {
  hsnCode: string
  description: string
  chapterHeading: string
  gstRate: number
  cgstRate: number
  sgstRate: number
  igstRate: number
  cessRate: number
}

export interface GSTRateResult {
  hsnCode: string
  description: string
  supplyType: 'intra_state' | 'inter_state'
  baseRate: number
  cgstRate: number
  sgstRate: number
  igstRate: number
  cessRate: number
  totalRate: number
  taxAmount?: number
  effectiveFrom: string
  notificationReference: string
}

// --- MCA result types ---

export interface CompanyResult {
  cin: string
  companyName: string
  registrationNumber: string
  companyCategory: string
  companySubcategory: string
  classOfCompany: string
  dateOfIncorporation: string
  registeredAddress: string
  email: string
  authorizedCapital: number
  paidUpCapital: number
  companyStatus: 'Active' | 'Strike Off' | 'Under Liquidation' | 'Dormant'
  lastAGMDate?: string
  lastBalanceSheetDate?: string
  complianceStatus: string
  whetherListed: boolean
}

export interface DirectorResult {
  din: string
  name: string
  designation: string
  appointmentDate: string
  cessationDate?: string
  companies: { cin: string; companyName: string; status: string }[]
}

export interface ComplianceResult {
  cin: string
  companyName: string
  annualReturnFiled: boolean
  financialStatementFiled: boolean
  lastFilingDate?: string
  overdueFilings: string[]
  complianceScore: number
}

// --- Risk scoring ---

export interface RiskSignal {
  source: 'gst' | 'mca'
  signal: string
  weight: 'critical' | 'high' | 'medium' | 'low'
  value: boolean | string | number
  description: string
}

export interface RiskScore {
  score: number           // 0-10 (10 = highest risk)
  confidence: 'high' | 'medium' | 'low'
  signalsAvailable: number
  signalsTotal: number
  flags: RiskSignal[]
  summary: string
}
```

- [ ] **Step 4: Write errors.ts**

```typescript
// packages/core/src/errors.ts

export class BharatMCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'BharatMCPError'
  }
}

export class UpstreamError extends BharatMCPError {
  constructor(
    message: string,
    public adapter: string,
    public statusCode?: number,
    retryable = false
  ) {
    super(message, 'UPSTREAM_ERROR', retryable)
    this.name = 'UpstreamError'
  }
}

export class TimeoutError extends UpstreamError {
  constructor(adapter: string, timeoutMs: number) {
    super(`${adapter} timed out after ${timeoutMs}ms`, adapter, undefined, true)
    this.name = 'TimeoutError'
    this.code = 'TIMEOUT'
  }
}

export class RateLimitError extends UpstreamError {
  constructor(adapter: string, retryAfterMs?: number) {
    super(`${adapter} rate limited${retryAfterMs ? `, retry after ${retryAfterMs}ms` : ''}`, adapter, 429, true)
    this.name = 'RateLimitError'
    this.code = 'RATE_LIMITED'
  }
}

export class CaptchaBlockedError extends UpstreamError {
  constructor(adapter: string) {
    super(`${adapter} returned CAPTCHA challenge`, adapter)
    this.name = 'CaptchaBlockedError'
    this.code = 'CAPTCHA_BLOCKED'
  }
}

export class MalformedResponseError extends UpstreamError {
  constructor(adapter: string, detail: string) {
    super(`${adapter} returned malformed response: ${detail}`, adapter)
    this.name = 'MalformedResponseError'
    this.code = 'MALFORMED_RESPONSE'
  }
}

export class AuthError extends UpstreamError {
  constructor(adapter: string) {
    super(`${adapter} authentication failed — check SANDBOX_API_KEY`, adapter, 401, true)
    this.name = 'AuthError'
    this.code = 'AUTH_FAILED'
  }
}

export class ValidationError extends BharatMCPError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class EntityNotFoundError extends BharatMCPError {
  constructor(entityType: string, identifier: string) {
    super(`No ${entityType} found for "${identifier}"`, 'NOT_FOUND')
    this.name = 'EntityNotFoundError'
  }
}

export class PartialDataError extends BharatMCPError {
  constructor(
    message: string,
    public availableFields: string[],
    public missingFields: string[]
  ) {
    super(message, 'PARTIAL_DATA')
    this.name = 'PartialDataError'
  }
}

export class BatchError extends BharatMCPError {
  constructor(
    public results: any[],
    public errors: { index: number; error: string }[],
    public totalItems: number
  ) {
    super(
      `Batch completed: ${results.length}/${totalItems} succeeded, ${errors.length} failed`,
      'BATCH_PARTIAL'
    )
    this.name = 'BatchError'
  }
}
```

- [ ] **Step 5: Write validation.ts (inline GSTIN checksum)**

```typescript
// packages/core/src/validation.ts

const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
}

function normalizeInput(input: string): string {
  let normalized = input.toUpperCase().trim()
  for (const [dev, ascii] of Object.entries(DEVANAGARI_DIGITS)) {
    normalized = normalized.replaceAll(dev, ascii)
  }
  return normalized
}

// GSTIN checksum: Luhn mod 36 variant
const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function gstinChecksum(gstin14: string): string {
  let factor = 1
  let sum = 0
  const mod = GSTIN_CHARSET.length

  for (let i = 0; i < 14; i++) {
    const codePoint = GSTIN_CHARSET.indexOf(gstin14[i])
    let addend = factor * codePoint
    factor = factor === 2 ? 1 : 2
    addend = Math.floor(addend / mod) + (addend % mod)
    sum += addend
  }

  const remainder = sum % mod
  const checkChar = GSTIN_CHARSET[(mod - remainder) % mod]
  return checkChar
}

export function validateGSTIN(input: unknown): boolean {
  if (typeof input !== 'string' || !input) return false
  const gstin = normalizeInput(input)
  if (gstin.length !== 15) return false
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$/.test(gstin)) return false
  const expected = gstinChecksum(gstin.substring(0, 14))
  return gstin[14] === expected
}

export function validateCIN(input: unknown): boolean {
  if (typeof input !== 'string' || !input) return false
  const cin = normalizeInput(input)
  if (cin.length !== 21) return false
  return /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(cin)
}

export function validatePAN(input: unknown): boolean {
  if (typeof input !== 'string' || !input) return false
  const pan = normalizeInput(input)
  if (pan.length !== 10) return false
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)
}

export function extractPANFromGSTIN(gstin: string): string {
  const normalized = normalizeInput(gstin)
  return normalized.substring(2, 12)
}

export function redactPAN(pan: string): string {
  if (pan.length !== 10) return '**********'
  return pan[0] + pan[1] + '****' + pan.substring(6)
}

export { normalizeInput }
```

- [ ] **Step 6: Write index.ts (public exports)**

```typescript
// packages/core/src/index.ts
export * from './types'
export * from './errors'
export * from './validation'
```

- [ ] **Step 7: Run tests**

```bash
cd packages/core && pnpm test
```

Expected: All validation tests PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/errors.ts packages/core/src/validation.ts packages/core/src/index.ts packages/core/tests/validation.test.ts
git commit -m "feat(core): add types, error hierarchy, and GSTIN/CIN/PAN validation"
```

---

## Task 3: Core — Cache Layer

**Files:**
- Create: `packages/core/src/cache.ts`
- Test: `packages/core/tests/cache.test.ts`

- [ ] **Step 1: Write cache tests**

```typescript
// packages/core/tests/cache.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { CacheLayer } from '../src/cache'

describe('CacheLayer (in-memory LRU)', () => {
  let cache: CacheLayer

  beforeEach(() => {
    cache = new CacheLayer() // no Redis URL = LRU only
  })

  it('returns undefined for cache miss', async () => {
    expect(await cache.get('missing')).toBeUndefined()
  })

  it('stores and retrieves a value', async () => {
    await cache.set('key', { foo: 'bar' }, 60)
    expect(await cache.get('key')).toEqual({ foo: 'bar' })
  })

  it('respects TTL expiry', async () => {
    await cache.set('key', 'value', 0) // 0 second TTL = expired
    // LRU cache with 0 TTL should not return the value
    expect(await cache.get('key')).toBeUndefined()
  })

  it('clears all entries', async () => {
    await cache.set('a', 1, 60)
    await cache.set('b', 2, 60)
    await cache.clear()
    expect(await cache.get('a')).toBeUndefined()
    expect(await cache.get('b')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement cache.ts**

```typescript
// packages/core/src/cache.ts
import { LRUCache } from 'lru-cache'

export class CacheLayer {
  private lru: LRUCache<string, any>
  private redis: any | null = null

  constructor(redisUrl?: string, maxLruEntries = 1000) {
    this.lru = new LRUCache({ max: maxLruEntries })

    if (redisUrl) {
      // Lazy import ioredis only if Redis URL provided
      import('ioredis').then(({ default: Redis }) => {
        this.redis = new Redis(redisUrl)
        this.redis.on('error', () => {
          // Redis failed — fall back to LRU silently
          this.redis = null
        })
      }).catch(() => {
        // ioredis not installed — LRU only
      })
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    // Try Redis first
    if (this.redis) {
      try {
        const raw = await this.redis.get(key)
        if (raw) return JSON.parse(raw) as T
      } catch {
        // Redis failed, fall through to LRU
      }
    }
    return this.lru.get(key) as T | undefined
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return

    // Set in LRU
    this.lru.set(key, value, { ttl: ttlSeconds * 1000 })

    // Set in Redis if available
    if (this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value))
      } catch {
        // Redis failed, LRU still has it
      }
    }
  }

  async clear(): Promise<void> {
    this.lru.clear()
    if (this.redis) {
      try {
        await this.redis.flushdb()
      } catch {
        // ignore
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
      this.redis = null
    }
  }
}
```

- [ ] **Step 4: Run tests, verify pass**
- [ ] **Step 5: Export from index.ts, commit**

```bash
git add packages/core/src/cache.ts packages/core/tests/cache.test.ts
git commit -m "feat(core): add cache layer with Redis -> LRU fallback"
```

---

## Task 4: Core — i18n Service

**Files:**
- Create: `packages/core/src/i18n.ts`
- Create: `packages/core/src/locales/en.json`
- Create: `packages/core/src/locales/hi.json`
- Test: `packages/core/tests/i18n.test.ts`

- [ ] **Step 1: Write i18n tests**

```typescript
// packages/core/tests/i18n.test.ts
import { describe, it, expect } from 'vitest'
import { I18nService } from '../src/i18n'

describe('I18nService', () => {
  it('returns English translation by default', () => {
    const i18n = new I18nService('en')
    expect(i18n.t('gstin_verify.description')).toContain('Verifies a GSTIN')
  })

  it('returns Hindi translation', () => {
    const i18n = new I18nService('hi')
    expect(i18n.t('gstin_verify.description')).toContain('GSTIN')
  })

  it('falls back to English for missing Hindi key', () => {
    const i18n = new I18nService('hi')
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('interpolates variables', () => {
    const i18n = new I18nService('en')
    expect(i18n.t('error.not_found', { entity: 'GSTIN', id: '123' }))
      .toContain('123')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Write locale JSON files**

`packages/core/src/locales/en.json` — English translations for all 10 tool descriptions, error messages, and risk score labels.

`packages/core/src/locales/hi.json` — Hindi translations. Conversational tone per design plan (e.g., "यह GSTIN सक्रिय है" not "GSTIN स्थिति: सक्रिय").

- [ ] **Step 4: Implement i18n.ts**

```typescript
// packages/core/src/i18n.ts
import enLocale from './locales/en.json'
import hiLocale from './locales/hi.json'

type Locale = 'en' | 'hi'
type LocaleData = Record<string, string>

const locales: Record<Locale, LocaleData> = {
  en: flattenObject(enLocale),
  hi: flattenObject(hiLocale),
}

function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenObject(value, fullKey))
    } else {
      result[fullKey] = String(value)
    }
  }
  return result
}

export class I18nService {
  private locale: Locale
  private fallback: Locale = 'en'

  constructor(locale: Locale = 'en') {
    this.locale = locale
  }

  t(key: string, vars?: Record<string, string>): string {
    let text = locales[this.locale]?.[key]
      ?? locales[this.fallback]?.[key]
      ?? key

    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replaceAll(`{{${k}}}`, v)
      }
    }
    return text
  }

  getLocale(): Locale { return this.locale }
}
```

- [ ] **Step 5: Run tests, verify pass**
- [ ] **Step 6: Export from index.ts, commit**

```bash
git commit -m "feat(core): add i18n service with English + Hindi locales"
```

---

## Task 5: Core — AdapterChain + BaseTool

**Files:**
- Create: `packages/core/src/adapter-chain.ts`
- Create: `packages/core/src/base-tool.ts`
- Test: `packages/core/tests/adapter-chain.test.ts`
- Test: `packages/core/tests/base-tool.test.ts`

- [ ] **Step 1: Write AdapterChain tests**

Test cases: first adapter succeeds, first fails + second succeeds, all fail, timeout on first + fallback, retryable vs non-retryable errors.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement AdapterChain**

Key behavior: try each adapter in order. On retryable error, try next. On non-retryable error, throw immediately. On success, return result with `_meta.adapter` set. Track latency.

- [ ] **Step 4: Write BaseTool tests**

Test cases: validate → cache hit (returns cached), cache miss → adapter call → cache set, validation failure throws ValidationError.

- [ ] **Step 5: Implement BaseTool**

Abstract class with `execute()` method that: validates input, checks cache, calls adapter chain, sets cache, returns ToolResponse with _meta.

- [ ] **Step 6: Run all tests, verify pass**
- [ ] **Step 7: Export from index.ts, commit**

```bash
git commit -m "feat(core): add AdapterChain fallback pattern and BaseTool abstract class"
```

---

## Task 6: GST Server — Mock Adapter + First Tool (gstin_verify)

**Files:**
- Create: `packages/gst/src/adapters/mock.ts`
- Create: `packages/gst/src/data/mock-fixtures.json`
- Create: `packages/gst/src/tools/gstin-verify.ts`
- Create: `packages/gst/src/server.ts`
- Create: `packages/gst/src/index.ts`
- Test: `packages/gst/tests/adapters/mock.test.ts`
- Test: `packages/gst/tests/tools/gstin-verify.test.ts`

- [ ] **Step 1: Create mock fixtures JSON**

~10 curated GSTINs with known data covering: active, cancelled, suspended, composition dealer, SEZ unit. Use real-looking but not real data.

- [ ] **Step 2: Write mock adapter tests**
- [ ] **Step 3: Implement GSTMockAdapter**

Reads from mock-fixtures.json, returns matching GSTIN data or throws EntityNotFoundError.

- [ ] **Step 4: Write gstin_verify tool tests**

Test cases: valid active GSTIN, cancelled GSTIN, not found, invalid format, Devanagari input.

- [ ] **Step 5: Implement gstin_verify tool (extends BaseTool)**
- [ ] **Step 6: Write MCP server registration (server.ts)**

Register gstin_verify tool with MCP SDK. Setup stdio transport.

- [ ] **Step 7: Write index.ts entry point**

Reads SANDBOX_API_KEY from env. If present, uses SandboxGSTAdapter. Otherwise, uses GSTMockAdapter. Creates AdapterChain and starts MCP server.

- [ ] **Step 8: Test end-to-end with MCP Inspector**

```bash
npx @modelcontextprotocol/inspector packages/gst/dist/index.js
```

Verify: tool list shows gstin_verify, invoking it returns mock data.

- [ ] **Step 9: Commit**

```bash
git commit -m "feat(gst): add mock adapter, gstin_verify tool, and MCP server"
```

---

## Task 7: GST Server — Sandbox Adapter

**Files:**
- Create: `packages/gst/src/adapters/sandbox.ts`
- Test: `packages/gst/tests/adapters/sandbox.test.ts`

- [ ] **Step 1: Read Sandbox.co.in API docs**

Check `developer.sandbox.co.in/reference/search-gstin-api` for exact endpoint, headers, response format.

- [ ] **Step 2: Write Sandbox adapter tests (mocked HTTP)**

Use Vitest's `vi.mock` to mock axios. Test: successful response mapping, 401 auth error, 429 rate limit, timeout, malformed response.

- [ ] **Step 3: Implement SandboxGSTAdapter**

```typescript
// packages/gst/src/adapters/sandbox.ts
import axios from 'axios'
import type { DataAdapter } from '@bharat-mcp/core'
import { AuthError, RateLimitError, TimeoutError, MalformedResponseError } from '@bharat-mcp/core'

export class SandboxGSTAdapter implements DataAdapter<{ gstin: string }, GSTINResult> {
  name = 'sandbox'

  constructor(
    private apiKey: string,
    private apiSecret: string,
    private baseUrl = 'https://api.sandbox.co.in'
  ) {}

  async fetch(query: { gstin: string }) {
    try {
      const res = await axios.get(`${this.baseUrl}/gst/search/${query.gstin}`, {
        headers: {
          'x-api-key': this.apiKey,
          'x-api-secret': this.apiSecret,
          'x-api-version': '2.0',
        },
        timeout: 10000,
      })
      return this.mapResponse(res.data)
    } catch (err: any) {
      if (err.response?.status === 401) throw new AuthError('sandbox')
      if (err.response?.status === 429) throw new RateLimitError('sandbox')
      if (err.code === 'ECONNABORTED') throw new TimeoutError('sandbox', 10000)
      if (err.response && typeof err.response.data !== 'object') {
        throw new MalformedResponseError('sandbox', 'non-JSON response')
      }
      throw err
    }
  }

  async healthCheck(): Promise<boolean> {
    // Check a known GSTIN as health check
    try {
      await this.fetch({ gstin: '07AABCU9603R1ZM' })
      return true
    } catch { return false }
  }

  private mapResponse(data: any): GSTINResult {
    // Map Sandbox response format to our GSTINResult type
    // Exact mapping depends on Sandbox API response structure
    // ...
  }
}
```

- [ ] **Step 4: Update index.ts to wire Sandbox adapter when SANDBOX_API_KEY is set**
- [ ] **Step 5: Run tests, verify pass**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat(gst): add Sandbox.co.in adapter for real GSTIN data"
```

---

## Task 8: GST Server — Remaining 4 Tools + Bundled Data

**Files:**
- Create: `packages/gst/src/tools/hsn-search.ts`
- Create: `packages/gst/src/tools/gst-rate-calc.ts`
- Create: `packages/gst/src/tools/gst-return-status.ts`
- Create: `packages/gst/src/tools/gstin-by-pan.ts`
- Create: `packages/gst/src/data/hsn-codes.json`
- Create: `packages/gst/src/data/gst-rates.json`
- Tests for each tool

- [ ] **Step 1: Source and bundle HSN codes data**

Download from CBIC, convert to JSON. Map + Array.filter for search.

- [ ] **Step 2: Write + implement hsn_search tool (TDD)**

Searches bundled HSN data by code (exact/prefix) or text description. Returns matching HSNResult[].

- [ ] **Step 3: Write + implement gst_rate_calculator tool (TDD)**

Calculates CGST/SGST/IGST/cess from HSN code + supply type. Uses bundled rate data.

- [ ] **Step 4: Write + implement gst_return_status tool (TDD)**

Queries Sandbox API for GSTIN filing status by financial year. Falls back to mock.

- [ ] **Step 5: Write + implement gstin_by_pan tool (TDD)**

Lists all GSTINs registered against a PAN. Uses Sandbox API.

- [ ] **Step 6: Register all 5 tools in server.ts**
- [ ] **Step 7: Run all GST tests**

```bash
cd packages/gst && pnpm test
```

- [ ] **Step 8: Commit**

```bash
git commit -m "feat(gst): add hsn_search, gst_rate_calc, gst_return_status, gstin_by_pan tools"
```

---

## Task 9: MCA Server — Mock + Sandbox Adapters + 5 Tools

**Files:**
- Create: all files under `packages/mca/src/` and `packages/mca/tests/`
- Mirrors GST server structure

- [ ] **Step 1: Create MCA mock fixtures**

~10 curated companies: active, strike-off, dormant, under liquidation. Directors with multiple companies.

- [ ] **Step 2: Implement MCAMockAdapter + tests (TDD)**
- [ ] **Step 3: Implement SandboxMCAAdapter + tests (TDD)**

Uses Sandbox.co.in KYC APIs for CIN/DIN lookup.

- [ ] **Step 4: Implement company_lookup tool + tests (TDD)**
- [ ] **Step 5: Implement director_search tool + tests (TDD)**
- [ ] **Step 6: Implement cin_validate tool + tests (TDD)**
- [ ] **Step 7: Implement company_compliance_check tool + tests (TDD)**
- [ ] **Step 8: Implement director_network_map tool + tests (TDD)**
- [ ] **Step 9: Write MCA MCP server (server.ts + index.ts)**
- [ ] **Step 10: Run all MCA tests, verify with MCP Inspector**
- [ ] **Step 11: Commit**

```bash
git commit -m "feat(mca): add MCA Intelligence Server with 5 tools + Sandbox adapter"
```

---

## Task 10: Cross-Module — Entity Resolution + Risk Scoring

**Files:**
- Create: `packages/core/src/entity-resolver.ts`
- Create: `packages/core/src/risk-scorer.ts`
- Test: `packages/core/tests/entity-resolver.test.ts`
- Test: `packages/core/tests/risk-scorer.test.ts`

- [ ] **Step 1: Write EntityResolver tests**

Test cases: full chain (GSTIN→PAN→CIN match), sole proprietor (no CIN), ambiguous (multiple CINs), one adapter fails (partial resolve), parallel execution.

- [ ] **Step 2: Implement EntityResolver (DI pattern)**

Constructor takes `GSTDataProvider` and `MCADataProvider` interfaces. Extract PAN from GSTIN, lookup MCA by PAN, return linked entity. Uses `Promise.all` for parallel where possible.

- [ ] **Step 3: Write RiskScorer tests**

Test cases: all 5 signals present, 1/5 signals, all red flags, all green flags, confidence level thresholds.

- [ ] **Step 4: Implement RiskScorer**

Weighted signals: GSTIN status (critical), filing gaps (high), MCA compliance (high), director network red flags (medium), capital adequacy (low). Returns RiskScore with natural-language summary.

- [ ] **Step 5: Run tests, verify pass**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat(core): add EntityResolver and RiskScorer cross-module services"
```

---

## Task 11: Composite Prompts

**Files:**
- Create: `packages/gst/src/prompts/vendor-due-diligence.ts`
- Create: `packages/mca/src/prompts/business-health-report.ts`

- [ ] **Step 1: Implement vendor_due_diligence prompt**

MCP prompt that orchestrates: gstin_verify → extract PAN → company_lookup → risk score. Returns structured report.

- [ ] **Step 2: Implement business_health_report prompt**

Extended version: all GST signals + all MCA signals + entity resolution + risk score + recommendations. Structured sections per design plan.

- [ ] **Step 3: Register prompts in respective servers**
- [ ] **Step 4: Test with MCP Inspector**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add vendor_due_diligence and business_health_report composite prompts"
```

---

## Task 12: Batch Operations

**Files:**
- Create: `packages/core/src/batch-processor.ts`
- Test: `packages/core/tests/batch-processor.test.ts`

- [ ] **Step 1: Write BatchProcessor tests**

Test cases: all succeed, all fail, partial (30/50), rate limit mid-batch (pause+resume), invalid items filtered, empty batch, AbortController cancellation.

- [ ] **Step 2: Implement BatchProcessor**

Chunked execution (10/chunk), configurable concurrency via `p-limit`, inter-chunk delay, AbortController support. Returns `{ results, errors, progress }`.

- [ ] **Step 3: Add batch_gstin_verify + batch_company_lookup tools to respective servers**
- [ ] **Step 4: Run tests, verify pass**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat(core): add BatchProcessor with chunked rate-limited execution"
```

---

## Task 13: Docker + Streamable HTTP

**Files:**
- Create: `docker/Dockerfile`
- Create: `docker/docker-compose.yml`

- [ ] **Step 1: Create combined server entry point**

A single `packages/combined/src/index.ts` (or script) that registers all 10 tools from both GST and MCA servers into one MCP server with Streamable HTTP transport.

- [ ] **Step 2: Write Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile && pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/*/dist ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
HEALTHCHECK CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "combined/dist/index.js"]
```

- [ ] **Step 3: Write docker-compose.yml**

```yaml
services:
  bharat-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - SANDBOX_API_KEY=${SANDBOX_API_KEY}
      - SANDBOX_API_SECRET=${SANDBOX_API_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

- [ ] **Step 4: Build and test Docker image**

```bash
docker compose up --build
# In another terminal: curl http://localhost:3000/health
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add Docker deployment with combined MCP server + Redis"
```

---

## Task 14: README + CONTRIBUTING + TODOS

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `TODOS.md`

- [ ] **Step 1: Write README.md**

Per design plan: भारत MCP hero, badges (10 Tools | Hindi + English | GST + MCA | MIT), demo GIF placeholder, quick install, 2-column tool table, "Why Bharat MCP?" personas, architecture diagram, getting a Sandbox API key.

- [ ] **Step 2: Write CONTRIBUTING.md**

How to add tools, adapters, languages. Development setup. PR process.

- [ ] **Step 3: Write TODOS.md**

All deferred items from CEO review with context.

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: add README, CONTRIBUTING, and TODOS"
```

---

## Task 15: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/publish.yml`

- [ ] **Step 1: Write CI workflow**

On PR: install, build, test (all packages), lint. Node 20.

- [ ] **Step 2: Write publish workflow**

On release tag: build, test, publish all 3 packages to npm with `--access public`.

- [ ] **Step 3: Commit**

```bash
git commit -m "ci: add GitHub Actions for CI and npm publishing"
```

---

## Task 16: Mintlify Docs Site

**Files:**
- Create: `docs/mint.json`, `docs/introduction.mdx`, `docs/quickstart.mdx`, `docs/quickstart-hindi.mdx`, `docs/architecture.mdx`, tool reference pages

- [ ] **Step 1: Configure mint.json with brand colors**

Navy `#1a1a4e`, saffron `#FF9933`, page tree per design plan.

- [ ] **Step 2: Write introduction + quickstart pages**
- [ ] **Step 3: Write Hindi quickstart**
- [ ] **Step 4: Write tool reference pages (1 per tool)**
- [ ] **Step 5: Write cross-module pages (entity resolution, risk scoring)**
- [ ] **Step 6: Write advanced pages (batch, Docker, caching, i18n)**
- [ ] **Step 7: Deploy to Mintlify, verify**
- [ ] **Step 8: Commit**

```bash
git commit -m "docs: add Mintlify docs site with full tool reference"
```

---

## Summary

| Task | What it produces | Depends on |
|------|-----------------|------------|
| 1. Monorepo scaffolding | Empty buildable monorepo | Nothing |
| 2. Core types/errors/validation | Shared types, error classes, validators | Task 1 |
| 3. Core cache | CacheLayer (Redis→LRU) | Task 2 |
| 4. Core i18n | I18nService (en + hi) | Task 2 |
| 5. Core AdapterChain + BaseTool | Adapter fallback + tool template | Task 2-4 |
| 6. GST mock + gstin_verify | First working MCP tool | Task 5 |
| 7. GST Sandbox adapter | Real data for GST tools | Task 6 |
| 8. GST remaining 4 tools | Complete GST server | Task 7 |
| 9. MCA server (all 5 tools) | Complete MCA server | Task 5 |
| 10. Entity resolution + risk scoring | Cross-module intelligence | Task 8, 9 |
| 11. Composite prompts | vendor_due_diligence, business_health_report | Task 10 |
| 12. Batch operations | Chunked batch processing | Task 8, 9 |
| 13. Docker + HTTP | Remote deployment | Task 8, 9 |
| 14. README + docs | Project documentation | Task 11 |
| 15. CI/CD | Automated testing + publishing | Task 1 |
| 16. Mintlify docs | Full docs site | Task 11 |

**Parallelizable:** Tasks 8 and 9 (GST remaining tools + MCA server) can run in parallel. Tasks 14, 15, 16 can run in parallel after Task 11.
