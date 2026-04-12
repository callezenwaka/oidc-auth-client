// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { Global, TimerService } from '../utils/Global.js';
import { Event } from '../utils/Event.js';

const TimerDuration = 5; // seconds

export class Timer extends Event {
  private _timer: TimerService;
  private _nowFunc: () => number;
  private _expiration: number = 0;
  private _timerHandle: ReturnType<typeof setInterval> | null = null;

  constructor(name: string, timer: TimerService = Global.timer!, nowFunc?: () => number) {
    super(name);
    this._timer = timer;
    this._nowFunc = nowFunc ?? (() => (Date.now() / 1000) | 0);
  }

  get now(): number {
    return this._nowFunc();
  }

  get expiration(): number {
    return this._expiration;
  }

  init(duration: number): void {
    if (duration <= 0) duration = 1;
    duration = parseInt(String(duration));

    const expiration = this.now + duration;
    if (this.expiration === expiration && this._timerHandle) {
      Log.debug('Timer.init timer ' + this._name + ' skipping initialization since already initialized for expiration:', this.expiration);
      return;
    }

    this.cancel();
    Log.debug('Timer.init timer ' + this._name + ' for duration:', duration);
    this._expiration = expiration;

    const timerDuration = duration < TimerDuration ? duration : TimerDuration;
    this._timerHandle = this._timer.setInterval(this._callback.bind(this), timerDuration * 1000);
  }

  cancel(): void {
    if (this._timerHandle) {
      Log.debug('Timer.cancel: ', this._name);
      this._timer.clearInterval(this._timerHandle);
      this._timerHandle = null;
    }
  }

  private _callback(): void {
    const diff = this._expiration - this.now;
    Log.debug('Timer.callback; ' + this._name + ' timer expires in:', diff);
    if (this._expiration <= this.now) {
      this.cancel();
      super.raise();
    }
  }
}

export class ClockService {
  getEpochTime(): Promise<number> {
    return Promise.resolve((Date.now() / 1000) | 0);
  }
}
