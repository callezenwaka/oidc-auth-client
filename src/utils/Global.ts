// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

export interface TimerService {
  setInterval(cb: () => void, duration: number): ReturnType<typeof setInterval>;
  clearInterval(handle: ReturnType<typeof setInterval>): void;
}

const timer: TimerService = {
  setInterval(cb, duration) {
    return setInterval(cb, duration);
  },
  clearInterval(handle) {
    clearInterval(handle);
  },
};

let testing = false;
let request: typeof XMLHttpRequest | null = null;

export class Global {
  static _testing(): void {
    testing = true;
  }

  static get location(): Location | undefined {
    if (!testing) {
      return location;
    }
    return undefined;
  }

  static get localStorage(): Storage | undefined {
    if (!testing && typeof window !== 'undefined') {
      return localStorage;
    }
    return undefined;
  }

  static get sessionStorage(): Storage | undefined {
    if (!testing && typeof window !== 'undefined') {
      return sessionStorage;
    }
    return undefined;
  }

  static setXMLHttpRequest(newRequest: typeof XMLHttpRequest): void {
    request = newRequest;
  }

  static get XMLHttpRequest(): typeof XMLHttpRequest | undefined {
    if (!testing && typeof window !== 'undefined') {
      return request || XMLHttpRequest;
    }
    return undefined;
  }

  static get timer(): TimerService | undefined {
    if (!testing) {
      return timer;
    }
    return undefined;
  }
}
