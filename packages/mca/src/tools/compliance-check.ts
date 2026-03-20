import { BaseTool, CacheLayer, AdapterChain, I18nService, ValidationError, ComplianceResult, validateCIN, normalizeInput } from '@bharat-mcp/core';
import { ComplianceQuery } from '../adapters/mock';

export class ComplianceCheckTool extends BaseTool<ComplianceQuery, ComplianceResult> {
  constructor(cache: CacheLayer, adapterChain: AdapterChain<ComplianceQuery, ComplianceResult>, i18n: I18nService) {
    super(cache, adapterChain, i18n);
  }

  validate(rawInput: unknown): ComplianceQuery {
    if (typeof rawInput !== 'object' || rawInput === null) {
      throw new ValidationError('Input must be an object with cin field');
    }

    const input = rawInput as Record<string, unknown>;
    const { cin } = input;

    if (!cin) {
      throw new ValidationError('cin is required');
    }

    if (typeof cin !== 'string') {
      throw new ValidationError('cin must be a string');
    }

    if (!validateCIN(cin)) {
      throw new ValidationError(`Invalid CIN format: ${cin}`);
    }

    return { cin: normalizeInput(cin) };
  }

  cacheKey(input: ComplianceQuery): string {
    return `mca:compliance:${input.cin}`;
  }

  get ttl(): number {
    return 86400; // 24 hours
  }
}
