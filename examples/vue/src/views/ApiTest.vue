<template>
  <div class="api-test-page">
    <h2>API Test</h2>
    <p>Test authenticated API calls with your access token</p>

    <div class="card">
      <h3>Make an API Request</h3>
      <div class="form-group">
        <label for="api-url">API Endpoint URL:</label>
        <input
          type="text"
          id="api-url"
          v-model="apiUrl"
          placeholder="https://api.example.com/endpoint"
        >
      </div>
      <div class="form-group">
        <label for="http-method">HTTP Method:</label>
        <select id="http-method" v-model="httpMethod">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      <button
        @click="testApi"
        class="btn btn-primary"
        :disabled="!isAuthenticated() || isLoading"
      >
        {{ isLoading ? 'Sending...' : 'Send Request' }}
      </button>

      <div v-if="!isAuthenticated()" class="alert alert-warning mt-2">
        Please sign in to test API calls
      </div>
    </div>

    <div v-if="response" class="card">
      <h3>Response</h3>
      <div v-if="response.error" class="alert alert-error">
        <strong>Error:</strong> {{ response.error }}
      </div>
      <div v-else>
        <h4>Headers</h4>
        <pre>{{ JSON.stringify(response.headers, null, 2) }}</pre>

        <h4>Body</h4>
        <pre>{{ JSON.stringify(response.body, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../auth/useAuth'

const { isAuthenticated, getAccessToken } = useAuth()

const apiUrl = ref('https://jsonplaceholder.typicode.com/users/1')
const httpMethod = ref('GET')
const isLoading = ref(false)
const response = ref(null)

const testApi = async () => {
  if (!isAuthenticated()) {
    response.value = {
      error: 'Not authenticated. Please sign in first.'
    }
    return
  }

  isLoading.value = true
  response.value = null

  try {
    const token = getAccessToken()

    const fetchResponse = await fetch(apiUrl.value, {
      method: httpMethod.value,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    // Get headers
    const headers = {}
    fetchResponse.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Get body
    const contentType = fetchResponse.headers.get('content-type')
    let body
    if (contentType && contentType.includes('application/json')) {
      body = await fetchResponse.json()
    } else {
      body = await fetchResponse.text()
    }

    response.value = {
      status: fetchResponse.status,
      statusText: fetchResponse.statusText,
      headers,
      body,
    }

  } catch (error) {
    response.value = {
      error: error.message
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.api-test-page {
  max-width: 900px;
  margin: 0 auto;
}

h4 {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

pre {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 400px;
}
</style>
