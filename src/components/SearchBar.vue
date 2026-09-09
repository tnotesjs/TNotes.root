<template>
  <div class="search-bar">
    <input
      v-model="modelValue"
      type="text"
      class="search-input"
      :placeholder="placeholder"
      @input="onInput"
    />
    <span v-if="modelValue" class="clear-btn" @click="clear">✕</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
  }>(),
  {
    placeholder: '搜索当前知识库...',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const modelValue = ref(props.modelValue)

watch(
  () => props.modelValue,
  (newVal) => {
    modelValue.value = newVal
  }
)

const onInput = () => {
  emit('update:modelValue', modelValue.value)
}

const clear = () => {
  modelValue.value = ''
  emit('update:modelValue', '')
}
</script>

<style scoped>
.search-bar {
  position: relative;
  padding: 10px 15px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.search-input {
  width: 100%;
  padding: 8px 30px 8px 12px;
  font-size: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand);
}

.search-input::placeholder {
  color: var(--vp-c-text-3);
}

.clear-btn {
  position: absolute;
  right: 25px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: var(--vp-c-text-3);
  font-size: 16px;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s;
}

.clear-btn:hover {
  color: var(--vp-c-text-1);
}
</style>
