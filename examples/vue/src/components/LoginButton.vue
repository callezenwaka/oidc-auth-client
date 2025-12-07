<template>
  <div class="login-button">
    <button
      v-if="!isAuthenticated()"
      @click="handleLogin"
      :disabled="loading"
      class="btn btn-primary"
    >
      {{ loading ? 'Loading...' : 'Sign In' }}
    </button>
    <div v-else class="user-menu">
      <span class="user-name">{{ displayName }}</span>
      <button @click="logout" class="btn btn-secondary">
        Sign Out
      </button>
    </div>

    <div v-if="error" class="alert alert-error mt-2">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuth } from '../auth/useAuth'

const { user, loading, error, login, logout, isAuthenticated } = useAuth()

const displayName = computed(() => {
  if (!user.value) return ''
  return user.value.profile?.name || user.value.profile?.email || 'User'
})

const handleLogin = async () => {
  await login()
}
</script>

<style scoped>
.login-button {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-weight: 500;
  color: white;
}

.btn {
  white-space: nowrap;
}
</style>
