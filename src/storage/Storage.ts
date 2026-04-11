// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { Global } from '../utils/Global.js';

export interface StateStore {
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  remove(key: string): Promise<string | null>;
  getAllKeys(): Promise<string[]>;
}

export class WebStorageStateStore implements StateStore {
  private _store: Storage;
  private _prefix: string;

  constructor({ prefix = 'oidc.', store = Global.localStorage }: { prefix?: string; store?: Storage } = {}) {
    this._store = store!;
    this._prefix = prefix;
  }

  set(key: string, value: string): Promise<void> {
    Log.debug('WebStorageStateStore.set', key);
    this._store.setItem(this._prefix + key, value);
    return Promise.resolve();
  }

  get(key: string): Promise<string | null> {
    Log.debug('WebStorageStateStore.get', key);
    const item = this._store.getItem(this._prefix + key);
    return Promise.resolve(item);
  }

  remove(key: string): Promise<string | null> {
    Log.debug('WebStorageStateStore.remove', key);
    const prefixedKey = this._prefix + key;
    const item = this._store.getItem(prefixedKey);
    this._store.removeItem(prefixedKey);
    return Promise.resolve(item);
  }

  getAllKeys(): Promise<string[]> {
    Log.debug('WebStorageStateStore.getAllKeys');
    const keys: string[] = [];
    for (let index = 0; index < this._store.length; index++) {
      const key = this._store.key(index);
      if (key && key.indexOf(this._prefix) === 0) {
        keys.push(key.substring(this._prefix.length));
      }
    }
    return Promise.resolve(keys);
  }
}

export class InMemoryWebStorage implements Storage {
  private _data: Record<string, string> = {};

  getItem(key: string): string | null {
    Log.debug('InMemoryWebStorage.getItem', key);
    return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null;
  }

  setItem(key: string, value: string): void {
    Log.debug('InMemoryWebStorage.setItem', key);
    this._data[key] = value;
  }

  removeItem(key: string): void {
    Log.debug('InMemoryWebStorage.removeItem', key);
    delete this._data[key];
  }

  get length(): number {
    return Object.getOwnPropertyNames(this._data).length;
  }

  key(index: number): string | null {
    const keys = Object.getOwnPropertyNames(this._data);
    return (index >= 0 && index < keys.length) ? keys[index] : null;
  }

  clear(): void {
    this._data = {};
  }
}
