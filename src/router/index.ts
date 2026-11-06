import { createRouter, createWebHistory } from 'vue-router'
import { setUnauthorizedHandler } from '@/api/http'
import { useWepAuth } from '@/composables/useWepAuth'
import { adminApi } from '@/api/admin.api'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/chofer' },
    { path: '/administracion/login', name: 'admin-login', component: () => import('@/views/admin/AdminLoginView.vue'), meta: { admin: true } },
    { path: '/administracion', name: 'admin-dashboard', component: () => import('@/views/admin/AdminDashboardView.vue'), meta: { admin: true, requiresAdmin: true } },
    { path: '/s', alias: '/seguimiento', name: 'public-tracking-lookup', component: () => import('@/views/public/TrackingLookupView.vue'), meta: { public: true } },
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
  if (to.meta.admin) {
    if (to.name === 'admin-login') return
    try { if (await adminApi.restore()) return }
    catch { /* El login permite reintentar si el servidor no responde. */ }
    return { name: 'admin-login' }
  }
  await auth.restore()
  if (to.name === 'driver-login' && auth.isAuthenticated.value) return '/chofer/viajes'
  if (to.meta.requiresAuth && !auth.isAuthenticated.value) return { name: 'driver-login' }
})

setUnauthorizedHandler(() => {
  auth.expireSession()
  if (!auth.isRestoring.value && router.currentRoute.value.meta.requiresAuth) void router.replace({ name: 'driver-login' })
})

export default router
