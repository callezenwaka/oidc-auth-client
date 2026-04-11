// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from '../utils/Log.js';
import { UrlUtility } from '../services/Http.js';

//=============================================================================
// RedirectNavigator - Full page redirect navigation
//=============================================================================

export interface NavigateParams {
  url: string;
  useReplaceToNavigate?: boolean;
  id?: string;
  silentRequestTimeout?: number;
  startUrl?: string;
}

export class RedirectNavigator {
  prepare(): Promise<RedirectNavigator> {
    return Promise.resolve(this);
  }

  navigate(params: NavigateParams): Promise<void> {
    if (!params || !params.url) {
      Log.error('RedirectNavigator.navigate: No url provided');
      return Promise.reject(new Error('No url provided'));
    }

    if (params.useReplaceToNavigate) {
      window.location.replace(params.url);
    } else {
      window.location.href = params.url;
    }

    return Promise.resolve();
  }

  get url(): string {
    return window.location.href;
  }
}

//=============================================================================
// PopupWindow - Browser popup window management
//=============================================================================

const CheckForPopupClosedInterval = 500;
const DefaultPopupFeatures =
  'location=no,toolbar=no,width=500,height=500,left=100,top=100;';
const DefaultPopupTarget = '_blank';

export interface PopupWindowParams {
  popupWindowTarget?: string;
  popupWindowFeatures?: string;
}

export class PopupWindow {
  private _promise: Promise<any>;
  private _resolve!: (value: any) => void;
  private _reject!: (reason?: any) => void;
  private _popup: Window | null;
  private _checkForPopupClosedTimer: ReturnType<typeof setInterval> | null = null;
  private _id: string | undefined;

  constructor(params: PopupWindowParams & NavigateParams) {
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    const target = params.popupWindowTarget || DefaultPopupTarget;
    const features = params.popupWindowFeatures || DefaultPopupFeatures;

    this._popup = window.open('', target, features);
    if (this._popup) {
      Log.debug('PopupWindow.ctor: popup successfully created');
      this._checkForPopupClosedTimer = window.setInterval(
        this._checkForPopupClosed.bind(this),
        CheckForPopupClosedInterval,
      );
    }
  }

  get promise(): Promise<any> {
    return this._promise;
  }

  navigate(params: NavigateParams): Promise<any> {
    if (!this._popup) {
      this._error('PopupWindow.navigate: Error opening popup window');
    } else if (!params || !params.url) {
      this._error('PopupWindow.navigate: no url provided');
      this._error('No url provided');
    } else {
      Log.debug('PopupWindow.navigate: Setting URL in popup');

      this._id = params.id;
      if (this._id) {
        (window as any)['popupCallback_' + params.id] = this._callback.bind(this);
      }

      this._popup.focus();
      (this._popup as any).location = params.url;
    }

    return this.promise;
  }

  private _success(data: any): void {
    Log.debug('PopupWindow.callback: Successful response from popup window');
    this._cleanup();
    this._resolve(data);
  }

  private _error(message: string): void {
    Log.error('PopupWindow.error: ', message);
    this._cleanup();
    this._reject(new Error(message));
  }

  close(): void {
    this._cleanup(false);
  }

  private _cleanup(keepOpen?: boolean): void {
    Log.debug('PopupWindow.cleanup');

    if (this._checkForPopupClosedTimer !== null) {
      window.clearInterval(this._checkForPopupClosedTimer);
      this._checkForPopupClosedTimer = null;
    }

    delete (window as any)['popupCallback_' + this._id];

    if (this._popup && !keepOpen) {
      this._popup.close();
    }
    this._popup = null;
  }

  private _checkForPopupClosed(): void {
    if (!this._popup || this._popup.closed) {
      this._error('Popup window closed');
    }
  }

  private _callback(url: string, keepOpen: boolean): void {
    this._cleanup(keepOpen);

    if (url) {
      Log.debug('PopupWindow.callback success');
      this._success({ url });
    } else {
      Log.debug('PopupWindow.callback: Invalid response from popup');
      this._error('Invalid response from popup');
    }
  }

  static notifyOpener(url: string | undefined, keepOpen: boolean | undefined, delimiter: string): void {
    if (window.opener) {
      url = url || window.location.href;
      if (url) {
        const data = UrlUtility.parseUrlFragment(url, delimiter);

        if (data.state) {
          const name = 'popupCallback_' + data.state;
          const callback = window.opener[name];
          if (callback) {
            Log.debug('PopupWindow.notifyOpener: passing url message to opener');
            callback(url, keepOpen);
          } else {
            Log.warn('PopupWindow.notifyOpener: no matching callback found on opener');
          }
        } else {
          Log.warn('PopupWindow.notifyOpener: no state found in response url');
        }
      }
    } else {
      Log.warn("PopupWindow.notifyOpener: no window.opener. Can't complete notification.");
    }
  }
}

//=============================================================================
// PopupNavigator - Popup-based navigation
//=============================================================================

export class PopupNavigator {
  prepare(params: PopupWindowParams & NavigateParams): Promise<PopupWindow> {
    const popup = new PopupWindow(params);
    return Promise.resolve(popup);
  }

  callback(url: string | undefined, keepOpen: boolean | undefined, delimiter: string): Promise<void> {
    Log.debug('PopupNavigator.callback');

    try {
      PopupWindow.notifyOpener(url, keepOpen, delimiter);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }
}

//=============================================================================
// IFrameWindow - Hidden iframe window management
//=============================================================================

const DefaultTimeout = 10000;

export class IFrameWindow {
  private _promise: Promise<any>;
  private _resolve!: (value: any) => void;
  private _reject!: (reason?: any) => void;
  private _boundMessageEvent: ((e: MessageEvent) => void) | null;
  private _frame: HTMLIFrameElement | null;
  private _timer: ReturnType<typeof setTimeout> | null = null;

  constructor(_params?: NavigateParams) {
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    this._boundMessageEvent = this._message.bind(this);
    window.addEventListener('message', this._boundMessageEvent, false);

    this._frame = window.document.createElement('iframe');

    // shotgun approach
    this._frame.style.visibility = 'hidden';
    this._frame.style.position = 'absolute';
    this._frame.width = '0';
    this._frame.height = '0';

    window.document.body.appendChild(this._frame);
  }

  navigate(params: NavigateParams): Promise<any> {
    if (!params || !params.url) {
      this._error('No url provided');
    } else {
      const timeout = params.silentRequestTimeout || DefaultTimeout;
      Log.debug('IFrameWindow.navigate: Using timeout of:', timeout);
      this._timer = window.setTimeout(this._timeout.bind(this), timeout);
      this._frame!.src = params.url;
    }

    return this.promise;
  }

  get promise(): Promise<any> {
    return this._promise;
  }

  private _success(data: any): void {
    this._cleanup();
    Log.debug('IFrameWindow: Successful response from frame window');
    this._resolve(data);
  }

  private _error(message: string): void {
    this._cleanup();
    Log.error(message);
    this._reject(new Error(message));
  }

  close(): void {
    this._cleanup();
  }

  private _cleanup(): void {
    if (this._frame) {
      Log.debug('IFrameWindow: cleanup');

      window.removeEventListener('message', this._boundMessageEvent!, false);
      if (this._timer !== null) window.clearTimeout(this._timer);
      window.document.body.removeChild(this._frame);

      this._timer = null;
      this._frame = null;
      this._boundMessageEvent = null;
    }
  }

  private _timeout(): void {
    Log.debug('IFrameWindow.timeout');
    this._error('Frame window timed out');
  }

  private _message(e: MessageEvent): void {
    Log.debug('IFrameWindow.message');

    if (
      this._timer &&
      e.origin === this._origin &&
      this._frame &&
      e.source === this._frame.contentWindow &&
      typeof e.data === 'string' &&
      (e.data.startsWith('http://') || e.data.startsWith('https://'))
    ) {
      const url = e.data;
      if (url) {
        this._success({ url });
      } else {
        this._error('Invalid response from frame');
      }
    }
  }

  private get _origin(): string {
    return location.protocol + '//' + location.host;
  }

  static notifyParent(url?: string): void {
    Log.debug('IFrameWindow.notifyParent');
    url = url || window.location.href;
    if (url) {
      Log.debug('IFrameWindow.notifyParent: posting url message to parent');
      window.parent.postMessage(url, location.protocol + '//' + location.host);
    }
  }
}

//=============================================================================
// IFrameNavigator - IFrame-based navigation
//=============================================================================

export class IFrameNavigator {
  prepare(params: NavigateParams): Promise<IFrameWindow> {
    const frame = new IFrameWindow(params);
    return Promise.resolve(frame);
  }

  callback(url?: string): Promise<void> {
    Log.debug('IFrameNavigator.callback');

    try {
      IFrameWindow.notifyParent(url);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }
}

//=============================================================================
// CheckSessionIFrame - Session state monitoring iframe
//=============================================================================

const DefaultInterval = 2000;

export class CheckSessionIFrame {
  private _callback: () => void;
  private _client_id: string;
  private _url: string;
  private _interval: number;
  private _stopOnError: boolean;
  private _frame_origin: string;
  private _frame: HTMLIFrameElement;
  private _boundMessageEvent: ((e: MessageEvent) => void) | undefined;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _session_state: string | null = null;

  constructor(callback: () => void, client_id: string, url: string, interval?: number, stopOnError: boolean = true) {
    this._callback = callback;
    this._client_id = client_id;
    this._url = url;
    this._interval = interval || DefaultInterval;
    this._stopOnError = stopOnError;

    const idx = url.indexOf('/', url.indexOf('//') + 2);
    this._frame_origin = url.substring(0, idx);

    this._frame = window.document.createElement('iframe');

    // shotgun approach
    this._frame.style.visibility = 'hidden';
    this._frame.style.position = 'absolute';
    this._frame.style.display = 'none';
    this._frame.width = '0';
    this._frame.height = '0';

    this._frame.src = url;
  }

  load(): Promise<void> {
    return new Promise(resolve => {
      this._frame.onload = () => {
        resolve();
      };

      window.document.body.appendChild(this._frame);
      this._boundMessageEvent = this._message.bind(this);
      window.addEventListener('message', this._boundMessageEvent, false);
    });
  }

  private _message(e: MessageEvent): void {
    if (
      e.origin === this._frame_origin &&
      e.source === this._frame.contentWindow
    ) {
      if (e.data === 'error') {
        Log.error('CheckSessionIFrame: error message from check session op iframe');
        if (this._stopOnError) {
          this.stop();
        }
      } else if (e.data === 'changed') {
        Log.debug('CheckSessionIFrame: changed message from check session op iframe');
        this.stop();
        this._callback();
      } else {
        Log.debug('CheckSessionIFrame: ' + e.data + ' message from check session op iframe');
      }
    }
  }

  start(session_state: string): void {
    if (this._session_state !== session_state) {
      Log.debug('CheckSessionIFrame.start');

      this.stop();

      this._session_state = session_state;

      const send = () => {
        this._frame.contentWindow!.postMessage(
          this._client_id + ' ' + this._session_state,
          this._frame_origin,
        );
      };

      // trigger now
      send();

      // and setup timer
      this._timer = window.setInterval(send, this._interval);
    }
  }

  stop(): void {
    this._session_state = null;

    if (this._timer) {
      Log.debug('CheckSessionIFrame.stop');
      window.clearInterval(this._timer);
      this._timer = null;
    }
  }
}

//=============================================================================
// CordovaPopupWindow - Cordova InAppBrowser popup window
//=============================================================================

const DefaultCordovaPopupFeatures = 'location=no,toolbar=no,zoom=no';
const DefaultCordovaPopupTarget = '_blank';

export interface CordovaPopupParams {
  popupWindowFeatures?: string;
  popupWindowTarget?: string;
  startUrl?: string;
}

export class CordovaPopupWindow {
  private _promise: Promise<any>;
  private _resolve!: (value: any) => void;
  private _reject!: (reason?: any) => void;
  private _popup: any;
  private _exitCallbackEvent: ((e: any) => void) | undefined;
  private _loadStartCallbackEvent: ((e: any) => void) | undefined;
  features: string;
  target: string;
  redirect_uri: string | undefined;

  constructor(params: CordovaPopupParams & NavigateParams) {
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    this.features = params.popupWindowFeatures || DefaultCordovaPopupFeatures;
    this.target = params.popupWindowTarget || DefaultCordovaPopupTarget;

    this.redirect_uri = params.startUrl;
    Log.debug('CordovaPopupWindow.ctor: redirect_uri: ' + this.redirect_uri);
  }

  private _isInAppBrowserInstalled(cordovaMetadata: Record<string, any>): boolean {
    return [
      'cordova-plugin-inappbrowser',
      'cordova-plugin-inappbrowser.inappbrowser',
      'org.apache.cordova.inappbrowser',
    ].some(name => Object.prototype.hasOwnProperty.call(cordovaMetadata, name));
  }

  navigate(params: NavigateParams): Promise<any> {
    if (!params || !params.url) {
      this._error('No url provided');
    } else {
      const win = window as any;
      if (!win.cordova) {
        return this._errorAndReturn('cordova is undefined');
      }

      const cordovaMetadata = win.cordova.require('cordova/plugin_list').metadata;
      if (this._isInAppBrowserInstalled(cordovaMetadata) === false) {
        return this._errorAndReturn('InAppBrowser plugin not found');
      }
      this._popup = win.cordova.InAppBrowser.open(params.url, this.target, this.features);
      if (this._popup) {
        Log.debug('CordovaPopupWindow.navigate: popup successfully created');

        this._exitCallbackEvent = this._exitCallback.bind(this);
        this._loadStartCallbackEvent = this._loadStartCallback.bind(this);

        this._popup.addEventListener('exit', this._exitCallbackEvent, false);
        this._popup.addEventListener('loadstart', this._loadStartCallbackEvent, false);
      } else {
        this._error('Error opening popup window');
      }
    }
    return this.promise;
  }

  get promise(): Promise<any> {
    return this._promise;
  }

  private _loadStartCallback(event: { url: string }): void {
    if (this.redirect_uri && event.url.indexOf(this.redirect_uri) === 0) {
      this._success({ url: event.url });
    }
  }

  private _exitCallback(message: any): void {
    this._error(message);
  }

  private _success(data: any): void {
    this._cleanup();
    Log.debug('CordovaPopupWindow: Successful response from cordova popup window');
    this._resolve(data);
  }

  private _error(message: string): void {
    this._cleanup();
    Log.error(message);
    this._reject(new Error(message));
  }

  private _errorAndReturn(message: string): Promise<any> {
    this._error(message);
    return this.promise;
  }

  close(): void {
    this._cleanup();
  }

  private _cleanup(): void {
    if (this._popup) {
      Log.debug('CordovaPopupWindow: cleaning up popup');
      this._popup.removeEventListener('exit', this._exitCallbackEvent, false);
      this._popup.removeEventListener('loadstart', this._loadStartCallbackEvent, false);
      this._popup.close();
    }
    this._popup = null;
  }
}

//=============================================================================
// CordovaPopupNavigator - Cordova popup navigation
//=============================================================================

export class CordovaPopupNavigator {
  prepare(params: CordovaPopupParams & NavigateParams): Promise<CordovaPopupWindow> {
    const popup = new CordovaPopupWindow(params);
    return Promise.resolve(popup);
  }
}

//=============================================================================
// CordovaIFrameNavigator - Cordova hidden popup navigation
//=============================================================================

export class CordovaIFrameNavigator {
  prepare(params: CordovaPopupParams & NavigateParams): Promise<CordovaPopupWindow> {
    params.popupWindowFeatures = 'hidden=yes';
    const popup = new CordovaPopupWindow(params);
    return Promise.resolve(popup);
  }
}
