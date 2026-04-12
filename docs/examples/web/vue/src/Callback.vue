<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { userManager } from './auth'

// Step 2: Exchange the auth code for tokens and store the user
const router = useRouter()

onMounted(async () => {
  try {
    await userManager.signinRedirectCallback()
    await router.push('/')
  } catch (err) {
    console.error('Callback error:', err)
  }
})
</script>

<template>
  <p>Completing sign-in...</p>
</template>
