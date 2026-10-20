const ME_KEY = 'wait-for-me:me'
const LEGACY_KEY = 'wait-for-me:v1'

export function loadMeId(): string | null {
  const saved = localStorage.getItem(ME_KEY)
  if (saved) return saved
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null') as { meId?: unknown }
    return typeof legacy?.meId === 'string' ? legacy.meId : null
  } catch {
    return null
  }
}

export function saveMeId(meId: string | null) {
  if (meId) localStorage.setItem(ME_KEY, meId)
  else localStorage.removeItem(ME_KEY)
}
