<template>
  <div class="image-upload">
    <div class="upload-container">
      <!-- Preview Area -->
      <div class="preview-area mb-4">
        <div v-if="previewUrl" class="preview-image-container">
          <img 
            :src="previewUrl" 
            :alt="label" 
            class="preview-image w-20 h-20 object-cover rounded-lg border-2 border-gray-600"
          />
          <button 
            @click="removeImage"
            class="remove-btn absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white text-xs transition-colors"
            type="button"
          >
            ✕
          </button>
        </div>
        <div v-else class="placeholder w-20 h-20 bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-400">
          <span class="text-2xl">📷</span>
        </div>
      </div>

      <!-- Upload Input -->
      <div class="upload-input">
        <input
          ref="fileInput"
          type="file"
          :accept="accept"
          @change="handleFileSelect"
          class="hidden"
          :id="inputId"
        />
        <label 
          :for="inputId" 
          class="upload-label cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <span class="mr-2">📁</span>
          {{ previewUrl ? 'Cambiar' : 'Seleccionar' }} {{ label }}
        </label>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message mt-2 text-red-400 text-sm">
        {{ error }}
      </div>

      <!-- File Info -->
      <div v-if="fileInfo" class="file-info mt-2 text-gray-400 text-xs">
        {{ fileInfo }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue?: string
  label?: string
  accept?: string
  maxSize?: number // in MB
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'imagen',
  accept: 'image/*',
  maxSize: 5,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'file-selected': [file: File]
  'error': [error: string]
}>()

const fileInput = ref<HTMLInputElement>()
const previewUrl = ref<string>()
const error = ref<string>()
const fileInfo = ref<string>()
const inputId = ref(`image-upload-${Math.random().toString(36).substr(2, 9)}`)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue !== previewUrl.value) {
    previewUrl.value = newValue
  } else if (!newValue) {
    previewUrl.value = ''
  }
}, { immediate: true })

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  error.value = ''
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    error.value = 'Por favor selecciona un archivo de imagen válido'
    return
  }
  
  // Validate file size
  const maxSizeBytes = props.maxSize * 1024 * 1024
  if (file.size > maxSizeBytes) {
    error.value = `El archivo es demasiado grande. Máximo ${props.maxSize}MB`
    return
  }
  
  // Create preview URL
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    previewUrl.value = result
    emit('update:modelValue', result)
    emit('file-selected', file)
    
    // Set file info
    const sizeKB = Math.round(file.size / 1024)
    fileInfo.value = `${file.name} (${sizeKB}KB)`
  }
  
  reader.onerror = () => {
    error.value = 'Error al leer el archivo'
  }
  
  reader.readAsDataURL(file)
}

const removeImage = () => {
  previewUrl.value = ''
  fileInfo.value = ''
  error.value = ''
  emit('update:modelValue', undefined)
  
  // Clear file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<style scoped>
.preview-image-container {
  position: relative;
  display: inline-block;
}

.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
}

.upload-label:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.preview-image {
  transition: transform 0.2s ease;
}

.preview-image:hover {
  transform: scale(1.05);
}
</style>