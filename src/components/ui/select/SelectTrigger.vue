<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { SelectTriggerProps } from 'reka-ui'
import { ChevronDown } from '@lucide/vue'
import { SelectIcon, SelectTrigger, useForwardProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { cn } from '@/lib/utils'

const props = defineProps<SelectTriggerProps & { class?: HTMLAttributes['class'] }>()
const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <SelectTrigger
    v-bind="forwarded"
    :class="cn('flex min-h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3 py-2 text-left text-sm shadow-xs outline-none focus:ring-3 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground', props.class)"
  >
    <slot />
    <SelectIcon as-child><ChevronDown class="size-4 shrink-0 opacity-60" aria-hidden="true" /></SelectIcon>
  </SelectTrigger>
</template>
