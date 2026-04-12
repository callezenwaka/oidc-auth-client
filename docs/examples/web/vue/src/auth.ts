import { UserManager } from 'oidc-auth-client'

// Update these values with your Identity Provider settings
export const userManager = new UserManager({
  authority: 'https://your-idp.com',
  client_id: 'your-client-id',
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`,
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,  // Step 4: silent renewal runs automatically
})
