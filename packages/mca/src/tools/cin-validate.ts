import { BaseTool, CacheLayer, AdapterChain, I18nService, ValidationError, validateCIN, normalizeInput } from '@bharat-mcp/core';

export interface CINValidateInput {
  cin: string;
}

export interface CINMetadata {
  cin: string;
  valid: boolean;
  listingStatus: 'Listed' | 'Unlisted';
  nicCode: string;
  stateCode: string;
  yearOfIncorporation: string;
  companyType: string;
  sequenceNumber: string;
}

// A no-op adapter since cin-validate is pure computation
class CINNoOpAdapter {
  readonly name = 'cin-noop';
  async fetch(_query: CINValidateInput): Promise<CINMetadata> {
    // Never called; validation and parsing happen in execute override
    throw new Error('CINNoOpAdapter.fetch should not be called');
  }
  async healthCheck(): Promise<boolean> {
    return true;
  }
}

export class CINValidateTool extends BaseTool<CINValidateInput, CINMetadata> {
  constructor(cache: CacheLayer, i18n: I18nService) {
    super(cache, new AdapterChain([new CINNoOpAdapter()]) as unknown as AdapterChain<CINValidateInput, CINMetadata>, i18n);
  }

  validate(rawInput: unknown): CINValidateInput {
    if (typeof rawInput !== 'object' || rawInput === null) {
      throw new ValidationError('Input must be an object with cin field');
    }

    const input = rawInput as Record<string, unknown>;
    if (!input.cin || typeof input.cin !== 'string') {
      throw new ValidationError('cin is required and must be a string');
    }

    return { cin: input.cin };
  }

  /**
   * Override execute to skip adapter chain entirely — pure local computation.
   */
  async execute(rawInput: unknown) {
    const input = this.validate(rawInput);
    const cin = normalizeInput(input.cin);
    const valid = validateCIN(cin);

    let metadata: CINMetadata;

    if (!valid) {
      metadata = {
        cin,
        valid: false,
        listingStatus: 'Unlisted',
        nicCode: '',
        stateCode: '',
        yearOfIncorporation: '',
        companyType: '',
        sequenceNumber: '',
      };
    } else {
      // CIN format: [L|U][5 digit NIC][2 char state][4 digit year][3 char company type][6 digit seq]
      // Example: U72200KA2009PTC049889
      //          pos: 0 = L/U
      //               1-5 = NIC code (5 digits)
      //               6-7 = state code (2 alpha)
      //               8-11 = year (4 digits)
      //               12-14 = company type (3 alpha)
      //               15-20 = sequence number (6 digits)
      const listingChar = cin[0];
      const nicCode = cin.slice(1, 6);
      const stateCode = cin.slice(6, 8);
      const yearOfIncorporation = cin.slice(8, 12);
      const companyType = cin.slice(12, 15);
      const sequenceNumber = cin.slice(15, 21);

      metadata = {
        cin,
        valid: true,
        listingStatus: listingChar === 'L' ? 'Listed' : 'Unlisted',
        nicCode,
        stateCode,
        yearOfIncorporation,
        companyType,
        sequenceNumber,
      };
    }

    return {
      data: metadata,
      _meta: {
        adapter: 'cin-validate',
        cached: false,
        fetchedAt: new Date().toISOString(),
        latencyMs: 0,
        partial: false,
        locale: this.i18n.getLocale(),
      },
    };
  }

  cacheKey(input: CINValidateInput): string {
    return `mca:cin-validate:${input.cin}`;
  }

  get ttl(): number {
    return 0; // No caching — pure computation
  }
}
