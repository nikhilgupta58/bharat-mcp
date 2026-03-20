import { BaseTool, CacheLayer, AdapterChain, I18nService, ValidationError, DirectorResult } from '@bharat-mcp/core';
import { DirectorQuery } from '../adapters/mock';

export interface DirectorNetwork {
  din: string;
  directorName: string;
  designation: string;
  dateOfAppointment: string;
  dateOfCessation?: string;
  totalCompanies: number;
  companies: string[];
}

export class DirectorNetworkTool extends BaseTool<DirectorQuery, DirectorNetwork> {
  private directorAdapter: AdapterChain<DirectorQuery, DirectorResult>;

  constructor(
    cache: CacheLayer,
    directorAdapterChain: AdapterChain<DirectorQuery, DirectorResult>,
    i18n: I18nService,
  ) {
    // We store the director adapter and use it in execute override
    super(cache, directorAdapterChain as unknown as AdapterChain<DirectorQuery, DirectorNetwork>, i18n);
    this.directorAdapter = directorAdapterChain;
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

  async execute(rawInput: unknown) {
    const input = this.validate(rawInput);
    const key = this.cacheKey(input);

    // Check cache
    const cached = await this.cache.get<DirectorNetwork>(key);
    if (cached !== undefined) {
      return {
        data: cached,
        _meta: {
          adapter: 'cache',
          cached: true,
          fetchedAt: new Date().toISOString(),
          latencyMs: 0,
          partial: false,
          locale: this.i18n.getLocale(),
        },
      };
    }

    // Fetch director info
    const result = await this.directorAdapter.fetch(input, this.i18n.getLocale());
    const director = result.data;

    const network: DirectorNetwork = {
      din: director.din,
      directorName: director.name,
      designation: director.designation,
      dateOfAppointment: director.dateOfAppointment,
      dateOfCessation: director.dateOfCessation,
      totalCompanies: director.companies.length,
      companies: director.companies,
    };

    if (this.ttl > 0) {
      await this.cache.set(key, network, this.ttl);
    }

    return {
      data: network,
      _meta: {
        ...result._meta,
        adapter: result._meta.adapter,
      },
    };
  }

  cacheKey(input: DirectorQuery): string {
    return `mca:network:${input.din}`;
  }

  get ttl(): number {
    return 259200; // 72 hours
  }
}
