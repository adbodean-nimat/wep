<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { SelectItemProps } from 'reka-ui'
import { Check } from '@lucide/vue'
import { SelectItem, SelectItemIndicator, SelectItemText, useForwardProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { cn } from '@/lib/utils'

const props = defineProps<SelectItemProps & { class?: HTMLAttributes['class'] }>()
const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <SelectItem
    v-bind="forwarded"
    :class="cn('relative flex w-full cursor-default select-none items-center rounded-sm py-3 pl-8 pr-3 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', props.class)"
  >
    <span class="absolute left-2 flex size-4 items-center justify-center"><SelectItemIndicator><Check class="size-4" aria-hidden="true" /></SelectItemIndicator></span>
    <SelectItemText><slot /></SelectItemText>
  </SelectItem>
</template>
