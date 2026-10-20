import { applyReset, emptyBoard } from './presence'
import type { Board, LocationId, Member } from '../types'

const KEY = 'wait-for-me:v1'
const LOCATIONS = new Set<LocationId>(['outside', 'lobby', '21', '22', '23'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asPhoto(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('data:image/')) return null
  if (value.length > 500_000) return null
  return value
}

function asMember(value: unknown, now: Date): Member | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return null
  const name = value.name.trim().slice(0, 40)
  if (!name) return null
  const location = LOCATIONS.has(value.location as LocationId)
    ? (value.location as LocationId)
    : 'outside'
  return {
    id: value.id,
    name,
    phone: typeof value.phone === 'string' ? value.phone.slice(0, 24) : '',
    photo: asPhoto(value.photo),
    location,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : now.toISOString(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now.toISOString(),
  }
}

function sanitize(value: unknown, now: Date): Board {
  if (!isRecord(value) || !Array.isArray(value.members)) return emptyBoard(now)
  const members = value.members
    .map((item) => asMember(item, now))
    .filter((item): item is Member => item !== null)
    .slice(0, 60)
  const meId = members.some((member) => member.id === value.meId) ? (value.meId as string) : null
  return {
    members,
    meId,
    resetKey: typeof value.resetKey === 'string' ? value.resetKey : '',
  }
}

export function loadBoard(now = new Date()): { board: Board; resetHappened: boolean } {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    return applyReset(parsed ? sanitize(parsed, now) : emptyBoard(now), now)
  } catch {
    return { board: emptyBoard(now), resetHappened: false }
  }
}

export function saveBoard(board: Board): string | null {
  try {
    localStorage.setItem(KEY, JSON.stringify(board))
    return null
  } catch {
    return 'Could not save the board in this browser. Try a smaller photo.'
  }
}
