export interface BatchOptions {
  chunkSize?: number;              // Default: 10
  delayBetweenChunksMs?: number;  // Default: 1000
  concurrency?: number;            // Default: 5 (within a chunk)
  signal?: AbortSignal;            // For cancellation
}

export interface BatchResult<T> {
  results: { index: number; data: T }[];
  errors: { index: number; error: string }[];
  totalItems: number;
  processedItems: number;
  aborted: boolean;
}

export class BatchProcessor {
  async execute<TInput, TOutput>(
    items: TInput[],
    processFn: (item: TInput) => Promise<TOutput>,
    options: BatchOptions = {}
  ): Promise<BatchResult<TOutput>> {
    const { chunkSize = 10, delayBetweenChunksMs = 1000, signal } = options;

    const results: BatchResult<TOutput>['results'] = [];
    const errors: BatchResult<TOutput>['errors'] = [];

    // Handle empty input
    if (items.length === 0) {
      return { results, errors, totalItems: 0, processedItems: 0, aborted: false };
    }

    for (let i = 0; i < items.length; i += chunkSize) {
      // Check abort signal before each chunk
      if (signal?.aborted) {
        return {
          results,
          errors,
          totalItems: items.length,
          processedItems: results.length + errors.length,
          aborted: true,
        };
      }

      const chunk = items.slice(i, i + chunkSize);

      // Process chunk items concurrently
      const chunkPromises = chunk.map(async (item, j) => {
        const index = i + j;
        try {
          const data = await processFn(item);
          results.push({ index, data });
        } catch (err: any) {
          errors.push({ index, error: err.message || String(err) });
        }
      });

      await Promise.all(chunkPromises);

      // Delay between chunks (not after last chunk)
      if (i + chunkSize < items.length && delayBetweenChunksMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delayBetweenChunksMs));
      }
    }

    return {
      results,
      errors,
      totalItems: items.length,
      processedItems: results.length + errors.length,
      aborted: false,
    };
  }
}
