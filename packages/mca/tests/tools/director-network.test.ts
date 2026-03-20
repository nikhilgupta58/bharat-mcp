import { describe, it, expect } from 'vitest';
import { CacheLayer, AdapterChain, I18nService, ValidationError, EntityNotFoundError } from '@bharat-mcp/core';
import { DirectorNetworkTool } from '../../src/tools/director-network';
import { MCADirectorMockAdapter } from '../../src/adapters/mock';

function makeTool() {
  const cache = new CacheLayer();
  const adapter = new AdapterChain([new MCADirectorMockAdapter()]);
  const i18n = new I18nService('en');
  return new DirectorNetworkTool(cache, adapter, i18n);
}

describe('DirectorNetworkTool', () => {
  it('returns director network with company list', async () => {
    const tool = makeTool();
    const result = await tool.execute({ din: '00000111' });
    expect(result.data.din).toBe('00000111');
    expect(result.data.directorName).toBe('RAJESH KUMAR SHARMA');
    expect(result.data.totalCompanies).toBeGreaterThan(0);
    expect(result.data.companies).toContain('U72200KA2009PTC049889');
    expect(result._meta.cached).toBe(false);
  });

  it('returns all companies for a director with broad network', async () => {
    const tool = makeTool();
    const result = await tool.execute({ din: '00000777' });
    expect(result.data.totalCompanies).toBeGreaterThanOrEqual(3);
    expect(result.data.companies).toHaveLength(result.data.totalCompanies);
  });

  it('includes cessation date when present', async () => {
    const tool = makeTool();
    const result = await tool.execute({ din: '00000333' });
    expect(result.data.dateOfCessation).toBe('2019-12-31');
  });

  it('returns cached result on second call', async () => {
    const tool = makeTool();
    await tool.execute({ din: '00000222' });
    const second = await tool.execute({ din: '00000222' });
    expect(second._meta.cached).toBe(true);
    expect(second._meta.adapter).toBe('cache');
  });

  it('throws ValidationError for missing din', async () => {
    const tool = makeTool();
    await expect(tool.execute({})).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for invalid DIN', async () => {
    const tool = makeTool();
    await expect(tool.execute({ din: 'ABCDEF12' })).rejects.toThrow(ValidationError);
  });

  it('throws EntityNotFoundError for unknown DIN', async () => {
    const tool = makeTool();
    await expect(tool.execute({ din: '99999999' })).rejects.toThrow(EntityNotFoundError);
  });

  it('ttl is 259200', () => {
    const tool = makeTool();
    expect(tool.ttl).toBe(259200);
  });

  it('cache key includes din', () => {
    const tool = makeTool();
    expect(tool.cacheKey({ din: '00000111' })).toBe('mca:network:00000111');
  });
});
