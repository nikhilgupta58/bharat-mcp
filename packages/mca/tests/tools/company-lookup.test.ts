import { describe, it, expect, beforeEach } from 'vitest';
import { CacheLayer, AdapterChain, I18nService, ValidationError, EntityNotFoundError } from '@bharat-mcp/core';
import { CompanyLookupTool } from '../../src/tools/company-lookup';
import { MCACompanyMockAdapter } from '../../src/adapters/mock';

function makeTool() {
  const cache = new CacheLayer();
  const adapter = new AdapterChain([new MCACompanyMockAdapter()]);
  const i18n = new I18nService('en');
  return { tool: new CompanyLookupTool(cache, adapter, i18n), cache };
}

describe('CompanyLookupTool', () => {
  it('looks up company by CIN', async () => {
    const { tool } = makeTool();
    const result = await tool.execute({ cin: 'U72200KA2009PTC049889' });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].companyName).toBe('INFOSYS BPO PRIVATE LIMITED');
    expect(result._meta.cached).toBe(false);
  });

  it('looks up company by company_name', async () => {
    const { tool } = makeTool();
    const result = await tool.execute({ company_name: 'reliance' });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].companyName).toContain('RELIANCE');
  });

  it('looks up company by PAN', async () => {
    const { tool } = makeTool();
    const result = await tool.execute({ pan: 'AAACR5055K' });
    expect(result.data[0].cin).toBe('L17110MH1973PLC019786');
  });

  it('returns cached result on second call', async () => {
    const { tool } = makeTool();
    await tool.execute({ cin: 'U72200KA2009PTC049889' });
    const second = await tool.execute({ cin: 'U72200KA2009PTC049889' });
    expect(second._meta.cached).toBe(true);
    expect(second._meta.adapter).toBe('cache');
  });

  it('throws ValidationError when no fields provided', async () => {
    const { tool } = makeTool();
    await expect(tool.execute({})).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for invalid CIN', async () => {
    const { tool } = makeTool();
    await expect(tool.execute({ cin: 'INVALID' })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for invalid PAN', async () => {
    const { tool } = makeTool();
    await expect(tool.execute({ pan: 'BADPAN' })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for non-object input', async () => {
    const { tool } = makeTool();
    await expect(tool.execute('not-an-object')).rejects.toThrow(ValidationError);
  });

  it('throws EntityNotFoundError for unknown CIN', async () => {
    const { tool } = makeTool();
    await expect(tool.execute({ cin: 'U99999XX1999XXX999999' })).rejects.toThrow(EntityNotFoundError);
  });

  it('ttl is 259200', () => {
    const { tool } = makeTool();
    expect(tool.ttl).toBe(259200);
  });

  it('cache key includes cin', () => {
    const { tool } = makeTool();
    expect(tool.cacheKey({ cin: 'U72200KA2009PTC049889' })).toBe('mca:company:U72200KA2009PTC049889');
  });
});
