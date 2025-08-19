<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    @click="handleClick"
  >
    <span v-if="loading" class="loading-spinner mr-2">
      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>
    
    <span v-if="icon && !loading" class="icon mr-2">
      {{ icon }}
    </span>
    
    <span class="button-text">
      <slot>{{ text }}</slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
type ButtonSize = 'sm' | 'md' | 'lg'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  icon?: string
  text?: string
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  fullWidth: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed'
  ]

  // Size classes
  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm'],
    md: ['px-4', 'py-2', 'text-sm'],
    lg: ['px-6', 'py-3', 'text-base']
  }

  // Variant classes
  const variantClasses = {
    primary: [
      'bg-blue-600',
      'hover:bg-blue-700',
      'text-white',
      'focus:ring-blue-500'
    ],
    secondary: [
      'bg-gray-600',
      'hover:bg-gray-700',
      'text-white',
      'focus:ring-gray-500'
    ],
    success: [
      'bg-green-600',
      'hover:bg-green-700',
      'text-white',
      'focus:ring-green-500'
    ],
    warning: [
      'bg-yellow-600',
      'hover:bg-yellow-700',
      'text-white',
      'focus:ring-yellow-500'
    ],
    danger: [
      'bg-red-600',
      'hover:bg-red-700',
      'text-white',
      'focus:ring-red-500'
    ],
    info: [
      'bg-cyan-600',
      'hover:bg-cyan-700',
      'text-white',
      'focus:ring-cyan-500'
    ]
  }

  const widthClasses = props.fullWidth ? ['w-full'] : []

  return [
    ...baseClasses,
    ...sizeClasses[props.size],
    ...variantClasses[props.variant],
    ...widthClasses
  ].join(' ')
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.loading-spinner {
  display: inline-block;
}
</style>