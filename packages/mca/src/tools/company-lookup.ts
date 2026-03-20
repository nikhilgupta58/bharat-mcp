import { BaseTool, CacheLayer, AdapterChain, I18nService, ValidationError, CompanyResult, validateCIN, validatePAN, normalizeInput } from '@bharat-mcp/core';
import { CompanyQuery } from '../adapters/mock';

export class CompanyLookupTool extends BaseTool<CompanyQuery, CompanyResult[]> {
  constructor(cache: CacheLayer, adapterChain: AdapterChain<CompanyQuery, CompanyResult[]>, i18n: I18nService) {
    super(cache, adapterChain, i18n);
  }

  validate(rawInput: unknown): CompanyQuery {
    if (typeof rawInput !== 'object' || rawInput === null) {
      throw new ValidationError('Input must be an object with at least one of: cin, company_name, pan');
    }

    const input = rawInput as Record<string, unknown>;
    const { cin, company_name, pan } = input;

    if (!cin && !company_name && !pan) {
      throw new ValidationError('At least one of cin, company_name, or pan must be provided');
    }

    if (cin !== undefined) {
      if (typeof cin !== 'string') throw new ValidationError('cin must be a string');
      if (!validateCIN(cin)) throw new ValidationError(`Invalid CIN format: ${cin}`);
    }

    if (pan !== undefined) {
      if (typeof pan !== 'string') throw new ValidationError('pan must be a string');
      if (!validatePAN(pan)) throw new ValidationError(`Invalid PAN format: ${pan}`);
    }

    if (company_name !== undefined) {
      if (typeof company_name !== 'string' || company_name.trim().length === 0) {
        throw new ValidationError('company_name must be a non-empty string');
      }
    }

    return {
      cin: cin ? normalizeInput(cin as string) : undefined,
      company_name: company_name as string | undefined,
      pan: pan ? normalizeInput(pan as string) : undefined,
    };
  }

  cacheKey(input: CompanyQuery): string {
    return `mca:company:${input.cin ?? input.company_name ?? input.pan}`;
  }

  get ttl(): number {
    return 259200; // 72 hours
  }
}
