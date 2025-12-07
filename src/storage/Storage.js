/* eslint-disable */
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import {Log} from '../utils/Log.js';
import {Global} from '../utils/Global.js';

/**
 * WebStorageStateStore - Browser localStorage/sessionStorage backed state store
 */
export class WebStorageStateStore {
  constructor({prefix = 'oidc.', store = Global.localStorage} = {}) {
    this._store = store;
    this._prefix = prefix;
  }

  set(key, value) {
    Log.debug('WebStorageStateStore.set', key);

    key = this._prefix + key;

    this._store.setItem(key, value);

    return Promise.resolve();
  }

  get(key) {
    Log.debug('WebStorageStateStore.get', key);

    key = this._prefix + key;

    let item = this._store.getItem(key);

    return Promise.resolve(item);
  }

  remove(key) {
    Log.debug('WebStorageStateStore.remove', key);

    key = this._prefix + key;

    let item = this._store.getItem(key);
    this._store.removeItem(key);

    return Promise.resolve(item);
  }

  getAllKeys() {
    Log.debug('WebStorageStateStore.getAllKeys');

    var keys = [];

    for (let index = 0; index < this._store.length; index++) {
      let key = this._store.key(index);

      if (key.indexOf(this._prefix) === 0) {
        keys.push(key.substr(this._prefix.length));
      }
    }

    return Promise.resolve(keys);
  }
}

/**
 * InMemoryWebStorage - In-memory storage implementation (for testing or non-browser environments)
 */
export class InMemoryWebStorage {
  constructor() {
    this._data = {};
  }

  getItem(key) {
    Log.debug('InMemoryWebStorage.getItem', key);
    // Explicitly check for the key and return null if missing
    if (Object.prototype.hasOwnProperty.call(this._data, key)) {
      return this._data[key];
    }
    return null;
  }

  setItem(key, value) {
    Log.debug('InMemoryWebStorage.setItem', key);
    this._data[key] = value;
  }

  removeItem(key) {
    Log.debug('InMemoryWebStorage.removeItem', key);
    delete this._data[key];
  }

  get length() {
    return Object.getOwnPropertyNames(this._data).length;
  }

  key(index) {
    const keys = Object.getOwnPropertyNames(this._data);
    
    // Check index bound and return null if invalid
    if (index >= 0 && index < keys.length) {
      return keys[index];
    }
    return null; 
  }
}
