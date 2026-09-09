<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="dialog-overlay" @click="close">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>设置</h3>
            <button class="close-btn" @click="close">✕</button>
          </div>

          <div class="dialog-body">
            <!-- 本地 IDE 打开 -->
            <div class="setting-item">
              <label>本地 IDE 打开</label>
              <p class="setting-hint">
                配置本地知识库目录，并选择 VS Code 或 Cursor，即可从页面快速打开知识库或笔记。
              </p>

              <div class="field-stack">
                <div class="field">
                  <span class="control-label">IDE</span>
                  <div class="segmented">
                    <label
                      v-for="option in localIdeOptions"
                      :key="option.value"
                      class="segment"
                      :class="{ 'is-active': localIde === option.value }"
                    >
                      <input
                        v-model="localIde"
                        type="radio"
                        name="local-ide"
                        :value="option.value"
                      />
                      <span>{{ option.label }}</span>
                    </label>
                  </div>
                </div>

                <div class="field">
                  <label class="control-label" for="tnotes-dir"
                    >知识库目录</label
                  >
                  <input
                    id="tnotes-dir"
                    v-model="localTnotesDir"
                    type="text"
                    class="setting-input"
                    placeholder="例如: /Users/username/tnotesjs"
                  />
                </div>
              </div>
            </div>

            <!-- 知识库排序设置 -->
            <div class="setting-item">
              <label for="sort-option">知识库排序方式</label>
              <select
                id="sort-option"
                v-model="localSortOption"
                class="setting-input"
              >
                <option value="name-asc">按名称升序</option>
                <option value="name-desc">按名称降序</option>
              </select>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn btn-secondary" @click="close">取消</button>
            <button class="btn btn-primary" @click="save">保存</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLocalIde } from './composables/useLocalIde'
import type { SortOption } from './composables/useNavigator'
import {
  DEFAULT_LOCAL_IDE,
  type LocalIdeId,
} from './utils/helpers'

const props = defineProps<{
  modelValue: boolean
  tnotesDir: string
  sortOption: SortOption
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:tnotesDir': [value: string]
  'update:sortOption': [value: SortOption]
}>()

const { ide, setLocalIde, refreshLocalIde } = useLocalIde()

const localIdeOptions: Array<{ label: string; value: LocalIdeId }> = [
  { label: 'VS Code', value: 'vscode' },
  { label: 'Cursor', value: 'cursor' },
]

const localTnotesDir = ref(props.tnotesDir)
const localSortOption = ref(props.sortOption)
const localIde = ref<LocalIdeId>(DEFAULT_LOCAL_IDE)

watch(
  () => props.tnotesDir,
  (newVal) => {
    localTnotesDir.value = newVal
  },
)

watch(
  () => props.sortOption,
  (newVal) => {
    localSortOption.value = newVal
  },
)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    localTnotesDir.value = props.tnotesDir
    localSortOption.value = props.sortOption
    refreshLocalIde()
    localIde.value = ide.value
  },
)

const close = () => {
  emit('update:modelValue', false)
}

const save = () => {
  emit('update:tnotesDir', localTnotesDir.value)
  emit('update:sortOption', localSortOption.value)
  setLocalIde(localIde.value)
  close()
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.dialog-content {
  background-color: var(--vp-c-bg);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.dialog-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item > label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.setting-hint {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-3);
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-label {
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.segment {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 34px;
  color: var(--vp-c-text-2);
  border-right: 1px solid var(--vp-c-divider);
  cursor: pointer;
  font-size: 13px;
  user-select: none;
}

.segment:last-child {
  border-right: none;
}

.segment input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.segment:hover,
.segment.is-active {
  color: var(--vp-c-brand);
  background: var(--vp-c-bg-soft);
}

.segment.is-active {
  font-weight: 600;
}

.setting-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  transition: all 0.2s;
  box-sizing: border-box;
}

.setting-input:focus {
  outline: none;
  border-color: var(--vp-c-brand);
  background-color: var(--vp-c-bg);
}

.setting-input::placeholder {
  color: var(--vp-c-text-3);
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--vp-c-divider);
}

.btn {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.btn-secondary:hover {
  background-color: var(--vp-c-bg-alt);
}

.btn-primary {
  background-color: var(--vp-c-brand);
  color: #fff;
}

.btn-primary:hover {
  background-color: var(--vp-c-brand-dark);
}

/* 动画 */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .dialog-content,
.dialog-leave-active .dialog-content {
  transition: transform 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-content,
.dialog-leave-to .dialog-content {
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .dialog-content {
    width: 95%;
    max-width: none;
  }

  .dialog-header {
    padding: 16px 20px;
  }

  .dialog-body {
    padding: 20px;
  }

  .dialog-footer {
    padding: 12px 20px;
  }
}
</style>
