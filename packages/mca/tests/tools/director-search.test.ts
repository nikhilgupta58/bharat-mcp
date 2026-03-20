import { describe, it, expect } from 'vitest';
import { CacheLayer, AdapterChain, I18nService, ValidationError, EntityNotFoundError } from '@bharat-mcp/core';
import { DirectorSearchTool } from '../../src/tools/director-search';
import { MCADirectorMockAdapter } from '../../src/adapters/mock';

function makeTool() {
  const cache = new CacheLayer();
  const adapter = new AdapterChain([new MCADirectorMockAdapter()]);
  const i18n = new I18nService('en');
  return new DirectorSearchTool(cache, adapter, i18n);
}

describe('DirectorSearchTool', () => {
  it('finds a director by DIN', async () => {
    const tool = makeTool();
    const result = await tool.execute({ din: '00000222' });
    expect(result.data.name).toBe('MUKESH DHIRUBHAI AMBANI');
    expect(result._meta.cached).toBe(false);
  });

  it('returns cached result on second call', async () => {
    const tool = makeTool();
    await tool.execute({ din: '00000111' });
    const second = await tool.execute({ din: '00000111' });
    expect(second._meta.cached).toBe(true);
  });

  it('throws ValidationError for missing din', async () => {
    const tool = makeTool();
    await expect(tool.execute({})).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for DIN with fewer than 8 digits', async () => {
    const tool = makeTool();
    await expect(tool.execute({ din: '1234567' })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for DIN with non-digit characters', async () => {
    const tool = makeTool();
    await expect(tool.execute({ din: 'ABCD1234' })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for DIN with more than 8 digits', async () => {
    const tool = makeTool();
    await expect(tool.execute({ din: '123456789' })).rejects.toThrow(ValidationError);
  });

  it('throws EntityNotFoundError for unknown DIN', async () => {
    const tool = makeTool();
    await expect(tool.execute({ din: '99999999' })).rejects.toThrow(EntityNotFoundError);
  });

  it('throws ValidationError for non-object input', async () => {
    const tool = makeTool();
    await expect(tool.execute(null)).rejects.toThrow(ValidationError);
  });

  it('ttl is 259200', () => {
    const tool = makeTool();
    expect(tool.ttl).toBe(259200);
  });

  it('cache key includes din', () => {
    const tool = makeTool();
    expect(tool.cacheKey({ din: '00000111' })).toBe('mca:director:00000111');
  });
});
