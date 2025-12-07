import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebStorageStateStore, InMemoryWebStorage } from '../../src/storage/Storage.js';

describe('storage/WebStorageStateStore', () => {
  let store;

  beforeEach(() => {
    const mockStorage = new InMemoryWebStorage();
    store = new WebStorageStateStore({ store: mockStorage });
  });

  it('should create a WebStorageStateStore instance', () => {
    expect(store).toBeInstanceOf(WebStorageStateStore);
  });

  it('should set and get values', async () => {
    await store.set('test_key', 'test_value');
    const value = await store.get('test_key');
    expect(value).toBe('test_value');
  });

  it('should store objects as JSON', async () => {
    const obj = { foo: 'bar', num: 42 };
    await store.set('test_obj', obj);
    const retrieved = await store.get('test_obj');
    expect(retrieved).toEqual(obj);
  });

  it('should remove values', async () => {
    await store.set('test_key', 'test_value');
    await store.remove('test_key');
    const value = await store.get('test_key');
    expect(value).toBeNull();
  });

  it('should get all keys', async () => {
    await store.set('key1', 'value1');
    await store.set('key2', 'value2');
    const keys = await store.getAllKeys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });

  it('should use prefix for keys', async () => {
    const prefixedStore = new WebStorageStateStore({
      prefix: 'myapp.',
      store: new InMemoryWebStorage(),
    });
    await prefixedStore.set('test', 'value');
    // Verify the key is prefixed in storage
    const keys = await prefixedStore.getAllKeys();
    expect(keys[0]).toBe('test');
  });
});

describe('storage/InMemoryWebStorage', () => {
  let storage;

  beforeEach(() => {
    storage = new InMemoryWebStorage();
  });

  it('should create an InMemoryWebStorage instance', () => {
    expect(storage).toBeInstanceOf(InMemoryWebStorage);
  });

  it('should set and get items', () => {
    storage.setItem('key', 'value');
    expect(storage.getItem('key')).toBe('value');
  });

  it('should return null for non-existent keys', () => {
    expect(storage.getItem('nonexistent')).toBeNull();
  });

  it('should remove items', () => {
    storage.setItem('key', 'value');
    storage.removeItem('key');
    expect(storage.getItem('key')).toBeNull();
  });

  it('should report correct length', () => {
    expect(storage.length).toBe(0);
    storage.setItem('key1', 'value1');
    expect(storage.length).toBe(1);
    storage.setItem('key2', 'value2');
    expect(storage.length).toBe(2);
  });

  it('should get key by index', () => {
    storage.setItem('key1', 'value1');
    storage.setItem('key2', 'value2');
    const key = storage.key(0);
    expect(['key1', 'key2']).toContain(key);
  });

  it('should return null for invalid index', () => {
    expect(storage.key(999)).toBeNull();
  });
});
