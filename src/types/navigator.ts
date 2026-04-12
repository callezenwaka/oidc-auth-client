// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

/**
 * Shared navigator contracts used by both Navigator.ts and Client.ts.
 * Lives in src/types/ so neither module has to import the other,
 * keeping the navigation and auth layers cleanly decoupled.
 */

/** Parameters passed to navigator prepare() and navigate() calls. */
export interface NavigateParams {
  url?: string;
  useReplaceToNavigate?: boolean;
  id?: string;
  silentRequestTimeout?: number;
  startUrl?: string;
  popupWindowFeatures?: string;
  popupWindowTarget?: string;
}

/** The URL resolved by a completed navigation (popup response, iframe response, or redirect target). */
export interface NavigatorResponse {
  url: string;
}

/** Handle to an open navigation context returned by navigator.prepare(). */
export interface NavigatorHandle {
  navigate(params: NavigateParams & { url: string }): Promise<NavigatorResponse>;
  close?(): void;
}

/** Common structural interface for all navigator types used by UserManager. */
export interface INavigator {
  prepare(params: NavigateParams): Promise<NavigatorHandle>;
  callback?(url?: string, keepOpen?: boolean, delimiter?: string): Promise<void>;
  readonly url?: string;
}
