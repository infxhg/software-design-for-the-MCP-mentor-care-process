<template>
  <section class="page">
    <h1>Export Interview Records</h1>
    <p class="muted">Export interview records by optional filters. The backend returns a Word file
      for a single result set, or a Zip when multiple files are bundled together.</p>

    <form class="card" @submit.prevent="exportFile">
      <!--
        修改点：
        简化筛选表单为老师要求的字段；
          - Student / Mentor 各保留一个 keyword 框（模糊匹配 ID / name / email / username）
          - Academic Year 改成单文本框，正规格式 "YYYY-YYYY"（第二年 = 第一年 + 1），
            前端做格式校验；提交时拆成 academicYearFrom / academicYearTo 两个 query 参数
          - 保留 Department / Major
        其余后端支持但老师未要求的字段（studentId 精确、dateFrom/To、faculty）暂不暴露给用户。
      -->
      <label>
        Student Name / ID / Email
        <input
          v-model.trim="form.studentKeyword"
          placeholder="e.g. Alice / 202500001 / alice@example.com"
        />
      </label>

      <label>
        Mentor Name / Username
        <input
          v-model.trim="form.mentorKeyword"
          placeholder="e.g. Dr. Smith / smith01"
        />
      </label>

      <label>
        Academic Year
        <input
          v-model.trim="form.academicYear"
          placeholder="e.g. 2023-2024"
          :aria-invalid="academicYearError ? 'true' : 'false'"
        />
        <span v-if="academicYearError" class="field-error">{{ academicYearError }}</span>
        <span v-else class="hint">Format: YYYY-YYYY (e.g. 2023-2024). The second year must be the first year + 1.</span>
      </label>

      <label>
        Department Name
        <input
          v-model.trim="form.department"
          placeholder="e.g. DCS"
        />
      </label>

      <label>
        Major Name
        <input
          v-model.trim="form.major"
          placeholder="e.g. CST"
        />
      </label>

      <p v-if="error" class="error">{{ error }}</p>
      <button class="primary" :disabled="loading">
        {{ loading ? 'Exporting...' : 'Export Records' }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  exportConsultantRecords,
  saveExportedBlob,
  type ConsultantExportFilter,
} from '../../api/mentoring'

const loading = ref(false)
const error = ref('')

const form = reactive({
  studentKeyword: '',
  mentorKeyword: '',
  academicYear: '',
  department: '',
  major: '',
})

/**
 * 修改点：Academic Year 前端格式校验。
 * 规则：要么留空（视作不过滤），要么严格匹配 YYYY-YYYY 且第二年 = 第一年 + 1。
 * 校验失败时 academicYearError 有值，submit 时拒绝发起请求。
 */
const academicYearError = computed<string>(() => {
  const raw = form.academicYear.trim()
  if (!raw) return ''

  const match = raw.match(/^(\d{4})-(\d{4})$/)
  if (!match) {
    return 'Invalid academic year. Use the format YYYY-YYYY, e.g. 2023-2024.'
  }

  const start = Number(match[1])
  const end = Number(match[2])
  if (end !== start + 1) {
    return 'Invalid academic year. The second year must be exactly one more than the first (e.g. 2023-2024).'
  }

  return ''
})

async function exportFile() {
  error.value = ''

  if (academicYearError.value) {
    error.value = academicYearError.value
    return
  }

  loading.value = true
  try {
    // 把表单字段映射成后端文档定义的 query 参数
    const filter: ConsultantExportFilter = {}

    if (form.studentKeyword) filter.studentKeyword = form.studentKeyword
    if (form.mentorKeyword) filter.mentorKeyword = form.mentorKeyword
    if (form.department) filter.department = form.department
    if (form.major) filter.major = form.major

    // Academic Year 单文本框 → academicYearFrom / academicYearTo
    // 文档定义：academicYearFrom 是「学年起始年（含），2024 → 2024-2025 学年」，
    // 因此用户输入的 "2023-2024" 表示单个学年，from = to = 2023。
    const yearMatch = form.academicYear.trim().match(/^(\d{4})-\d{4}$/)
    if (yearMatch) {
      filter.academicYearFrom = yearMatch[1]
      filter.academicYearTo = yearMatch[1]
    }

    const meta = await exportConsultantRecords(filter)

    /**
     * 修改点 (FIX 文件名 + zip 乱码)：
     *   - 后端在 Content-Disposition 里给的文件名（含扩展名）优先使用
     *   - 后端没暴露 / 浏览器读不到时，回退到 fallback 基础名 + 由 Content-Type
     *     推出的正确扩展名（.docx / .zip / .doc），避免 zip 被存成 .docx 后乱码
     */
    saveExportedBlob(meta, `consultant-records-${Date.now()}`)
  } catch (e: any) {
    error.value = e?.message || 'Export failed.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page { max-width: 800px; margin: 0 auto; padding: 24px; }
.muted { color: #666; }
.card {
  display: grid;
  gap: 14px;
  margin-top: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}
label { display: grid; gap: 6px; font-weight: 600; }
input {
  padding: 9px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
}
input[aria-invalid='true'] { border-color: #b42318; }
button {
  width: fit-content;
  padding: 8px 14px;
  border: 1px solid #bbb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}
button:disabled { opacity: 0.6; cursor: not-allowed; }
.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
.error { color: #b42318; margin: 0; }
.field-error { color: #b42318; font-weight: 400; font-size: 13px; }
.hint { color: #6b7280; font-weight: 400; font-size: 12px; }
</style>
