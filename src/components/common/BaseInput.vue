<template>
  <div class="base-input">
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-gray-300 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-400 ml-1">*</span>
    </label>
    
    <div class="relative">
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :min="min"
        :max="max"
        :step="step"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />
      
      <div v-if="icon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span class="text-gray-400">{{ icon }}</span>
      </div>
      
      <div v-if="loading" class="absolute inset-y-0 right-0 pr-3 flex items-center">
        <svg class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>
    
    <div v-if="error" class="mt-1 text-sm text-red-400">
      {{ error }}
    </div>
    
    <div v-else-if="hint" class="mt-1 text-sm text-gray-400">
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
type InputSize = 'sm' | 'md' | 'lg'

interface Props {
  modelValue: string | number
  type?: InputType
  size?: InputSize
  label?: string
  placeholder?: string
  hint?: string
  error?: string
  icon?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  loading?: boolean
  min?: number
  max?: number
  step?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  disabled: false,
  readonly: false,
  required: false,
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const inputId = ref(`input-${Math.random().toString(36).substr(2, 9)}`)

const inputClasses = computed(() => {
  const baseClasses = [
    'block',
    'w-full',
    'rounded-lg',
    'border',
    'bg-gray-700',
    'text-white',
    'placeholder-gray-400',
    'transition-colors',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-offset-gray-900'
  ]

  // Size classes
  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm'],
    md: ['px-3', 'py-2', 'text-sm'],
    lg: ['px-4', 'py-3', 'text-base']
  }

  // State classes
  const stateClasses = []
  
  if (props.error) {
    stateClasses.push(
      'border-red-500',
      'focus:ring-red-500',
      'focus:border-red-500'
    )
  } else {
    stateClasses.push(
      'border-gray-600',
      'focus:ring-blue-500',
      'focus:border-blue-500'
    )
  }

  if (props.disabled) {
    stateClasses.push('opacity-50', 'cursor-not-allowed')
  }

  if (props.readonly) {
    stateClasses.push('bg-gray-800')
  }

  // Icon padding
  const iconClasses = props.icon ? ['pl-10'] : []
  const loadingClasses = props.loading ? ['pr-10'] : []

  return [
    ...baseClasses,
    ...sizeClasses[props.size],
    ...stateClasses,
    ...iconClasses,
    ...loadingClasses
  ].join(' ')
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}
</script>