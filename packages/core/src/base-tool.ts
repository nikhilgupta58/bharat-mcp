import { CacheLayer } from './cache'
import { AdapterChain } from './adapter-chain'
import { I18nService } from './i18n'
import { ToolResponse } from './types'

export abstract class BaseTool<TInput, TOutput> {
  constructor(
    protected cache: CacheLayer,
    protected adapterChain: AdapterChain<TInput, TOutput>,
    protected i18n: I18nService,
  ) {}

  async execute(rawInput: unknown): Promise<ToolResponse<TOutput>> {
    const input = this.validate(rawInput)

    // Check cache
    const key = this.cacheKey(input)
    const cached = await this.cache.get<TOutput>(key)
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
      }
    }

    // Fetch from adapter chain
    const result = await this.adapterChain.fetch(input, this.i18n.getLocale())

    // Cache the result (skip when ttl = 0)
    if (this.ttl > 0) {
      await this.cache.set(key, result.data, this.ttl)
    }

    return result
  }

  abstract validate(rawInput: unknown): TInput
  abstract cacheKey(input: TInput): string
  abstract get ttl(): number
}
