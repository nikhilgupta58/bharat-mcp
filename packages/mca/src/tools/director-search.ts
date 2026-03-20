import { BaseTool, CacheLayer, AdapterChain, I18nService, ValidationError, DirectorResult } from '@bharat-mcp/core';
import { DirectorQuery } from '../adapters/mock';

export class DirectorSearchTool extends BaseTool<DirectorQuery, DirectorResult> {
  constructor(cache: CacheLayer, adapterChain: AdapterChain<DirectorQuery, DirectorResult>, i18n: I18nService) {
    super(cache, adapterChain, i18n);
  }

  validate(rawInput: unknown): DirectorQuery {
    if (typeof rawInput !== 'object' || rawInput === null) {
      throw new ValidationError('Input must be an object with din field');
    }

    const input = rawInput as Record<string, unknown>;
    const { din } = input;

    if (!din) {
      throw new ValidationError('din is required');
    }

    if (typeof din !== 'string') {
      throw new ValidationError('din must be a string');
    }

    const normalized = din.trim();
    if (!/^\d{8}$/.test(normalized)) {
      throw new ValidationError(`Invalid DIN format: ${din}. DIN must be exactly 8 digits.`);
    }

    return { din: normalized };
  }

  cacheKey(input: DirectorQuery): string {
    return `mca:director:${input.din}`;
  }

  get ttl(): number {
    return 259200; // 72 hours
  }
}
