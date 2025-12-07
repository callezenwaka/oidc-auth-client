// src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserManager } from 'oidc-client';
import { oidcConfig } from './config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userManager] = useState(() => new UserManager(oidcConfig));

  useEffect(() => {
    // Initialize auth state
    userManager.getUser().then(user => {
      setUser(user);
      setLoading(false);
    });

    // Event listeners
    const handleUserLoaded = (user) => {
      setUser(user);
      setError(null);
    };

    const handleUserUnloaded = () => setUser(null);
    const handleAccessTokenExpiring = () => console.log('Token expiring...');
    const handleAccessTokenExpired = () => {
      setError('Session expired. Please log in again.');
      setUser(null);
    };
    const handleSilentRenewError = (err) => {
      setError('Failed to refresh session: ' + err.message);
    };

    userManager.events.addUserLoaded(handleUserLoaded);
    userManager.events.addUserUnloaded(handleUserUnloaded);
    userManager.events.addAccessTokenExpiring(handleAccessTokenExpiring);
    userManager.events.addAccessTokenExpired(handleAccessTokenExpired);
    userManager.events.addSilentRenewError(handleSilentRenewError);

    return () => {
      userManager.events.removeUserLoaded(handleUserLoaded);
      userManager.events.removeUserUnloaded(handleUserUnloaded);
      userManager.events.removeAccessTokenExpiring(handleAccessTokenExpiring);
      userManager.events.removeAccessTokenExpired(handleAccessTokenExpired);
      userManager.events.removeSilentRenewError(handleSilentRenewError);
    };
  }, [userManager]);

  const login = useCallback(() => {
    return userManager.signinRedirect();
  }, [userManager]);

  const logout = useCallback(() => {
    return userManager.signoutRedirect();
  }, [userManager]);

  const handleCallback = useCallback(() => {
    return userManager.signinRedirectCallback();
  }, [userManager]);

  const isAuthenticated = useCallback(() => {
    return user && !user.expired;
  }, [user]);

  const getAccessToken = useCallback(() => {
    return user?.access_token;
  }, [user]);

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    handleCallback,
    isAuthenticated,
    getAccessToken,
    userManager,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
