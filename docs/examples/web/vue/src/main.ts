import { createApp, h } from 'vue'
import { createRouter, createWebHistory, RouterView } from 'vue-router'
import App from './App.vue'
import Callback from './Callback.vue'
import './assets/main.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',         component: App },
    { path: '/callback', component: Callback },
  ],
})

// Minimal root — routes replace the full page
createApp({ render: () => h(RouterView) })
  .use(router)
  .mount('#app')
