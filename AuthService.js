import {
  UserManager,
  WebStorageStateStore,
  Log,
} from 'shared/libs/oidc-client/index.js';
import {
  login,
  syncProfileFromCache,
  getProfile,
  processedUser,
} from 'reducers/user/profile/actions';
import {isObject, isEmpty} from 'lodash';
import store from '../reduxStore';
import localForage from 'localforage';
import * as Sentry from '@sentry/browser';

if (window._config_.REACT_APP_ENV === 'dev') {
  Log.logger = console;
  Log.level = 4;
}

const AUTHORITY = window._config_.REACT_APP_OAUTH_AUTHORITY || 'http://localhost:4444';
const CLIENT_ID = window._config_.REACT_APP_CLIENT_ID || 'client-app';
const REDIRECT_URI = window._config_.REACT_APP_OAUTH_REDIRECT_URI || 'http://localhost:5555';
const defaultSettings = {
  authority: AUTHORITY,
  client_id: CLIENT_ID,
  redirect_uri: `${REDIRECT_URI}/oauth2/login`,
  post_logout_redirect_uri: `${REDIRECT_URI}`,
  response_type: 'code',
  scope: 'offline openid',
  revokeAccessTokenOnSignout: true,
  // accessTokenExpiringNotificationTime: 270,
  loadUserInfo: true,
  userStore: new WebStorageStateStore({
    store: window.localStorage,
  }),
};

let instance = null;
class AuthService {
  static getInstance() {
    if (!instance) {
      instance = new AuthService();
    }
    return instance;
  }

  constructor(settings = defaultSettings) {
    // randomize renewing token time to avoid concurrent updates across active tabs
    if (!settings.accessTokenExpiringNotificationTime) {
      const max = 30;
      const min = 90;
      settings.accessTokenExpiringNotificationTime = Math.floor(
        Math.random() * (max - min) + min,
      );
    }
    this.userManager = new UserManager(settings);

    this.userManager.events.addAccessTokenExpiring(() =>
      this.userManager.getUser().then(user => {
        if (user) {
          const timeTillTokenExpires =
            user.expires_at - Math.floor(Date.now() / 1000);
          const configuredExpiringNotificationTime = this.userManager.settings
            ._accessTokenExpiringNotificationTime;
          if (timeTillTokenExpires <= configuredExpiringNotificationTime) {
            // sign in if the user in the storage is stale
            return this.userManager.signinSilent().catch(err => {
              // TODO: Raise sentry
              console.error('signinSilent error:', err);
              // this.processUser(user);
            });
          } else {
            // sync with recent user state in storage
            return this.processUser(user);
          }
        } else {
          // TODO: Raise sentry
          console.error('signinSilent getUser missing user');
        }
      }),
    );
    this.userManager.events.addAccessTokenExpired(this.logout.bind(this));
    this.userManager.events.addUserLoaded(this.processUser);

    // trigger loading user from the storage
    this.userManager.getUser().then(user => this.processUser(user));
  }

  login(state) {
    const lang = window.localStorage.getItem('userLanguage') || 'DE';
    return this.userManager.signinRedirect({
      state,
      ui_locales: [lang],
    });
  }

  processLoginResponse(url) {
    return this.userManager.signinRedirectCallback(url);
  }

  async processUser(user) {
    if (user && !user.expired) {
      const {access_token, profile} = user;
      const loginEmail = profile.sub;

      login({
        dispatch: store.dispatch,
        accessToken: access_token,
        loginEmail,
      });
      try {
        let profile = JSON.parse(
          window.localStorage.getItem('__user_profile'),
        );
        if (!isEmpty(profile) && isObject(profile)) {
          syncProfileFromCache({
            dispatch: store.dispatch,
            getState: store.getState,
            profile,
          });
        } else {
          await store.dispatch(getProfile());
        }
      } catch (e) {
        // TODO
      }
    }
    processedUser({
      dispatch: store.dispatch,
      flag: true,
    });
  }

  logout() {
    // Remove Sentry tags and scope
    Sentry.configureScope(function(scope) {
      scope.clear();
      scope.setUser(null);
    });
    // Remove tokens from local storage
    window.localStorage.removeItem('__user_token');
    window.localStorage.removeItem('__user_profile');
    localForage.clear();
    // Remove old state entries
    this.userManager.clearStaleState();
    // Sign out in peace
    return this.userManager.signoutRedirect({
      state: 'state-required-by-hydra-to-explicitly-specified',
    });
  }
}

export default AuthService.getInstance();
