// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

//=============================================================================
// UserProfile — OIDC ID token claims (provider-extensible)
//=============================================================================

export interface UserProfile {
  sub: string;
  sid?: string;
  // OIDC providers may include arbitrary additional claims per OIDC Core §5.1.
  [key: string]: any;
}
