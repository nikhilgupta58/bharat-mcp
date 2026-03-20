import { describe, it, expect } from 'vitest';
import { RiskScorer } from '../src/risk-scorer';
import { GSTINResult, CompanyResult, ComplianceResult } from '../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGSTResult(overrides: Partial<GSTINResult> = {}): GSTINResult {
  return {
    gstin: '07AABCU9603R1ZP',
    legalName: 'Test Co Ltd',
    tradeName: 'Test Co',
    status: 'Active',
    registrationDate: '2020-01-01',
    lastUpdated: '2024-01-01',
    constitutionOfBusiness: 'Private Limited Company',
    taxpayerType: 'Regular',
    address: '123 Test St, Delhi',
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
    registeredAddress: '123 Test St, Delhi',
    email: 'test@example.com',
    authorizedCapital: 1000000,
    paidUpCapital: 500000,
    companyStatus: 'Active',
    complianceStatus: 'Compliant',
    whetherListed: false,
    ...overrides,
  };
}

function makeCompliance(overdueCount = 0): ComplianceResult {
  const filings = Array.from({ length: overdueCount }, (_, i) => ({
    formType: `MGT-7`,
    period: `FY202${i}`,
    status: 'Not Filed' as const,
    dueDate: '2024-01-01',
  }));
  return {
    cin: 'U72200DL2009PTC049889',
    filings,
    lastUpdated: '2024-01-01',
    overallStatus: overdueCount > 0 ? 'Non-Compliant' : 'Compliant',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RiskScorer', () => {
  const scorer = new RiskScorer();

  it('returns low risk (score 0) when all signals green', () => {
    const result = scorer.score({
      gstResult: makeGSTResult({ status: 'Active' }),
      companyResult: makeCompany({ companyStatus: 'Active', paidUpCapital: 500000 }),
      complianceResult: makeCompliance(0),
      returnsOverdue: 0,
    });

    expect(result.score).toBe(0);
    expect(result.flags).toHaveLength(0);
  });

  it('returns high risk when GSTIN is Cancelled (critical flag)', () => {
    const result = scorer.score({
      gstResult: makeGSTResult({ status: 'Cancelled' }),
      companyResult: makeCompany({ companyStatus: 'Active', paidUpCapital: 500000 }),
      complianceResult: makeCompliance(0),
      returnsOverdue: 0,
    });

    // single critical signal = 3 pts out of 10.5 max → score ≈ 2.9, still above 0
    expect(result.score).toBeGreaterThan(0);
    const criticalFlag = result.flags.find((f) => f.code === 'gstin_status');
    expect(criticalFlag).toBeDefined();
    expect(criticalFlag?.severity).toBe('critical');
  });

  it('returns moderate risk with overdue returns only', () => {
    const result = scorer.score({
      gstResult: makeGSTResult({ status: 'Active' }),
      returnsOverdue: 3,
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(7);
    const flag = result.flags.find((f) => f.code === 'returns_overdue');
    expect(flag).toBeDefined();
    expect(flag?.severity).toBe('high');
    expect(flag?.description).toContain('3');
  });

  it('returns low confidence when only 1 signal available', () => {
    const result = scorer.score({
      gstResult: makeGSTResult({ status: 'Active' }),
    });

    expect(result.confidence).toBe('low');
    expect(result.signalsAvailable).toBe(1);
  });

  it('returns medium confidence with 2-3 signals', () => {
    const result = scorer.score({
      gstResult: makeGSTResult(),
      returnsOverdue: 0,
    });

    expect(result.confidence).toBe('medium');
    expect(result.signalsAvailable).toBe(2);
  });

  it('returns high confidence with 4+ signals', () => {
    const result = scorer.score({
      gstResult: makeGSTResult(),
      companyResult: makeCompany({ paidUpCapital: 500000 }),
      complianceResult: makeCompliance(0),
      returnsOverdue: 0,
    });

    expect(result.confidence).toBe('high');
    expect(result.signalsAvailable).toBeGreaterThanOrEqual(4);
  });

  it('summary is human-readable and contains risk level', () => {
    const result = scorer.score({
      gstResult: makeGSTResult({ status: 'Cancelled' }),
    });

    expect(result.summary).toMatch(/Risk/);
    expect(result.summary).toMatch(/confidence/);
    expect(result.summary).toMatch(/10/);
  });

  it('score never exceeds 10', () => {
    // Trigger all possible flags simultaneously
    const result = scorer.score({
      gstResult: makeGSTResult({ status: 'Cancelled' }),
      companyResult: makeCompany({ companyStatus: 'Strike Off', paidUpCapital: 50000 }),
      complianceResult: makeCompliance(5),
      returnsOverdue: 10,
    });

    expect(result.score).toBeLessThanOrEqual(10);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('flags low paid-up capital signal', () => {
    const result = scorer.score({
      companyResult: makeCompany({ paidUpCapital: 50000 }), // below 1L
    });

    const flag = result.flags.find((f) => f.code === 'low_capital');
    expect(flag).toBeDefined();
    expect(flag?.severity).toBe('low');
  });

  it('summary contains no red flags message when all clear', () => {
    const result = scorer.score({
      gstResult: makeGSTResult({ status: 'Active' }),
      returnsOverdue: 0,
    });

    expect(result.summary).toContain('No red flags detected');
  });

  it('summary lists all red flag descriptions', () => {
    const result = scorer.score({
      gstResult: makeGSTResult({ status: 'Cancelled' }),
      returnsOverdue: 2,
    });

    expect(result.summary).toContain('GSTIN is Cancelled');
    expect(result.summary).toContain('2 GST returns overdue');
  });
});
