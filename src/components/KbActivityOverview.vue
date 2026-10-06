<!--
  全站视图：热力图下方的「知识库排行 + 近期动态」

  - 排行：按所选年份的 commit 数 / 完成数（当年净增）排序，迷你横条展示；点击行打开该知识库
  - 近期动态：本月（当前日历月）各库提交 / 完成汇总：首行标题 + 汇总，次行 chip，点击打开该知识库
  数据来自 rootData.stats.byKnowledgeBase（tnotes.stats.json v2）。
-->
<template>
  <section v-if="kbKeys.length" class="kb-overview" aria-label="知识库排行与近期动态">
    <!-- 排行 -->
    <div class="kb-rank">
      <div class="kb-rank-toolbar">
        <div class="kb-rank-title">知识库排行</div>
        <div class="kb-seg" role="tablist" aria-label="排行指标">
          <button
            v-for="m in METRICS"
            :key="m.value"
            type="button"
            role="tab"
            class="kb-seg-btn"
            :class="{ active: metric === m.value }"
            :aria-selected="metric === m.value"
            @click="metric = m.value"
          >{{ m.label }}</button>
        </div>
        <select v-model="year" class="kb-year-select" aria-label="排行年份">
          <option v-for="y in yearsDesc" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <ol
        v-if="ranked.length"
        class="kb-rank-list"
        :class="`is-${metric}`"
        :style="{ '--kb-rows': Math.ceil(rankShown.length / 2) }"
      >
        <li v-for="(r, i) in rankShown" :key="r.key">
          <button
            type="button"
            class="kb-row"
            :title="`${r.title}：${year} 年 ${r.commits} 次提交 · 完成 ${signed(r.delta)}`"
            @click="$emit('select', r.key)"
          >
            <span class="kb-rank-no" :class="{ top: i < 3 }">{{ i + 1 }}</span>
            <img v-if="r.icon" :src="r.icon" alt="" class="kb-icon" />
            <span v-else class="kb-icon kb-icon-fallback">📁</span>
            <span class="kb-row-name">{{ r.title }}</span>
            <span class="kb-bar-track">
              <span class="kb-bar" :style="{ width: barWidth(r) }" />
            </span>
            <span class="kb-row-value">{{ metric === 'commits' ? r.commits : signed(r.delta) }}</span>
          </button>
        </li>
      </ol>
      <div v-else class="kb-rank-empty">{{ year }} 年暂无{{ metric === 'commits' ? '提交' : '完成' }}记录</div>

      <button
        v-if="ranked.length > RANK_LIMIT"
        type="button"
        class="kb-rank-more"
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起' : `展开全部（${ranked.length}）` }}
      </button>
    </div>
    <!-- 近期动态 -->
    <div class="kb-recent">
      <!-- 第一行：标题 + 汇总，独占整行 -->
      <div class="kb-recent-head">
        <span class="kb-recent-label">本月</span>
        <span v-if="recent.list.length" class="kb-recent-sum">
          <strong>{{ recent.commits }}</strong> 次提交<template v-if="recent.delta">
            · 完成 <span :class="deltaClass(recent.delta)">{{ signed(recent.delta) }}</span></template>
          · {{ recent.list.length }} 个库
        </span>
        <span v-else class="kb-recent-empty">暂无提交</span>
      </div>
      <!-- 第二行：chip + 展开全部 -->
      <div v-if="recent.list.length" class="kb-recent-chips">
        <button
          v-for="r in recentShown"
          :key="r.key"
          type="button"
          class="kb-chip"
          :title="`${r.title}：${r.commits} 次提交${r.delta ? ` · 完成 ${signed(r.delta)}` : ''} · 最近 ${r.last}`"
          @click="$emit('select', r.key)"
        >
          <img v-if="r.icon" :src="r.icon" alt="" class="kb-icon" />
          <span class="kb-chip-name">{{ r.title }}</span>
          <span class="kb-chip-num">{{ r.commits }}</span>
          <span v-if="r.delta" class="kb-chip-delta" :class="deltaClass(r.delta)">{{ signed(r.delta) }}</span>
        </button>
        <button
          v-if="recent.list.length > RECENT_CHIPS"
          type="button"
          class="kb-rank-more kb-recent-more"
          @click="recentExpanded = !recentExpanded"
        >
          {{ recentExpanded ? '收起' : `展开全部（${recent.list.length}）` }}
        </button>
      </div>
    </div>

  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ByYear } from './ContributionHeatmap.vue'
import type { RootItem } from './composables/useNavigator'

const props = defineProps<{
  byKnowledgeBase: Record<string, { byYear: ByYear }>
  rootItems: Record<string, RootItem>
}>()

defineEmits<{ select: [key: string] }>()

type Metric = 'commits' | 'completed'
const METRICS: Array<{ value: Metric; label: string }> = [
  { value: 'commits', label: '提交' },
  { value: 'completed', label: '完成' },
]
const RANK_LIMIT = 8
const RECENT_CHIPS = 6

const metric = ref<Metric>('commits')
const expanded = ref(false)

/** 只统计在根站可见的库 */
const kbKeys = computed(() =>
  Object.keys(props.byKnowledgeBase || {}).filter(
    (k) => props.rootItems?.[k] && props.rootItems[k].is_visible_in_root_folder !== false,
  ),
)

const years = computed(() => {
  const set = new Set<string>()
  for (const k of kbKeys.value) for (const y of Object.keys(props.byKnowledgeBase[k].byYear || {})) set.add(y)
  return [...set].sort()
})
const yearsDesc = computed(() => [...years.value].reverse())
const year = ref('')
watch(
  years,
  (list) => {
    if (!list.includes(year.value)) year.value = list[list.length - 1] ?? ''
  },
  { immediate: true },
)

function meta(key: string) {
  const item = props.rootItems?.[key]
  return { title: item?.title || key.replace(/^TNotes\./, ''), icon: item?.icon?.src }
}

const ranked = computed(() => {
  const rows = kbKeys.value.map((key) => {
    const months = props.byKnowledgeBase[key].byYear?.[year.value] || {}
    let commits = 0
    let delta = 0
    for (const m of Object.values(months)) {
      for (const d of Object.values(m)) {
        commits += Number(d?.commits) || 0
        delta += Number(d?.delta) || 0
      }
    }
    return { key, ...meta(key), commits, delta }
  })
  const val = (r: { commits: number; delta: number }) => (metric.value === 'commits' ? r.commits : r.delta)
  return rows
    .filter((r) => val(r) !== 0)
    .sort((a, b) => val(b) - val(a) || b.commits - a.commits || a.title.localeCompare(b.title))
})

const rankShown = computed(() => (expanded.value ? ranked.value : ranked.value.slice(0, RANK_LIMIT)))

const maxValue = computed(() =>
  Math.max(1, ...ranked.value.map((r) => Math.abs(metric.value === 'commits' ? r.commits : r.delta))),
)

function barWidth(r: { commits: number; delta: number }): string {
  const v = Math.abs(metric.value === 'commits' ? r.commits : r.delta)
  return `${Math.max(2, (v / maxValue.value) * 100)}%`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

const recent = computed(() => {
  const today = new Date()
  const y = String(today.getFullYear())
  const m = pad2(today.getMonth() + 1)
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const days: Array<[string, string, string]> = []
  // 从月末往前，便于 chip title「最近」取到本月内最近有活动的一天
  for (let d = daysInMonth; d >= 1; d--) {
    days.push([y, m, pad2(d)])
  }
  let commits = 0
  let delta = 0
  const list: Array<{ key: string; title: string; icon?: string; commits: number; delta: number; last: string }> = []
  for (const key of kbKeys.value) {
    const by = props.byKnowledgeBase[key].byYear || {}
    let c = 0
    let d = 0
    let last = ''
    for (const [y, m, dd] of days) {
      const s = by[y]?.[m]?.[dd]
      if (!s) continue
      const sc = Number(s.commits) || 0
      c += sc
      d += Number(s.delta) || 0
      if ((sc || s.delta) && !last) last = `${m}-${dd}`
    }
    if (c || d) {
      list.push({ key, ...meta(key), commits: c, delta: d, last })
      commits += c
      delta += d
    }
  }
  list.sort((a, b) => b.commits - a.commits || b.delta - a.delta || a.title.localeCompare(b.title))
  return { commits, delta, list }
})

const recentExpanded = ref(false)
const recentShown = computed(() =>
  recentExpanded.value ? recent.value.list : recent.value.list.slice(0, RECENT_CHIPS),
)

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}
function deltaClass(n: number): string {
  return n > 0 ? 'kb-pos' : n < 0 ? 'kb-neg' : ''
}
</script>

<style scoped>
.kb-overview {
  /* 与热力图同一套变量 / 色阶（兼容根库 --vp-*） */
  --kb-text: var(--vp-c-text-1, #1f2328);
  --kb-text-2: var(--vp-c-text-2, #59636e);
  --kb-text-3: var(--vp-c-text-3, #8c959f);
  --kb-divider: var(--vp-c-divider, #d1d9e0);
  --kb-bg: var(--vp-c-bg, #fff);
  --kb-bg-soft: var(--vp-c-bg-soft, #f6f8fa);
  --kb-brand: var(--vp-c-brand, #3451b2);
  --kb-track: #ebedf0;
  --kb-green: #30a14e;
  --kb-green-bar: linear-gradient(90deg, #9be9a8, #30a14e);
  --kb-blue-bar: linear-gradient(90deg, color-mix(in srgb, var(--kb-brand) 35%, transparent), var(--kb-brand));
  --kb-neg-c: #e5566f;

  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 12px;
  color: var(--kb-text-2);
}
.dark .kb-overview,
:root[data-theme='dark'] .kb-overview {
  --kb-track: #2d333b;
  --kb-green: #39d353;
  --kb-green-bar: linear-gradient(90deg, #0e4429, #26a641);
  --kb-neg-c: #f0738b;
}

.kb-icon {
  width: 14px;
  height: 14px;
  flex: none;
  object-fit: contain;
}
.kb-icon-fallback {
  font-size: 11px;
  line-height: 14px;
  text-align: center;
}
.kb-pos { color: var(--kb-green); }
.kb-neg { color: var(--kb-neg-c); }

/* ---- 近期动态：第一行标题 + 汇总，第二行 chip（溢出时换行） ---- */
.kb-recent {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--tn-glass-border, var(--kb-divider));
  border-radius: 12px;
  background: color-mix(in srgb, var(--kb-bg-soft) 70%, transparent);
}
.kb-recent-label {
  font-weight: 600;
  color: var(--kb-text);
}
.kb-recent-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  width: 100%;
}
.kb-recent-sum strong {
  color: var(--kb-text);
  font-weight: 600;
}
/* chip 行：从卡片左边缘开始，溢出时换行；「展开全部」紧随最后一个 chip */
.kb-recent-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.kb-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 6px;
  border: 1px solid color-mix(in srgb, var(--kb-divider) 80%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--kb-bg) 60%, transparent);
  color: var(--kb-text-2);
  font: inherit;
  font-size: 11px;
  line-height: 16px;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}
.kb-chip:hover,
.kb-chip:focus-visible {
  border-color: color-mix(in srgb, var(--kb-brand) 55%, transparent);
  background: color-mix(in srgb, var(--kb-brand) 12%, transparent);
  outline: none;
}
.kb-chip-name { color: var(--kb-text); }
.kb-chip-num {
  font-variant-numeric: tabular-nums;
  color: var(--kb-text-2);
}
.kb-chip-delta { font-variant-numeric: tabular-nums; }
.kb-recent-more {
  align-self: center;
  padding: 2px 6px;
}
.kb-recent-empty {
  color: var(--kb-text-3);
  font-size: 11px;
  align-self: center;
}

/* ---- 排行 ---- */
.kb-rank {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px 8px;
  border: 1px solid var(--tn-glass-border, var(--kb-divider));
  border-radius: 12px;
  background: color-mix(in srgb, var(--kb-bg-soft) 70%, transparent);
}
.kb-rank-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.kb-rank-title {
  font-weight: 600;
  color: var(--kb-text);
  margin-right: auto;
}
.kb-seg {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--kb-divider);
  border-radius: 7px;
  background: var(--kb-bg);
}
.kb-seg-btn {
  border: 0;
  background: transparent;
  color: var(--kb-text-2);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  padding: 0 8px;
  border-radius: 5px;
  cursor: pointer;
}
.kb-seg-btn.active {
  background: color-mix(in srgb, var(--kb-brand) 18%, transparent);
  color: var(--kb-text);
}
.kb-year-select {
  border: 1px solid var(--kb-divider);
  color: var(--kb-text-2);
  border-radius: 6px;
  /* 自绘箭头：原生箭头贴边，改为 appearance:none + 右侧留白 */
  appearance: none;
  -webkit-appearance: none;
  background-color: var(--kb-bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%238c959f' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 10px 6px;
  padding: 2px 24px 2px 8px;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}

.kb-rank-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  /* 按列排：左列 1..n/2，右列其余 */
  grid-template-rows: repeat(var(--kb-rows, 4), auto);
  grid-auto-flow: column;
  column-gap: 20px;
}
.kb-row {
  display: grid;
  grid-template-columns: 16px 14px minmax(64px, 7.5em) minmax(0, 1fr) 3.2em;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.kb-row:hover,
.kb-row:focus-visible {
  background: color-mix(in srgb, var(--kb-brand) 12%, transparent);
  outline: none;
}
.kb-rank-no {
  font-size: 11px;
  text-align: right;
  color: var(--kb-text-3);
  font-variant-numeric: tabular-nums;
}
.kb-rank-no.top {
  color: var(--kb-text);
  font-weight: 600;
}
.kb-row-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--kb-text);
}
.kb-bar-track {
  height: 6px;
  border-radius: 3px;
  background: var(--kb-track);
  overflow: hidden;
}
.kb-bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--kb-green-bar);
  transition: width 0.25s ease;
}
.is-completed .kb-bar { background: var(--kb-blue-bar); }
.kb-row-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--kb-text-2);
}
.kb-rank-empty {
  padding: 10px 0;
  text-align: center;
  color: var(--kb-text-3);
}
.kb-rank-more {
  align-self: center;
  border: 0;
  background: transparent;
  color: var(--kb-text-3);
  font: inherit;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
}
.kb-rank-more:hover { color: var(--kb-brand); }

@media (max-width: 640px) {
  .kb-rank-list {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
    grid-auto-flow: row;
  }
}
</style>
