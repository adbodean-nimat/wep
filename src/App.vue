<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import AppHeader from '@/components/app/AppHeader.vue'
import TrackingHeader from '@/components/public/TrackingHeader.vue'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { useWepAuth } from '@/composables/useWepAuth'
import 'vue-sonner/style.css'

const { needRefresh, updateServiceWorker } = useRegisterSW()
const route = useRoute()
const auth = useWepAuth()
const isLogin = computed(() => route.name === 'driver-login')
const isPublic = computed(() => route.meta.public === true)
</script>

<template>
  <div v-if="auth.isRestoring.value && !isPublic" class="flex min-h-dvh flex-col items-center justify-center px-5" aria-live="polite">
    <p class="text-4xl font-extrabold tracking-tight">WEP<span class="text-primary">.</span></p>
    <p class="mt-3 text-sm font-medium text-muted-foreground">Cargando...</p>
  </div>
  <template v-else>
    <a class="sr-only focus:not-sr-only focus:block focus:p-4" href="#main">Ir al contenido</a>
    <TrackingHeader v-if="isPublic" />
    <AppHeader v-else-if="!isLogin" />
    <main id="main" class="mx-auto px-5 pb-10" :class="[isLogin ? 'pt-0' : 'pt-7', isPublic ? 'max-w-lg' : 'max-w-xl']">
      <RouterView />
    </main>
  </template>
  <section v-if="needRefresh && !isPublic" class="mx-auto mt-6 max-w-xl rounded-2xl border bg-white p-5" aria-live="polite">
    <p class="font-semibold">Hay una versión nueva de WEP</p>
    <p class="mt-1 text-sm text-muted-foreground">Actualizá cuando termines la operación actual.</p>
    <Button class="mt-4 w-full" @click="updateServiceWorker()">Actualizar aplicación</Button>
  </section>
  <Toaster position="top-center" rich-colors :duration="4500" />
</template>
