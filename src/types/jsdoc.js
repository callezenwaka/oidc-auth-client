/**
 * @fileoverview JSDoc type definitions for OIDC Client Library
 * Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.
 */

//=============================================================================
// Models
//=============================================================================

/**
 * @typedef {Object} UserProfile
 * @property {string} sub - Subject identifier
 * @property {string} [sid] - Session identifier
 */

/**
 * @typedef {Object} UserData
 * @property {string} [id_token] - ID token
 * @property {string|null} [session_state] - Session state
 * @property {string} [access_token] - Access token
 * @property {string} [refresh_token] - Refresh token
 * @property {string} [token_type] - Token type
 * @property {string} [scope] - Scope
 * @property {UserProfile} [profile] - User profile
 * @property {number} [expires_at] - Expiration timestamp
 * @property {*} [state] - State data
 */

//=============================================================================
// Storage
//=============================================================================

/**
 * @typedef {Object} WebStorageConfig
 * @property {string} [prefix='oidc.'] - Storage key prefix
 * @property {Storage} [store] - Storage implementation (localStorage or sessionStorage)
 */

//=============================================================================
// Services
//=============================================================================

/**
 * @typedef {Object} OidcMetadata
 * @property {string} issuer - Issuer URL
 * @property {string} authorization_endpoint - Authorization endpoint
 * @property {string} [token_endpoint] - Token endpoint
 * @property {string} [userinfo_endpoint] - UserInfo endpoint
 * @property {string} [end_session_endpoint] - End session endpoint
 * @property {string} [check_session_iframe] - Check session iframe URL
 * @property {string} [revocation_endpoint] - Token revocation endpoint
 * @property {string} [jwks_uri] - JWKS URI
 */

//=============================================================================
// Protocol
//=============================================================================

/**
 * @typedef {Object} SigninRequestConfig
 * @property {string} url - Authorization endpoint URL
 * @property {string} client_id - Client identifier
 * @property {string} redirect_uri - Redirect URI
 * @property {string} response_type - Response type
 * @property {string} scope - Requested scope
 * @property {string} authority - Authority URL
 * @property {*} [data] - Custom data
 * @property {string} [prompt] - Prompt parameter
 * @property {string} [display] - Display parameter
 * @property {number} [max_age] - Max age parameter
 * @property {string} [ui_locales] - UI locales parameter
 * @property {string} [id_token_hint] - ID token hint
 * @property {string} [login_hint] - Login hint
 * @property {string} [acr_values] - ACR values
 * @property {string} [resource] - Resource parameter
 * @property {string} [response_mode] - Response mode
 * @property {string} [request] - Request JWT
 * @property {string} [request_uri] - Request URI
 * @property {Object} [extraQueryParams] - Extra query parameters
 * @property {string} [request_type] - Request type
 * @property {string} [client_secret] - Client secret
 * @property {Object} [extraTokenParams] - Extra token parameters
 * @property {boolean} [skipUserInfo] - Skip UserInfo request
 */

/**
 * @typedef {Object} SignoutRequestConfig
 * @property {string} url - End session endpoint URL
 * @property {string} [id_token_hint] - ID token hint
 * @property {string} [post_logout_redirect_uri] - Post logout redirect URI
 * @property {*} [data] - Custom data
 * @property {Object} [extraQueryParams] - Extra query parameters
 * @property {string} [request_type] - Request type
 */

/**
 * @typedef {Object} TokenExchangeArgs
 * @property {string} [client_id] - Client identifier
 * @property {string} [client_secret] - Client secret
 * @property {string} [code] - Authorization code
 * @property {string} [redirect_uri] - Redirect URI
 * @property {string} [code_verifier] - PKCE code verifier
 * @property {Object} [extraTokenParams] - Extra token parameters
 */

/**
 * @typedef {Object} RefreshTokenArgs
 * @property {string} [client_id] - Client identifier
 * @property {string} [client_secret] - Client secret
 * @property {string} [refresh_token] - Refresh token
 * @property {string} [scope] - Requested scope
 * @property {number} [timeoutInSeconds] - Request timeout
 */

//=============================================================================
// Navigation
//=============================================================================

/**
 * @typedef {Object} NavigateParams
 * @property {string} url - Navigation URL
 * @property {string} [id] - Request identifier
 * @property {boolean} [useReplaceToNavigate] - Use location.replace instead of location.assign
 * @property {number} [silentRequestTimeout] - Timeout for silent requests (ms)
 * @property {string} [popupWindowFeatures] - Popup window features
 * @property {string} [popupWindowTarget] - Popup window target
 */

//=============================================================================
// Auth - Settings
//=============================================================================

/**
 * @typedef {Object} OidcClientSettingsConfig
 * @property {string} [authority] - Authority URL
 * @property {string} [metadataUrl] - Metadata URL
 * @property {OidcMetadata} [metadata] - Metadata object
 * @property {Array} [signingKeys] - Signing keys
 * @property {Object} [metadataSeed] - Metadata seed
 * @property {string} [client_id] - Client identifier
 * @property {string} [client_secret] - Client secret
 * @property {string} [response_type='id_token'] - Response type
 * @property {string} [scope='openid'] - Requested scope
 * @property {string} [redirect_uri] - Redirect URI
 * @property {string} [post_logout_redirect_uri] - Post logout redirect URI
 * @property {string} [client_authentication='client_secret_post'] - Client authentication method
 * @property {string} [prompt] - Prompt parameter
 * @property {string} [display] - Display parameter
 * @property {number} [max_age] - Max age parameter
 * @property {string} [ui_locales] - UI locales parameter
 * @property {string} [acr_values] - ACR values
 * @property {string} [resource] - Resource parameter
 * @property {string} [response_mode] - Response mode
 * @property {boolean} [filterProtocolClaims=true] - Filter protocol claims from profile
 * @property {boolean} [loadUserInfo=true] - Load user info
 * @property {number} [staleStateAge=900] - Stale state age (seconds)
 * @property {number} [clockSkew=300] - Clock skew (seconds)
 * @property {Object} [clockService] - Clock service instance
 * @property {string} [userInfoJwtIssuer='OP'] - UserInfo JWT issuer
 * @property {boolean} [mergeClaims=false] - Merge claims from multiple sources
 * @property {Object} [stateStore] - State store instance
 * @property {Function} [ResponseValidatorCtor] - Response validator constructor
 * @property {Function} [MetadataServiceCtor] - Metadata service constructor
 * @property {Object} [extraQueryParams={}] - Extra query parameters
 * @property {Object} [extraTokenParams={}] - Extra token parameters
 */

/**
 * @typedef {Object} UserManagerSettingsConfig
 * @extends OidcClientSettingsConfig
 * @property {string} [popup_redirect_uri] - Popup redirect URI
 * @property {string} [popup_post_logout_redirect_uri] - Popup post logout redirect URI
 * @property {string} [popupWindowFeatures] - Popup window features
 * @property {string} [popupWindowTarget] - Popup window target
 * @property {string} [silent_redirect_uri] - Silent redirect URI
 * @property {number} [silentRequestTimeout] - Silent request timeout (ms)
 * @property {boolean} [automaticSilentRenew=false] - Automatic silent renew
 * @property {boolean} [validateSubOnSilentRenew=false] - Validate sub on silent renew
 * @property {boolean} [includeIdTokenInSilentRenew=true] - Include ID token in silent renew
 * @property {number} [accessTokenExpiringNotificationTime=60] - Access token expiring notification time (seconds)
 * @property {boolean} [monitorSession=true] - Monitor session
 * @property {boolean} [monitorAnonymousSession=false] - Monitor anonymous session
 * @property {number} [checkSessionInterval=2000] - Check session interval (ms)
 * @property {boolean} [stopCheckSessionOnError=true] - Stop check session on error
 * @property {string} [query_status_response_type] - Query status response type
 * @property {boolean} [revokeAccessTokenOnSignout=false] - Revoke access token on signout
 * @property {Object} [redirectNavigator] - Redirect navigator instance
 * @property {Object} [popupNavigator] - Popup navigator instance
 * @property {Object} [iframeNavigator] - IFrame navigator instance
 * @property {Object} [userStore] - User store instance
 */

//=============================================================================
// Auth - Events
//=============================================================================

/**
 * @callback EventCallback
 * @param {...*} args - Event arguments
 * @returns {void}
 */

/**
 * @typedef {Object} AccessTokenEventsConfig
 * @property {number} [accessTokenExpiringNotificationTime=60] - Notification time before expiration (seconds)
 * @property {Object} [accessTokenExpiringTimer] - Access token expiring timer instance
 * @property {Object} [accessTokenExpiredTimer] - Access token expired timer instance
 */

//=============================================================================
// Auth - Session
//=============================================================================

/**
 * @typedef {Object} StateConfig
 * @property {string} [id] - State identifier (generated if not provided)
 * @property {*} [data] - Custom state data
 * @property {number} [created] - Creation timestamp (seconds)
 * @property {string} [request_type] - Request type
 */

/**
 * @typedef {Object} SigninStateConfig
 * @extends StateConfig
 * @property {boolean|string} [nonce] - Nonce value (true to generate)
 * @property {string} [authority] - Authority URL
 * @property {string} [client_id] - Client identifier
 * @property {string} [redirect_uri] - Redirect URI
 * @property {boolean|string} [code_verifier] - PKCE code verifier (true to generate)
 * @property {string} [response_mode] - Response mode
 * @property {string} [client_secret] - Client secret
 * @property {string} [scope] - Requested scope
 * @property {Object} [extraTokenParams] - Extra token parameters
 * @property {boolean} [skipUserInfo] - Skip UserInfo request
 */

//=============================================================================
// Auth - Client
//=============================================================================

/**
 * @typedef {Object} SigninArgs
 * @property {string} [response_type] - Response type
 * @property {string} [scope] - Requested scope
 * @property {string} [redirect_uri] - Redirect URI
 * @property {*} [data] - Custom data
 * @property {*} [state] - State data
 * @property {string} [prompt] - Prompt parameter
 * @property {string} [display] - Display parameter
 * @property {number} [max_age] - Max age parameter
 * @property {string} [ui_locales] - UI locales parameter
 * @property {string} [id_token_hint] - ID token hint
 * @property {string} [login_hint] - Login hint
 * @property {string} [acr_values] - ACR values
 * @property {string} [resource] - Resource parameter
 * @property {string} [request] - Request JWT
 * @property {string} [request_uri] - Request URI
 * @property {string} [response_mode] - Response mode
 * @property {Object} [extraQueryParams] - Extra query parameters
 * @property {Object} [extraTokenParams] - Extra token parameters
 * @property {string} [request_type] - Request type
 * @property {boolean} [skipUserInfo] - Skip UserInfo request
 */

/**
 * @typedef {Object} SignoutArgs
 * @property {string} [id_token_hint] - ID token hint
 * @property {string} [post_logout_redirect_uri] - Post logout redirect URI
 * @property {*} [data] - Custom data
 * @property {*} [state] - State data
 * @property {Object} [extraQueryParams] - Extra query parameters
 * @property {string} [request_type] - Request type
 */

export {};
