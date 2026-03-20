import { describe, it, expect } from 'vitest';
import { CacheLayer, I18nService, ValidationError } from '@bharat-mcp/core';
import { CINValidateTool } from '../../src/tools/cin-validate';

function makeTool() {
  const cache = new CacheLayer();
  const i18n = new I18nService('en');
  return new CINValidateTool(cache, i18n);
}

describe('CINValidateTool', () => {
  it('validates a valid CIN and extracts metadata', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'U72200KA2009PTC049889' });
    expect(result.data.valid).toBe(true);
    expect(result.data.cin).toBe('U72200KA2009PTC049889');
  });

  it('extracts listing status U = Unlisted', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'U72200KA2009PTC049889' });
    expect(result.data.listingStatus).toBe('Unlisted');
  });

  it('extracts listing status L = Listed', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'L17110MH1973PLC019786' });
    expect(result.data.listingStatus).toBe('Listed');
    expect(result.data.valid).toBe(true);
  });

  it('extracts NIC code correctly', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'U72200KA2009PTC049889' });
    expect(result.data.nicCode).toBe('72200');
  });

  it('extracts state code correctly', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'U72200KA2009PTC049889' });
    expect(result.data.stateCode).toBe('KA');
  });

  it('extracts year of incorporation correctly', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'U72200KA2009PTC049889' });
    expect(result.data.yearOfIncorporation).toBe('2009');
  });

  it('extracts company type correctly', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'U72200KA2009PTC049889' });
    expect(result.data.companyType).toBe('PTC');
  });

  it('extracts sequence number correctly', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'U72200KA2009PTC049889' });
    expect(result.data.sequenceNumber).toBe('049889');
  });

  it('extracts MH state code from Reliance CIN', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'L17110MH1973PLC019786' });
    expect(result.data.stateCode).toBe('MH');
    expect(result.data.nicCode).toBe('17110');
    expect(result.data.yearOfIncorporation).toBe('1973');
    expect(result.data.companyType).toBe('PLC');
  });

  it('returns valid=false for invalid CIN without throwing', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'INVALIDCIN12345678901' });
    expect(result.data.valid).toBe(false);
    expect(result.data.nicCode).toBe('');
  });

  it('handles lowercase CIN input via normalization', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'u72200ka2009ptc049889' });
    expect(result.data.valid).toBe(true);
    expect(result.data.cin).toBe('U72200KA2009PTC049889');
  });

  it('returns adapter=cin-validate in _meta', async () => {
    const tool = makeTool();
    const result = await tool.execute({ cin: 'U72200KA2009PTC049889' });
    expect(result._meta.adapter).toBe('cin-validate');
  });

  it('ttl is 0 (no caching)', () => {
    const tool = makeTool();
    expect(tool.ttl).toBe(0);
  });

  it('throws ValidationError for missing cin', async () => {
    const tool = makeTool();
    await expect(tool.execute({})).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for non-object input', async () => {
    const tool = makeTool();
    await expect(tool.execute('not-an-object')).rejects.toThrow(ValidationError);
  });
});
