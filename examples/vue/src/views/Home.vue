<template>
  <div class="home">
    <h1>Welcome to Vue OIDC Demo</h1>
    <p class="subtitle">A complete example of OIDC authentication with Vue 3</p>

    <div class="card">
      <h3>Getting Started</h3>
      <ol>
        <li>Configure your Identity Provider in <code>src/auth/config.js</code></li>
        <li>Click "Sign In" to authenticate</li>
        <li>You'll be redirected to your identity provider</li>
        <li>After authentication, you'll be redirected back</li>
        <li>View your profile and test authenticated API calls</li>
      </ol>
    </div>

    <div class="features">
      <div class="feature-card">
        <h4>🔐 Secure Authentication</h4>
        <p>OAuth 2.0 / OpenID Connect protocol with PKCE</p>
      </div>
      <div class="feature-card">
        <h4>🔄 Auto Token Refresh</h4>
        <p>Silent token renewal before expiration</p>
      </div>
      <div class="feature-card">
        <h4>📊 Session Monitoring</h4>
        <p>Track authentication state across tabs</p>
      </div>
    </div>

    <div v-if="!isAuthenticated()" class="cta">
      <button @click="login" class="btn btn-primary btn-large">
        Get Started - Sign In
      </button>
    </div>
    <div v-else class="cta">
      <p>Welcome back, {{ user?.profile?.name }}!</p>
      <router-link to="/profile" class="btn btn-primary btn-large">
        View Profile
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from '../auth/useAuth'

const { user, login, isAuthenticated } = useAuth()
</script>

<style scoped>
.home {
  max-width: 900px;
  margin: 0 auto;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.subtitle {
  font-size: 1.2rem;
  color: #7f8c8d;
  margin-bottom: 2rem;
}

.card ol {
  margin-left: 1.5rem;
}

.card li {
  margin-bottom: 0.5rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.feature-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
}

.feature-card h4 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.feature-card p {
  color: #7f8c8d;
}

.cta {
  text-align: center;
  margin: 3rem 0;
}

.cta p {
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}
</style>
