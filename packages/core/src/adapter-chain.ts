import { DataAdapter, ToolResponse } from './types'
import { UpstreamError } from './errors'

export class AdapterChain<TQuery, TResult> {
  constructor(private adapters: DataAdapter<TQuery, TResult>[]) {
    if (adapters.length === 0) throw new Error('AdapterChain requires at least one adapter')
  }

  async fetch(query: TQuery, locale: 'en' | 'hi' = 'en'): Promise<ToolResponse<TResult>> {
    const errors: Error[] = []

    for (const adapter of this.adapters) {
      const start = Date.now()
      try {
        const result = await adapter.fetch(query)
        return {
          data: result,
          _meta: {
            adapter: adapter.name,
            cached: false,
            fetchedAt: new Date().toISOString(),
            latencyMs: Date.now() - start,
            partial: false,
            locale,
          },
        }
      } catch (err) {
        if (!(err instanceof UpstreamError)) {
          // Non-upstream errors (ValidationError, etc.) bubble up immediately
          throw err
        }
        // Both retryable and non-retryable UpstreamErrors: try next adapter
        errors.push(err as Error)
      }
    }

    // All adapters failed — throw the last error
    throw errors[errors.length - 1]
  }
}
