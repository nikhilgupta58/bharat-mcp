import { describe, it, expect } from 'vitest';
import {
  validateGSTIN,
  validateCIN,
  validatePAN,
  extractPANFromGSTIN,
  redactPAN,
} from '../src/validation';

describe('validateGSTIN', () => {
  it('accepts a valid GSTIN', () => {
    expect(validateGSTIN('07AABCU9603R1ZP')).toBe(true);
  });

  it('accepts another valid GSTIN', () => {
    expect(validateGSTIN('27AAPFU0939F1ZV')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(validateGSTIN('07AABCU9603R1Z')).toBe(false);
  });

  it('rejects invalid checksum', () => {
    // P is valid check, M is not — so this should be rejected
    expect(validateGSTIN('07AABCU9603R1ZM')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateGSTIN('')).toBe(false);
  });

  it('rejects null-like (undefined cast)', () => {
    // @ts-expect-error testing runtime null
    expect(validateGSTIN(null)).toBe(false);
  });

  it('accepts Devanagari numerals', () => {
    expect(validateGSTIN('०७AABCU9603R1ZP')).toBe(true);
  });

  it('accepts lowercase input', () => {
    expect(validateGSTIN('07aabcu9603r1zp')).toBe(true);
  });
});

describe('extractPANFromGSTIN', () => {
  it('extracts PAN from valid GSTIN', () => {
    expect(extractPANFromGSTIN('07AABCU9603R1ZP')).toBe('AABCU9603R');
  });
});

describe('validateCIN', () => {
  it('accepts a valid CIN', () => {
    expect(validateCIN('U72200KA2009PTC049889')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(validateCIN('U72200KA2009PTC04988')).toBe(false);
  });
});

describe('validatePAN', () => {
  it('accepts a valid PAN', () => {
    expect(validatePAN('AABCU9603R')).toBe(true);
  });

  it('rejects invalid PAN', () => {
    expect(validatePAN('1ABCU9603R')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(validatePAN('AABCU9603')).toBe(false);
  });
});

describe('redactPAN', () => {
  it('redacts middle digits leaving first 2 and last 4', () => {
    expect(redactPAN('AABCU9603R')).toBe('AA****603R');
  });
});
