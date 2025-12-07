<template>
  <div class="user-profile">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading user profile...</p>
    </div>

    <div v-else-if="isAuthenticated()">
      <h2>User Profile</h2>

      <div class="card">
        <h3>Basic Information</h3>
        <dl>
          <dt>Name:</dt>
          <dd>{{ user?.profile?.name || 'N/A' }}</dd>

          <dt>Email:</dt>
          <dd>{{ user?.profile?.email || 'N/A' }}</dd>

          <dt>Username:</dt>
          <dd>{{ user?.profile?.preferred_username || 'N/A' }}</dd>

          <dt>Subject:</dt>
          <dd>{{ user?.profile?.sub || 'N/A' }}</dd>
        </dl>
      </div>

      <div class="card">
        <h3>Token Information</h3>
        <dl>
          <dt>Token Type:</dt>
          <dd>{{ user?.token_type }}</dd>

          <dt>Expires At:</dt>
          <dd>{{ expiresAt }}</dd>

          <dt>Scopes:</dt>
          <dd>{{ user?.scope }}</dd>

          <dt>Access Token (first 50 chars):</dt>
          <dd><code>{{ tokenPreview }}</code></dd>
        </dl>

        <button @click="renewToken" class="btn btn-primary mt-2">
          Refresh Token
        </button>
      </div>

      <div class="card">
        <h3>All Claims</h3>
        <pre>{{ JSON.stringify(user?.profile, null, 2) }}</pre>
      </div>
    </div>

    <div v-else class="card text-center">
      <p>Please sign in to view your profile</p>
      <button @click="login" class="btn btn-primary mt-2">
        Sign In
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuth } from '../auth/useAuth'

const { user, loading, login, isAuthenticated, renewToken } = useAuth()

const expiresAt = computed(() => {
  if (!user.value?.expires_at) return 'N/A'
  return new Date(user.value.expires_at * 1000).toLocaleString()
})

const tokenPreview = computed(() => {
  if (!user.value?.access_token) return 'N/A'
  return user.value.access_token.substring(0, 50) + '...'
})
</script>

<style scoped>
.user-profile {
  max-width: 800px;
  margin: 0 auto;
}

dl {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 0.75rem 1rem;
}

dt {
  font-weight: 600;
  color: #2c3e50;
}

dd {
  color: #555;
  margin: 0;
}

code {
  background-color: #f8f9fa;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  word-break: break-all;
}

pre {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.9em;
  line-height: 1.4;
}
</style>
