import { createRouter, createWebHistory } from 'vue-router'
import { setUnauthorizedHandler } from '@/api/http'
import { useWepAuth } from '@/composables/useWepAuth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/chofer' },
    { path: '/s/:publicId', name: 'public-tracking', component: () => import('@/views/public/TrackingView.vue'), meta: { public: true } },
    { path: '/chofer', redirect: '/chofer/viajes' },
    { path: '/chofer/login', name: 'driver-login', component: () => import('@/views/driver/LoginView.vue') },
    { path: '/chofer/viajes', component: () => import('@/views/driver/TripsView.vue'), meta: { requiresAuth: true } },
    { path: '/chofer/viajes/:id', component: () => import('@/views/driver/TripDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/chofer/entregas/:id', component: () => import('@/views/driver/DeliveryDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFoundView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

const auth = useWepAuth()

router.beforeEach(async (to) => {
  if (to.meta.public) return
  await auth.restore()
  if (to.name === 'driver-login' && auth.isAuthenticated.value) return '/chofer/viajes'
  if (to.meta.requiresAuth && !auth.isAuthenticated.value) return { name: 'driver-login' }
})

setUnauthorizedHandler(() => {
  auth.expireSession()
  if (!auth.isRestoring.value && router.currentRoute.value.meta.requiresAuth) void router.replace({ name: 'driver-login' })
})

export default router
