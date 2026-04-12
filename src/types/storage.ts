// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

//=============================================================================
// StateStore — pluggable key/value persistence contract
//=============================================================================

export interface StateStore {
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  remove(key: string): Promise<string | null>;
  getAllKeys(): Promise<string[]>;
}
