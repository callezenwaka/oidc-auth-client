<template>
  <div class="callback-page">
    <div v-if="processing" class="loading">
      <div class="spinner"></div>
      <h2>Processing login...</h2>
      <p>Please wait while we complete your authentication.</p>
    </div>

    <div v-if="callbackError" class="card">
      <div class="alert alert-error">
        <h2>Login Error</h2>
        <p>{{ callbackError }}</p>
      </div>
      <button @click="goHome" class="btn btn-primary">Go to Home</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../auth/useAuth'

const router = useRouter()
const { handleCallback } = useAuth()

const processing = ref(true)
const callbackError = ref(null)

onMounted(async () => {
  try {
    await handleCallback()
    // Redirect to intended page or home
    router.push('/')
  } catch (err) {
    callbackError.value = err.message || 'Failed to complete login'
    processing.value = false
  }
})

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.callback-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.card {
  max-width: 500px;
  text-align: center;
}
</style>
