import { describe, it, expect, vi } from 'vitest';
import { BatchProcessor } from '../src/batch-processor';

describe('BatchProcessor', () => {
  const processor = new BatchProcessor();

  it('processes all items successfully', async () => {
    const items = [1, 2, 3, 4, 5];
    const result = await processor.execute(
      items,
      async (n) => n * 2,
      { delayBetweenChunksMs: 0 }
    );

    expect(result.aborted).toBe(false);
    expect(result.totalItems).toBe(5);
    expect(result.processedItems).toBe(5);
    expect(result.errors).toHaveLength(0);
    expect(result.results).toHaveLength(5);

    // Results may come in any order; sort by index
    const sorted = [...result.results].sort((a, b) => a.index - b.index);
    expect(sorted.map((r) => r.data)).toEqual([2, 4, 6, 8, 10]);
  });

  it('handles partial failure — some items throw', async () => {
    const items = [1, 2, 3, 4, 5];
    const result = await processor.execute(
      items,
      async (n) => {
        if (n % 2 === 0) throw new Error(`fail-${n}`);
        return n * 10;
      },
      { delayBetweenChunksMs: 0 }
    );

    expect(result.errors).toHaveLength(2); // 2 and 4 fail
    expect(result.results).toHaveLength(3); // 1, 3, 5 succeed
    expect(result.totalItems).toBe(5);
    expect(result.processedItems).toBe(5);
    expect(result.aborted).toBe(false);
  });

  it('returns errors with correct indices', async () => {
    const items = ['a', 'b', 'c'];
    const result = await processor.execute(
      items,
      async (s) => {
        if (s === 'b') throw new Error('b-error');
        return s.toUpperCase();
      },
      { delayBetweenChunksMs: 0 }
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].index).toBe(1);
    expect(result.errors[0].error).toBe('b-error');

    const successIndices = result.results.map((r) => r.index).sort();
    expect(successIndices).toEqual([0, 2]);
  });

  it('respects chunk size — processes in groups', async () => {
    const batchTracker: number[][] = [];
    const items = [1, 2, 3, 4, 5, 6, 7];

    let currentBatchStart = 0;
    const result = await processor.execute(
      items,
      async (n) => n,
      { chunkSize: 3, delayBetweenChunksMs: 0 }
    );

    // Verify all items processed
    expect(result.totalItems).toBe(7);
    expect(result.processedItems).toBe(7);
    expect(result.results).toHaveLength(7);
  });

  it('aborts when AbortController signal fires', async () => {
    const controller = new AbortController();
    const items = Array.from({ length: 30 }, (_, i) => i);

    let callCount = 0;
    const result = await processor.execute(
      items,
      async (n) => {
        callCount++;
        // Abort after first chunk is underway
        if (callCount === 5) controller.abort();
        return n;
      },
      { chunkSize: 10, delayBetweenChunksMs: 0, signal: controller.signal }
    );

    expect(result.aborted).toBe(true);
    // Only first chunk (10 items) should have been processed before abort check
    expect(result.processedItems).toBeLessThan(30);
    expect(result.totalItems).toBe(30);
  });

  it('handles empty input array', async () => {
    const result = await processor.execute(
      [],
      async (n: number) => n * 2,
      { delayBetweenChunksMs: 0 }
    );

    expect(result.totalItems).toBe(0);
    expect(result.processedItems).toBe(0);
    expect(result.results).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.aborted).toBe(false);
  });

  it('returns correct totalItems and processedItems counts', async () => {
    const items = [1, 2, 3, 4, 5, 6];
    const result = await processor.execute(
      items,
      async (n) => {
        if (n === 3 || n === 5) throw new Error('intentional');
        return n;
      },
      { chunkSize: 3, delayBetweenChunksMs: 0 }
    );

    expect(result.totalItems).toBe(6);
    expect(result.processedItems).toBe(6); // all attempted
    expect(result.results).toHaveLength(4); // 1,2,4,6
    expect(result.errors).toHaveLength(2);  // 3,5
  });
});
