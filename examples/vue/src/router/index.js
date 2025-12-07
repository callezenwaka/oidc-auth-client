import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../auth/useAuth'
import Home from '../views/Home.vue'
import Profile from '../views/Profile.vue'
import ApiTest from '../views/ApiTest.vue'
import Callback from '../views/Callback.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true },
  },
  {
    path: '/api-test',
    name: 'ApiTest',
    component: ApiTest,
    meta: { requiresAuth: false },  // Can view but needs auth to use
  },
  {
    path: '/callback',
    name: 'Callback',
    component: Callback,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard for protected routes
router.beforeEach((to, from, next) => {
  const { isAuthenticated } = useAuth()

  if (to.meta.requiresAuth && !isAuthenticated()) {
    // Save intended destination
    sessionStorage.setItem('returnUrl', to.fullPath)
    next('/')
  } else {
    next()
  }
})

export default router
