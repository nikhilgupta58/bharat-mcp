import { describe, it, expect } from 'vitest';
import { EntityNotFoundError } from '@bharat-mcp/core';
import { MCACompanyMockAdapter, MCADirectorMockAdapter, MCAComplianceMockAdapter } from '../../src/adapters/mock';

describe('MCACompanyMockAdapter', () => {
  const adapter = new MCACompanyMockAdapter();

  it('healthCheck returns true', async () => {
    expect(await adapter.healthCheck()).toBe(true);
  });

  it('finds a company by CIN (exact match)', async () => {
    const results = await adapter.fetch({ cin: 'U72200KA2009PTC049889' });
    expect(results).toHaveLength(1);
    expect(results[0].cin).toBe('U72200KA2009PTC049889');
    expect(results[0].companyName).toBe('INFOSYS BPO PRIVATE LIMITED');
  });

  it('CIN lookup is case-insensitive', async () => {
    const results = await adapter.fetch({ cin: 'u72200ka2009ptc049889' });
    expect(results[0].cin).toBe('U72200KA2009PTC049889');
  });

  it('finds a company by company_name (case-insensitive contains)', async () => {
    const results = await adapter.fetch({ company_name: 'reliance' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].companyName).toContain('RELIANCE');
  });

  it('finds a company by PAN', async () => {
    const results = await adapter.fetch({ pan: 'AAACI1234A' });
    expect(results).toHaveLength(1);
    expect(results[0].cin).toBe('U72200KA2009PTC049889');
  });

  it('throws EntityNotFoundError for unknown CIN', async () => {
    await expect(adapter.fetch({ cin: 'U99999XX1999XXX999999' })).rejects.toThrow(EntityNotFoundError);
  });

  it('throws EntityNotFoundError for unknown company_name', async () => {
    await expect(adapter.fetch({ company_name: 'ZZZNOBODYLTD' })).rejects.toThrow(EntityNotFoundError);
  });

  it('throws EntityNotFoundError for unknown PAN', async () => {
    await expect(adapter.fetch({ pan: 'ZZZZZ9999Z' })).rejects.toThrow(EntityNotFoundError);
  });

  it('returns active status company correctly', async () => {
    const results = await adapter.fetch({ cin: 'L17110MH1973PLC019786' });
    expect(results[0].companyStatus).toBe('Active');
    expect(results[0].whetherListed).toBe(true);
  });

  it('returns strike-off company correctly', async () => {
    const results = await adapter.fetch({ cin: 'U51909DL2010PTC205678' });
    expect(results[0].companyStatus).toBe('Strike Off');
  });

  it('returns dormant company correctly', async () => {
    const results = await adapter.fetch({ cin: 'U65910TN2015PTC101234' });
    expect(results[0].companyStatus).toBe('Dormant');
  });

  it('returns under-liquidation company correctly', async () => {
    const results = await adapter.fetch({ cin: 'U45200GJ2008PTC053421' });
    expect(results[0].companyStatus).toBe('Under Liquidation');
  });

  it('result does not expose pan field (stripped by toCompanyResult)', async () => {
    const results = await adapter.fetch({ cin: 'U72200KA2009PTC049889' });
    expect((results[0] as unknown as Record<string, unknown>)['pan']).toBeUndefined();
  });
});

describe('MCADirectorMockAdapter', () => {
  const adapter = new MCADirectorMockAdapter();

  it('healthCheck returns true', async () => {
    expect(await adapter.healthCheck()).toBe(true);
  });

  it('finds a director by DIN', async () => {
    const result = await adapter.fetch({ din: '00000111' });
    expect(result.din).toBe('00000111');
    expect(result.name).toBe('RAJESH KUMAR SHARMA');
    expect(result.companies).toContain('U72200KA2009PTC049889');
  });

  it('returns cessation date when applicable', async () => {
    const result = await adapter.fetch({ din: '00000333' });
    expect(result.dateOfCessation).toBe('2019-12-31');
  });

  it('throws EntityNotFoundError for unknown DIN', async () => {
    await expect(adapter.fetch({ din: '99999999' })).rejects.toThrow(EntityNotFoundError);
  });

  it('returns multiple companies for a director with broad network', async () => {
    const result = await adapter.fetch({ din: '00000777' });
    expect(result.companies.length).toBeGreaterThanOrEqual(3);
  });
});

describe('MCAComplianceMockAdapter', () => {
  const adapter = new MCAComplianceMockAdapter();

  it('healthCheck returns true', async () => {
    expect(await adapter.healthCheck()).toBe(true);
  });

  it('returns compliance data for a known CIN', async () => {
    const result = await adapter.fetch({ cin: 'U72200KA2009PTC049889' });
    expect(result.cin).toBe('U72200KA2009PTC049889');
    expect(result.overallStatus).toBe('Compliant');
    expect(result.filings.length).toBeGreaterThan(0);
  });

  it('returns non-compliant status for strike-off company', async () => {
    const result = await adapter.fetch({ cin: 'U51909DL2010PTC205678' });
    expect(result.overallStatus).toBe('Non-Compliant');
    const notFiled = result.filings.filter((f) => f.status === 'Not Filed');
    expect(notFiled.length).toBeGreaterThan(0);
  });

  it('returns partial compliance status', async () => {
    const result = await adapter.fetch({ cin: 'U65910TN2015PTC101234' });
    expect(result.overallStatus).toBe('Partial');
  });

  it('throws EntityNotFoundError for unknown CIN', async () => {
    await expect(adapter.fetch({ cin: 'UNKNOWN_CIN' })).rejects.toThrow(EntityNotFoundError);
  });
});
