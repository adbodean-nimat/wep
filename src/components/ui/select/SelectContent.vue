<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { SelectContentEmits, SelectContentProps } from 'reka-ui'
import { SelectContent, SelectPortal, SelectViewport, useForwardPropsEmits } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<SelectContentProps & { class?: HTMLAttributes['class'] }>(), { position: 'popper' })
const emits = defineEmits<SelectContentEmits>()
const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SelectPortal>
    <SelectContent
      v-bind="{ ...$attrs, ...forwarded }"
      :class="cn('relative z-50 max-h-72 min-w-[8rem] overflow-hidden rounded-md border bg-white text-foreground opacity-100 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[side=bottom]:translate-y-1', props.class)"
    >
      <SelectViewport class="w-full min-w-[var(--reka-select-trigger-width)] p-1"><slot /></SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>
