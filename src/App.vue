<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import AppHeader from '@/components/app/AppHeader.vue'
import TrackingHeader from '@/components/public/TrackingHeader.vue'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { useWepAuth } from '@/composables/useWepAuth'
import { useAdminAppearance } from '@/composables/useAdminAppearance'
import 'vue-sonner/style.css'

const { needRefresh, updateServiceWorker } = useRegisterSW()
const route = useRoute()
const auth = useWepAuth()
const isLogin = computed(() => route.name === 'driver-login' || route.name === 'admin-login')
const isAdmin = computed(() => route.meta.admin === true)
const isPublic = computed(() => route.meta.public === true)
useAdminAppearance(isAdmin)
</script>

<template>
  <div v-if="auth.isRestoring.value && !isPublic && !isAdmin" class="flex min-h-dvh flex-col items-center justify-center px-5" aria-live="polite">
    <p class="text-4xl font-extrabold tracking-tight">WEP<span class="text-primary">.</span></p>
    <p class="mt-3 text-sm font-medium text-muted-foreground">Cargando...</p>
  </div>
  <template v-else>
    <a class="sr-only focus:not-sr-only focus:block focus:p-4" href="#main">Ir al contenido</a>
    <TrackingHeader v-if="isPublic" />
    <AppHeader v-else-if="!isLogin && !isAdmin" />
    <main id="main" :class="isAdmin && !isLogin ? 'min-h-dvh' : ['mx-auto px-5 pb-10', isLogin ? 'pt-0' : 'pt-7', isAdmin ? 'max-w-7xl' : isPublic ? 'max-w-lg' : 'max-w-xl']">
      <RouterView />
    </main>
  </template>
  <section v-if="needRefresh && !isPublic" class="mx-auto mt-6 max-w-xl rounded-2xl border bg-card p-5" aria-live="polite">
    <p class="font-semibold">Hay una versión nueva de WEP</p>
    <p class="mt-1 text-sm text-muted-foreground">Actualizá cuando termines la operación actual.</p>
    <Button class="mt-4 w-full" @click="updateServiceWorker()">Actualizar aplicación</Button>
  </section>
  <Toaster position="top-center" rich-colors :duration="4500" />
</template>
