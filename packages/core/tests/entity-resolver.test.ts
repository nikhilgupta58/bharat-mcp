import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityResolver } from '../src/entity-resolver';
import { GSTDataProvider, MCADataProvider, GSTINResult, CompanyResult } from '../src/types';
import { ValidationError } from '../src/errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_GSTIN = '07AABCU9603R1ZP'; // state=07, PAN=AABCU9603R
const VALID_PAN = 'AABCU9603R';

function makeGSTResult(overrides: Partial<GSTINResult> = {}): GSTINResult {
  return {
    gstin: VALID_GSTIN,
    legalName: 'Test Co Ltd',
    tradeName: 'Test Co',
    status: 'Active',
    registrationDate: '2020-01-01',
    lastUpdated: '2024-01-01',
    constitutionOfBusiness: 'Private Limited Company',
    taxpayerType: 'Regular',
    address: '123, Test Street, Delhi',
    state: 'Delhi',
    pincode: '110001',
    natureOfBusiness: ['Wholesale Business'],
    ...overrides,
  };
}

function makeCompany(overrides: Partial<CompanyResult> = {}): CompanyResult {
  return {
    cin: 'U72200DL2009PTC049889',
    companyName: 'Test Co Ltd',
    registrationNumber: '049889',
    companyCategory: 'Company limited by Shares',
    companySubcategory: 'Non-govt company',
    classOfCompany: 'Private',
    dateOfIncorporation: '2009-01-01',
    registeredAddress: '123, Test Street, Delhi',
    email: 'test@example.com',
    authorizedCapital: 1000000,
    paidUpCapital: 500000,
    companyStatus: 'Active',
    complianceStatus: 'Compliant',
    whetherListed: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock providers
// ---------------------------------------------------------------------------

function makeMockGST(overrides: Partial<GSTDataProvider> = {}): GSTDataProvider {
  return {
    verifyGSTIN: vi.fn().mockResolvedValue(makeGSTResult()),
    getReturnStatus: vi.fn().mockResolvedValue({ gstin: VALID_GSTIN, returns: [] }),
    ...overrides,
  };
}

function makeMockMCA(overrides: Partial<MCADataProvider> = {}): MCADataProvider {
  return {
    lookupByPAN: vi.fn().mockResolvedValue([makeCompany()]),
    getComplianceStatus: vi.fn().mockResolvedValue({
      cin: 'U72200DL2009PTC049889',
      filings: [],
      lastUpdated: '2024-01-01',
      overallStatus: 'Compliant',
    }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EntityResolver', () => {
  let gst: GSTDataProvider;
  let mca: MCADataProvider;
  let resolver: EntityResolver;

  beforeEach(() => {
    gst = makeMockGST();
    mca = makeMockMCA();
    resolver = new EntityResolver(gst, mca);
  });

  it('resolves GSTIN → PAN → companies (full chain)', async () => {
    const result = await resolver.resolve({ gstin: VALID_GSTIN });

    expect(result.pan).toBe(VALID_PAN);
    expect(result.gstin?.gstin).toBe(VALID_GSTIN);
    expect(result.companies).toHaveLength(1);
    expect(result.companies[0].companyName).toBe('Test Co Ltd');
    expect(result.resolvedVia).toContain('gstin');
    expect(result.partial).toBe(false);
    expect(gst.verifyGSTIN).toHaveBeenCalledWith(VALID_GSTIN);
    expect(mca.lookupByPAN).toHaveBeenCalledWith(VALID_PAN);
  });

  it('handles sole proprietor (PAN lookup returns empty companies)', async () => {
    mca = makeMockMCA({ lookupByPAN: vi.fn().mockResolvedValue([]) });
    resolver = new EntityResolver(gst, mca);

    const result = await resolver.resolve({ gstin: VALID_GSTIN });

    expect(result.pan).toBe(VALID_PAN);
    expect(result.companies).toHaveLength(0);
    expect(result.partial).toBe(false);
  });

  it('returns partial=true when GST provider fails', async () => {
    gst = makeMockGST({ verifyGSTIN: vi.fn().mockRejectedValue(new Error('GST down')) });
    resolver = new EntityResolver(gst, mca);

    const result = await resolver.resolve({ gstin: VALID_GSTIN });

    expect(result.partial).toBe(true);
    expect(result.gstin).toBeUndefined();
    expect(result.companies).toHaveLength(1); // MCA still succeeded
  });

  it('returns partial=true when MCA provider fails', async () => {
    mca = makeMockMCA({ lookupByPAN: vi.fn().mockRejectedValue(new Error('MCA down')) });
    resolver = new EntityResolver(gst, mca);

    const result = await resolver.resolve({ gstin: VALID_GSTIN });

    expect(result.partial).toBe(true);
    expect(result.gstin).toBeDefined(); // GST still succeeded
    expect(result.companies).toHaveLength(0);
  });

  it('throws ValidationError for invalid GSTIN', async () => {
    await expect(resolver.resolve({ gstin: 'INVALID' })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when no identifier provided', async () => {
    await expect(resolver.resolve({})).rejects.toThrow(ValidationError);
  });

  it('redacts PAN in output', async () => {
    const result = await resolver.resolve({ gstin: VALID_GSTIN });
    // AABCU9603R → AA****603R
    expect(result.panRedacted).toBe('AA****603R');
    expect(result.panRedacted).not.toContain(VALID_PAN);
  });

  it('resolves by PAN directly', async () => {
    const result = await resolver.resolve({ pan: VALID_PAN });

    expect(result.pan).toBe(VALID_PAN);
    expect(result.resolvedVia).toContain('pan');
    expect(result.companies).toHaveLength(1);
    expect(result.gstin).toBeUndefined();
  });

  it('resolves by CIN with partial=true (no PAN extractable)', async () => {
    const result = await resolver.resolve({ cin: 'U72200DL2009PTC049889' });

    expect(result.resolvedVia).toContain('cin');
    expect(result.partial).toBe(true);
    expect(result.pan).toBe('');
  });
});
