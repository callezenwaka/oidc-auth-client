/* eslint-disable */
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import {Log} from '../utils/Log.js';
import {Global} from '../utils/Global.js';

//=============================================================================
// UrlUtility - URL parsing and manipulation utilities
//=============================================================================

export class UrlUtility {
  static addQueryParam(url, name, value) {
    if (url.indexOf('?') < 0) {
      url += '?';
    }

    if (url[url.length - 1] !== '?') {
      url += '&';
    }

    url += encodeURIComponent(name);
    url += '=';
    url += encodeURIComponent(value);

    return url;
  }

  static parseUrlFragment(value, delimiter = '#', global = Global) {
    if (typeof value !== 'string') {
      value = global.location.href;
    }

    var idx = value.lastIndexOf(delimiter);
    if (idx >= 0) {
      value = value.substr(idx + 1);
    }

    if (delimiter === '?') {
      // if we're doing query, then strip off hash fragment before we parse
      idx = value.indexOf('#');
      if (idx >= 0) {
        value = value.substr(0, idx);
      }
    }

    var params = {},
      regex = /([^&=]+)=([^&]*)/g,
      m;

    var counter = 0;
    while ((m = regex.exec(value))) {
      params[decodeURIComponent(m[1])] = decodeURIComponent(
        m[2].replace(/\+/g, ' '),
      );
      if (counter++ > 50) {
        Log.error(
          'UrlUtility.parseUrlFragment: response exceeded expected number of parameters',
          value,
        );
        return {
          error: 'Response exceeded expected number of parameters',
        };
      }
    }

    for (var prop in params) {
      return params;
    }

    return {};
  }
}

//=============================================================================
// JsonService - HTTP JSON request/response handling
//=============================================================================

export class JsonService {
  constructor(
    additionalContentTypes = null,
    XMLHttpRequestCtor = Global.XMLHttpRequest,
    jwtHandler = null,
  ) {
    if (additionalContentTypes && Array.isArray(additionalContentTypes)) {
      this._contentTypes = additionalContentTypes.slice();
    } else {
      this._contentTypes = [];
    }
    this._contentTypes.push('application/json');
    if (jwtHandler) {
      this._contentTypes.push('application/jwt');
    }

    this._XMLHttpRequest = XMLHttpRequestCtor;
    this._jwtHandler = jwtHandler;
  }

  getJson(url, token) {
    if (!url) {
      Log.error('JsonService.getJson: No url passed');
      throw new Error('url');
    }

    Log.debug('JsonService.getJson, url: ', url);

    return new Promise((resolve, reject) => {
      var req = new this._XMLHttpRequest();

      // NOTE: Cache buster for IE11
      var _url = new URL(url);
      _url.searchParams.append('_ts', Date.now());
      Log.debug('JsonService.getJson, cache buster url: ', _url.toString());

      req.open('GET', _url.toString());

      var allowedContentTypes = this._contentTypes;
      var jwtHandler = this._jwtHandler;

      req.onload = function() {
        Log.debug(
          'JsonService.getJson: HTTP response received, status',
          req.status,
        );

        if (req.status === 200) {
          var contentType = req.getResponseHeader('Content-Type');
          if (contentType) {
            var found = allowedContentTypes.find(item => {
              if (contentType.startsWith(item)) {
                return true;
              }
            });

            if (found == 'application/jwt') {
              jwtHandler(req).then(resolve, reject);
              return;
            }

            if (found) {
              try {
                resolve(JSON.parse(req.responseText));
                return;
              } catch (e) {
                Log.error(
                  'JsonService.getJson: Error parsing JSON response',
                  e.message,
                );
                reject(e);
                return;
              }
            }
          }

          reject(
            Error(
              'Invalid response Content-Type: ' +
                contentType +
                ', from URL: ' +
                url,
            ),
          );
        } else {
          reject(Error(req.statusText + ' (' + req.status + ')'));
        }
      };

      req.onerror = function() {
        Log.error('JsonService.getJson: network error');
        reject(Error('Network Error'));
      };

      if (token) {
        Log.debug(
          'JsonService.getJson: token passed, setting Authorization header',
        );
        req.setRequestHeader('Authorization', 'Bearer ' + token);
      }

      req.send();
    });
  }

  postForm(url, payload, basicAuth) {
    if (!url) {
      Log.error('JsonService.postForm: No url passed');
      throw new Error('url');
    }

    Log.debug('JsonService.postForm, url: ', url);

    return new Promise((resolve, reject) => {
      var req = new this._XMLHttpRequest();
      req.open('POST', url);

      var allowedContentTypes = this._contentTypes;

      req.onload = function() {
        Log.debug(
          'JsonService.postForm: HTTP response received, status',
          req.status,
        );

        if (req.status === 200) {
          var contentType = req.getResponseHeader('Content-Type');
          if (contentType) {
            var found = allowedContentTypes.find(item => {
              if (contentType.startsWith(item)) {
                return true;
              }
            });

            if (found) {
              try {
                resolve(JSON.parse(req.responseText));
                return;
              } catch (e) {
                Log.error(
                  'JsonService.postForm: Error parsing JSON response',
                  e.message,
                );
                reject(e);
                return;
              }
            }
          }

          reject(
            Error(
              'Invalid response Content-Type: ' +
                contentType +
                ', from URL: ' +
                url,
            ),
          );
          return;
        }

        if (req.status === 400) {
          var contentType = req.getResponseHeader('Content-Type');
          if (contentType) {
            var found = allowedContentTypes.find(item => {
              if (contentType.startsWith(item)) {
                return true;
              }
            });

            if (found) {
              try {
                var payload = JSON.parse(req.responseText);
                if (payload && payload.error) {
                  Log.error(
                    'JsonService.postForm: Error from server: ',
                    payload.error,
                  );
                  reject(new Error(payload.error));
                  return;
                }
              } catch (e) {
                Log.error(
                  'JsonService.postForm: Error parsing JSON response',
                  e.message,
                );
                reject(e);
                return;
              }
            }
          }
        }

        reject(Error(req.statusText + ' (' + req.status + ')'));
      };

      req.onerror = function() {
        Log.error('JsonService.postForm: network error');
        reject(Error('Network Error'));
      };

      let body = '';
      for (let key in payload) {
        let value = payload[key];

        if (value) {
          if (body.length > 0) {
            body += '&';
          }

          body += encodeURIComponent(key);
          body += '=';
          body += encodeURIComponent(value);
        }
      }

      req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

      if (basicAuth !== undefined) {
        req.setRequestHeader('Authorization', 'Basic ' + btoa(basicAuth));
      }

      req.send(body);
    });
  }
}

//=============================================================================
// MetadataService - OIDC metadata discovery and caching
//=============================================================================

const OidcMetadataUrlPath = '.well-known/openid-configuration';

export class MetadataService {
  constructor(settings, JsonServiceCtor = JsonService) {
    if (!settings) {
      Log.error('MetadataService: No settings passed to MetadataService');
      throw new Error('settings');
    }

    this._settings = settings;
    this._jsonService = new JsonServiceCtor(['application/jwk-set+json']);
  }

  get metadataUrl() {
    if (!this._metadataUrl) {
      if (this._settings.metadataUrl) {
        this._metadataUrl = this._settings.metadataUrl;
      } else {
        this._metadataUrl = this._settings.authority;

        if (
          this._metadataUrl &&
          this._metadataUrl.indexOf(OidcMetadataUrlPath) < 0
        ) {
          if (this._metadataUrl[this._metadataUrl.length - 1] !== '/') {
            this._metadataUrl += '/';
          }
          this._metadataUrl += OidcMetadataUrlPath;
        }
      }
    }

    return this._metadataUrl;
  }

  resetSigningKeys() {
    this._settings = this._settings || {};
    this._settings.signingKeys = undefined;
  }

  getMetadata() {
    if (this._settings.metadata) {
      Log.debug(
        'MetadataService.getMetadata: Returning metadata from settings',
      );
      return Promise.resolve(this._settings.metadata);
    }

    if (!this.metadataUrl) {
      Log.error(
        'MetadataService.getMetadata: No authority or metadataUrl configured on settings',
      );
      return Promise.reject(
        new Error('No authority or metadataUrl configured on settings'),
      );
    }

    Log.debug(
      'MetadataService.getMetadata: getting metadata from',
      this.metadataUrl,
    );

    return this._jsonService.getJson(this.metadataUrl).then(metadata => {
      Log.debug('MetadataService.getMetadata: json received');

      var seed = this._settings.metadataSeed || {};
      this._settings.metadata = Object.assign({}, seed, metadata);
      return this._settings.metadata;
    });
  }

  getIssuer() {
    return this._getMetadataProperty('issuer');
  }

  getAuthorizationEndpoint() {
    return this._getMetadataProperty('authorization_endpoint');
  }

  getUserInfoEndpoint() {
    return this._getMetadataProperty('userinfo_endpoint');
  }

  getTokenEndpoint(optional = true) {
    return this._getMetadataProperty('token_endpoint', optional);
  }

  getCheckSessionIframe() {
    return this._getMetadataProperty('check_session_iframe', true);
  }

  getEndSessionEndpoint() {
    return this._getMetadataProperty('end_session_endpoint', true);
  }

  getRevocationEndpoint() {
    return this._getMetadataProperty('revocation_endpoint', true);
  }

  getKeysEndpoint() {
    return this._getMetadataProperty('jwks_uri', true);
  }

  _getMetadataProperty(name, optional = false) {
    Log.debug('MetadataService.getMetadataProperty for: ' + name);

    return this.getMetadata().then(metadata => {
      Log.debug('MetadataService.getMetadataProperty: metadata recieved');

      if (metadata[name] === undefined) {
        if (optional === true) {
          Log.warn(
            'MetadataService.getMetadataProperty: Metadata does not contain optional property ' +
              name,
          );
          return undefined;
        } else {
          Log.error(
            'MetadataService.getMetadataProperty: Metadata does not contain property ' +
              name,
          );
          throw new Error('Metadata does not contain property ' + name);
        }
      }

      return metadata[name];
    });
  }

  getSigningKeys() {
    if (this._settings.signingKeys) {
      Log.debug(
        'MetadataService.getSigningKeys: Returning signingKeys from settings',
      );
      return Promise.resolve(this._settings.signingKeys);
    }

    return this._getMetadataProperty('jwks_uri').then(jwks_uri => {
      Log.debug('MetadataService.getSigningKeys: jwks_uri received', jwks_uri);

      return this._jsonService.getJson(jwks_uri).then(keySet => {
        Log.debug('MetadataService.getSigningKeys: key set received', keySet);

        if (!keySet.keys) {
          Log.error('MetadataService.getSigningKeys: Missing keys on keyset');
          throw new Error('Missing keys on keyset');
        }

        this._settings.signingKeys = keySet.keys;
        return this._settings.signingKeys;
      });
    });
  }
}
