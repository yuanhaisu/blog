/**
 * Validation state shared by the artifact validators.
 *
 * Failures are attributed to the currently running group; `addFailure` allows
 * a validator to attribute a failure to a specific group (for example content
 * source parsing that happens before any group starts).
 */
const state = {
  failures: [],
  checks: [],
  activeGroup: null,
  groupFailuresAtStart: 0,
}

export function resetValidationState() {
  state.failures.length = 0
  state.checks.length = 0
  state.activeGroup = null
  state.groupFailuresAtStart = 0
}

export function addFailure(group, message) {
  state.failures.push({ group: group ?? state.activeGroup, message })
}

export function assert(condition, message) {
  if (condition) return true
  addFailure(state.activeGroup, message)
  return false
}

export async function group(label, run) {
  state.activeGroup = label
  state.groupFailuresAtStart = state.failures.length
  try {
    const detail = await run()
    state.checks.push({
      label,
      ok: state.failures.length === state.groupFailuresAtStart,
      detail: typeof detail === 'string' ? detail : '',
    })
  } catch (error) {
    state.failures.push({
      group: label,
      message: `执行失败：${error?.message ?? String(error)}`,
    })
    state.checks.push({ label, ok: false, detail: '' })
  }
}

export function getValidationState() {
  return state
}
