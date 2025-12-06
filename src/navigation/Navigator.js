/* eslint-disable */
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import {Log} from '../utils/Log.js';
import {UrlUtility} from '../services/Http.js';

//=============================================================================
// RedirectNavigator - Full page redirect navigation
//=============================================================================

export class RedirectNavigator {
  prepare() {
    return Promise.resolve(this);
  }

  navigate(params) {
    if (!params || !params.url) {
      Log.error('RedirectNavigator.navigate: No url provided');
      return Promise.reject(new Error('No url provided'));
    }

    if (params.useReplaceToNavigate) {
      window.location.replace(params.url);
    } else {
      window.location = params.url;
    }

    return Promise.resolve();
  }

  get url() {
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

export class PopupWindow {
  constructor(params) {
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    let target = params.popupWindowTarget || DefaultPopupTarget;
    let features = params.popupWindowFeatures || DefaultPopupFeatures;

    this._popup = window.open('', target, features);
    if (this._popup) {
      Log.debug('PopupWindow.ctor: popup successfully created');
      this._checkForPopupClosedTimer = window.setInterval(
        this._checkForPopupClosed.bind(this),
        CheckForPopupClosedInterval,
      );
    }
  }

  get promise() {
    return this._promise;
  }

  navigate(params) {
    if (!this._popup) {
      this._error('PopupWindow.navigate: Error opening popup window');
    } else if (!params || !params.url) {
      this._error('PopupWindow.navigate: no url provided');
      this._error('No url provided');
    } else {
      Log.debug('PopupWindow.navigate: Setting URL in popup');

      this._id = params.id;
      if (this._id) {
        window['popupCallback_' + params.id] = this._callback.bind(this);
      }

      this._popup.focus();
      this._popup.window.location = params.url;
    }

    return this.promise;
  }

  _success(data) {
    Log.debug('PopupWindow.callback: Successful response from popup window');

    this._cleanup();
    this._resolve(data);
  }
  _error(message) {
    Log.error('PopupWindow.error: ', message);

    this._cleanup();
    this._reject(new Error(message));
  }

  close() {
    this._cleanup(false);
  }

  _cleanup(keepOpen) {
    Log.debug('PopupWindow.cleanup');

    window.clearInterval(this._checkForPopupClosedTimer);
    this._checkForPopupClosedTimer = null;

    delete window['popupCallback_' + this._id];

    if (this._popup && !keepOpen) {
      this._popup.close();
    }
    this._popup = null;
  }

  _checkForPopupClosed() {
    if (!this._popup || this._popup.closed) {
      this._error('Popup window closed');
    }
  }

  _callback(url, keepOpen) {
    this._cleanup(keepOpen);

    if (url) {
      Log.debug('PopupWindow.callback success');
      this._success({url: url});
    } else {
      Log.debug('PopupWindow.callback: Invalid response from popup');
      this._error('Invalid response from popup');
    }
  }

  static notifyOpener(url, keepOpen, delimiter) {
    if (window.opener) {
      url = url || window.location.href;
      if (url) {
        var data = UrlUtility.parseUrlFragment(url, delimiter);

        if (data.state) {
          var name = 'popupCallback_' + data.state;
          var callback = window.opener[name];
          if (callback) {
            Log.debug(
              'PopupWindow.notifyOpener: passing url message to opener',
            );
            callback(url, keepOpen);
          } else {
            Log.warn(
              'PopupWindow.notifyOpener: no matching callback found on opener',
            );
          }
        } else {
          Log.warn('PopupWindow.notifyOpener: no state found in response url');
        }
      }
    } else {
      Log.warn(
        "PopupWindow.notifyOpener: no window.opener. Can't complete notification.",
      );
    }
  }
}

//=============================================================================
// PopupNavigator - Popup-based navigation
//=============================================================================

export class PopupNavigator {
  prepare(params) {
    let popup = new PopupWindow(params);
    return Promise.resolve(popup);
  }

  callback(url, keepOpen, delimiter) {
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
  constructor(params) {
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
    this._frame.width = 0;
    this._frame.height = 0;

    window.document.body.appendChild(this._frame);
  }

  navigate(params) {
    if (!params || !params.url) {
      this._error('No url provided');
    } else {
      let timeout = params.silentRequestTimeout || DefaultTimeout;
      Log.debug('IFrameWindow.navigate: Using timeout of:', timeout);
      this._timer = window.setTimeout(this._timeout.bind(this), timeout);
      this._frame.src = params.url;
    }

    return this.promise;
  }

  get promise() {
    return this._promise;
  }

  _success(data) {
    this._cleanup();

    Log.debug('IFrameWindow: Successful response from frame window');
    this._resolve(data);
  }
  _error(message) {
    this._cleanup();

    Log.error(message);
    this._reject(new Error(message));
  }

  close() {
    this._cleanup();
  }

  _cleanup() {
    if (this._frame) {
      Log.debug('IFrameWindow: cleanup');

      window.removeEventListener('message', this._boundMessageEvent, false);
      window.clearTimeout(this._timer);
      window.document.body.removeChild(this._frame);

      this._timer = null;
      this._frame = null;
      this._boundMessageEvent = null;
    }
  }

  _timeout() {
    Log.debug('IFrameWindow.timeout');
    this._error('Frame window timed out');
  }

  _message(e) {
    Log.debug('IFrameWindow.message');

    if (
      this._timer &&
      e.origin === this._origin &&
      e.source === this._frame.contentWindow &&
      (typeof e.data === 'string' &&
        (e.data.startsWith('http://') || e.data.startsWith('https://')))
    ) {
      let url = e.data;
      if (url) {
        this._success({url: url});
      } else {
        this._error('Invalid response from frame');
      }
    }
  }

  get _origin() {
    return location.protocol + '//' + location.host;
  }

  static notifyParent(url) {
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
  prepare(params) {
    let frame = new IFrameWindow(params);
    return Promise.resolve(frame);
  }

  callback(url) {
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
  constructor(callback, client_id, url, interval, stopOnError = true) {
    this._callback = callback;
    this._client_id = client_id;
    this._url = url;
    this._interval = interval || DefaultInterval;
    this._stopOnError = stopOnError;

    var idx = url.indexOf('/', url.indexOf('//') + 2);
    this._frame_origin = url.substr(0, idx);

    this._frame = window.document.createElement('iframe');

    // shotgun approach
    this._frame.style.visibility = 'hidden';
    this._frame.style.position = 'absolute';
    this._frame.style.display = 'none';
    this._frame.width = 0;
    this._frame.height = 0;

    this._frame.src = url;
  }
  load() {
    return new Promise(resolve => {
      this._frame.onload = () => {
        resolve();
      };

      window.document.body.appendChild(this._frame);
      this._boundMessageEvent = this._message.bind(this);
      window.addEventListener('message', this._boundMessageEvent, false);
    });
  }
  _message(e) {
    if (
      e.origin === this._frame_origin &&
      e.source === this._frame.contentWindow
    ) {
      if (e.data === 'error') {
        Log.error(
          'CheckSessionIFrame: error message from check session op iframe',
        );
        if (this._stopOnError) {
          this.stop();
        }
      } else if (e.data === 'changed') {
        Log.debug(
          'CheckSessionIFrame: changed message from check session op iframe',
        );
        this.stop();
        this._callback();
      } else {
        Log.debug(
          'CheckSessionIFrame: ' +
            e.data +
            ' message from check session op iframe',
        );
      }
    }
  }
  start(session_state) {
    if (this._session_state !== session_state) {
      Log.debug('CheckSessionIFrame.start');

      this.stop();

      this._session_state = session_state;

      let send = () => {
        this._frame.contentWindow.postMessage(
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

  stop() {
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

export class CordovaPopupWindow {
  constructor(params) {
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    this.features = params.popupWindowFeatures || DefaultCordovaPopupFeatures;
    this.target = params.popupWindowTarget || DefaultCordovaPopupTarget;

    this.redirect_uri = params.startUrl;
    Log.debug('CordovaPopupWindow.ctor: redirect_uri: ' + this.redirect_uri);
  }

  _isInAppBrowserInstalled(cordovaMetadata) {
    return [
      'cordova-plugin-inappbrowser',
      'cordova-plugin-inappbrowser.inappbrowser',
      'org.apache.cordova.inappbrowser',
    ].some(function(name) {
      return cordovaMetadata.hasOwnProperty(name);
    });
  }

  navigate(params) {
    if (!params || !params.url) {
      this._error('No url provided');
    } else {
      if (!window.cordova) {
        return this._error('cordova is undefined');
      }

      var cordovaMetadata = window.cordova.require('cordova/plugin_list')
        .metadata;
      if (this._isInAppBrowserInstalled(cordovaMetadata) === false) {
        return this._error('InAppBrowser plugin not found');
      }
      this._popup = cordova.InAppBrowser.open(
        params.url,
        this.target,
        this.features,
      );
      if (this._popup) {
        Log.debug('CordovaPopupWindow.navigate: popup successfully created');

        this._exitCallbackEvent = this._exitCallback.bind(this);
        this._loadStartCallbackEvent = this._loadStartCallback.bind(this);

        this._popup.addEventListener('exit', this._exitCallbackEvent, false);
        this._popup.addEventListener(
          'loadstart',
          this._loadStartCallbackEvent,
          false,
        );
      } else {
        this._error('Error opening popup window');
      }
    }
    return this.promise;
  }

  get promise() {
    return this._promise;
  }

  _loadStartCallback(event) {
    if (event.url.indexOf(this.redirect_uri) === 0) {
      this._success({url: event.url});
    }
  }
  _exitCallback(message) {
    this._error(message);
  }

  _success(data) {
    this._cleanup();

    Log.debug(
      'CordovaPopupWindow: Successful response from cordova popup window',
    );
    this._resolve(data);
  }
  _error(message) {
    this._cleanup();

    Log.error(message);
    this._reject(new Error(message));
  }

  close() {
    this._cleanup();
  }

  _cleanup() {
    if (this._popup) {
      Log.debug('CordovaPopupWindow: cleaning up popup');
      this._popup.removeEventListener('exit', this._exitCallbackEvent, false);
      this._popup.removeEventListener(
        'loadstart',
        this._loadStartCallbackEvent,
        false,
      );
      this._popup.close();
    }
    this._popup = null;
  }
}

//=============================================================================
// CordovaPopupNavigator - Cordova popup navigation
//=============================================================================

export class CordovaPopupNavigator {
  prepare(params) {
    let popup = new CordovaPopupWindow(params);
    return Promise.resolve(popup);
  }
}

//=============================================================================
// CordovaIFrameNavigator - Cordova hidden popup navigation
//=============================================================================

export class CordovaIFrameNavigator {
  prepare(params) {
    params.popupWindowFeatures = 'hidden=yes';
    let popup = new CordovaPopupWindow(params);
    return Promise.resolve(popup);
  }
}
