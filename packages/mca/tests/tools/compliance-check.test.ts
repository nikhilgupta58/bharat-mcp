import { describe, it, expect } from 'vitest';
import { CacheLayer, AdapterChain, I18nService, ValidationError, EntityNotFoundError } from '@bharat-mcp/core';
import { ComplianceCheckTool } from '../../src/tools/compliance-check';
import { MCAComplianceMockAdapter } from '../../src/adapters/mock';

function makeTool() {
  const cache = new CacheLayer();
  const adapter = new AdapterChain([new MCAComplianceMockAdapter()]);
  const i18n = new I18nService('en');
  return new ComplianceCheckTool(cache, adapter, i18n);
}

describe('ComplianceCheckTool', () => {
  it('returns compliance data for a compliant company', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'U72200KA2009PTC049889' });
    expect(result.data.cin).toBe('U72200KA2009PTC049889');
    expect(result.data.overallStatus).toBe('Compliant');
    expect(result.data.filings.length).toBeGreaterThan(0);
    expect(result._meta.cached).toBe(false);
  });

  it('returns non-compliant status for strike-off company', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'U51909DL2010PTC205678' });
    expect(result.data.overallStatus).toBe('Non-Compliant');
  });

  it('returns partial compliance', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'U65910TN2015PTC101234' });
    expect(result.data.overallStatus).toBe('Partial');
  });

  it('returns cached result on second call', async () => {
    const tool = makeTool();
    await tool.execute({ cin: 'L17110MH1973PLC019786' });
    const second = await tool.execute({ cin: 'L17110MH1973PLC019786' });
    expect(second._meta.cached).toBe(true);
  });

  it('ttl is 86400 (24 hours)', () => {
    const tool = makeTool();
    expect(tool.ttl).toBe(86400);
  });

  it('throws ValidationError for missing cin', async () => {
    const tool = makeTool();
    await expect(tool.execute({})).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for invalid CIN format', async () => {
    const tool = makeTool();
    await expect(tool.execute({ cin: 'BADCIN' })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for non-object input', async () => {
    const tool = makeTool();
    await expect(tool.execute(42)).rejects.toThrow(ValidationError);
  });

  it('throws EntityNotFoundError for unknown CIN', async () => {
    const tool = makeTool();
    // Valid CIN format but not in fixtures
    await expect(tool.execute({ cin: 'U99999MH2001PTC999999' })).rejects.toThrow(EntityNotFoundError);
  });

  it('cache key includes cin', () => {
    const tool = makeTool();
    expect(tool.cacheKey({ cin: 'U72200KA2009PTC049889' })).toBe('mca:compliance:U72200KA2009PTC049889');
  });
});
