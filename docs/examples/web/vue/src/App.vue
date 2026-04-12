<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { User } from 'oidc-auth-client'
import { userManager } from './auth'

const user = ref<User | null>(null)
const apiResult = ref<string>('')
const authenticated = computed(() => !!user.value && !user.value.expired)

// Named handlers so they can be removed on unmount
const onUserLoaded = (u: User) => { user.value = u }
const onUserUnloaded = () => { user.value = null }
const onSilentRenewError = (err: Error) => console.error('Silent renew error:', err)

onMounted(() => {
  // Step 3: Load current user on mount
  userManager.getUser().then(u => { user.value = u })

  // Step 4: React to silent renewal outcomes
  userManager.events.addUserLoaded(onUserLoaded)
  userManager.events.addUserUnloaded(onUserUnloaded)
  userManager.events.addSilentRenewError(onSilentRenewError)
})

onUnmounted(() => {
  userManager.events.removeUserLoaded(onUserLoaded)
  userManager.events.removeUserUnloaded(onUserUnloaded)
  userManager.events.removeSilentRenewError(onSilentRenewError)
})

// Step 1: Login
const login = () => userManager.signinRedirect()

// Step 5: Logout
const logout = () => userManager.signoutRedirect()

// Step 3: Use token to call a protected API endpoint
const callApi = async () => {
  if (!user.value?.access_token) return
  const res = await fetch('http://localhost:4000/api/me', {
    headers: { Authorization: `Bearer ${user.value.access_token}` },
  })
  const data: unknown = await res.json()
  apiResult.value = JSON.stringify(data, null, 2)
}
</script>

<template>
  <header>
    <h1>oidc-auth-client</h1>
    <button v-if="authenticated" type="button" @click="logout">Sign Out</button>
    <button v-else type="button" @click="login">Sign In</button>
  </header>

  <main>
    <p v-if="!authenticated">Sign in to view your profile and call a protected API.</p>

    <template v-if="authenticated && user">
      <section>
        <h2>Profile</h2>
        <p><strong>Name:</strong> {{ user.profile.name }}</p>
        <p><strong>Email:</strong> {{ user.profile.email }}</p>
        <p><strong>Subject:</strong> {{ user.profile.sub }}</p>
      </section>

      <section>
        <h2>API</h2>
        <button type="button" @click="callApi">Call GET /api/me</button>
        <pre v-if="apiResult">{{ apiResult }}</pre>
      </section>
    </template>
  </main>
</template>
