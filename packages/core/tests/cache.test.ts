import { describe, it, expect, beforeEach } from 'vitest';
import { CacheLayer } from '../src/cache';

describe('CacheLayer (LRU only)', () => {
  let cache: CacheLayer;

  beforeEach(() => {
    cache = new CacheLayer(); // no Redis URL → LRU only
  });

  it('returns undefined for a cache miss', async () => {
    const result = await cache.get<string>('missing-key');
    expect(result).toBeUndefined();
  });

  it('stores and retrieves a value', async () => {
    await cache.set('foo', 'bar', 60);
    const result = await cache.get<string>('foo');
    expect(result).toBe('bar');
  });

  it('does not cache when ttl <= 0', async () => {
    await cache.set('zero-ttl', 'should-not-be-stored', 0);
    const result = await cache.get<string>('zero-ttl');
    expect(result).toBeUndefined();

    await cache.set('neg-ttl', 'also-skipped', -5);
    const result2 = await cache.get<string>('neg-ttl');
    expect(result2).toBeUndefined();
  });

  it('clears all entries', async () => {
    await cache.set('a', 1, 60);
    await cache.set('b', 2, 60);
    await cache.clear();
    expect(await cache.get('a')).toBeUndefined();
    expect(await cache.get('b')).toBeUndefined();
  });

  it('handles different value types', async () => {
    const obj = { name: 'India', code: 'IN' };
    const arr = [1, 2, 3];

    await cache.set('obj', obj, 60);
    await cache.set('str', 'hello', 60);
    await cache.set('num', 42, 60);
    await cache.set('arr', arr, 60);

    expect(await cache.get('obj')).toEqual(obj);
    expect(await cache.get<string>('str')).toBe('hello');
    expect(await cache.get<number>('num')).toBe(42);
    expect(await cache.get('arr')).toEqual(arr);
  });
});
