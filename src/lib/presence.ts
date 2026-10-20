import type { Board, LocationId, Member } from '../types'

export type PlaceGroup = 'outside' | 'lobby' | 'up'

export type Place = {
  id: LocationId
  title: string
  detail: string
  group: PlaceGroup
}

export const PLACES: Place[] = [
  { id: 'outside', title: 'Outside', detail: 'On the sidewalk', group: 'outside' },
  { id: 'lobby', title: 'In the building', detail: 'Not up yet', group: 'lobby' },
  { id: '21', title: '21st floor', detail: 'At the office', group: 'up' },
  { id: '22', title: '22nd floor', detail: 'At the office', group: 'up' },
  { id: '23', title: '23rd floor', detail: 'At the office', group: 'up' },
]

const AVATAR_COLORS = [
  '#075985',
  '#047857',
  '#b45309',
  '#be123c',
  '#6d28d9',
  '#0f766e',
  '#9f1239',
  '#1d4ed8',
  '#3f6212',
  '#c2410c',
]

export function movementSentence(name: string, location: LocationId): string {
  if (location === 'outside') return `${name} is outside the building.`
  if (location === 'lobby') return `${name} is in the building.`
  return `${name} is on the ${placeById(location).title}.`
}

export function placeById(id: LocationId): Place {
  const place = PLACES.find((item) => item.id === id)
  if (!place) return PLACES[0]
  return place
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function avatarColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function phoneError(phone: string): string | null {
  const trimmed = phone.trim()
  if (!trimmed) return null
  if (!/^[+\d][\d\s()-]*$/.test(trimmed)) return 'Use digits, spaces, and + ( ) - only.'
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 6 || digits.length > 15) return 'Enter a phone number with 6–15 digits.'
  return null
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

/** Last 8:00 PM that has already happened, in local time. */
export function boundaryKey(now: Date): string {
  const boundary = new Date(now)
  if (boundary.getHours() < 20) boundary.setDate(boundary.getDate() - 1)
  const year = boundary.getFullYear()
  const month = String(boundary.getMonth() + 1).padStart(2, '0')
  const day = String(boundary.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function nextReset(now: Date): Date {
  const next = new Date(now)
  next.setHours(20, 0, 0, 0)
  if (now.getTime() >= next.getTime()) next.setDate(next.getDate() + 1)
  return next
}

export function formatCountdown(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60000))
  if (minutes <= 1) return 'less than a minute'
  const hours = Math.floor(minutes / 60)
  const remain = minutes % 60
  if (hours <= 0) return `${remain}m`
  if (remain === 0) return `${hours}h`
  return `${hours}h ${remain}m`
}

export function formatWhen(iso: string, now: Date): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime())
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function formatClock(now: Date): string {
  return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDay(now: Date): string {
  return now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function emptyBoard(now: Date): Board {
  return { members: [], resetKey: boundaryKey(now), meId: null }
}

export function applyReset(board: Board, now: Date): { board: Board; resetHappened: boolean } {
  const key = boundaryKey(now)
  if (board.resetKey === key) return { board, resetHappened: false }
  const hadInside = board.members.some((member) => member.location !== 'outside')
  const stamp = now.toISOString()
  return {
    resetHappened: hadInside,
    board: {
      ...board,
      resetKey: key,
      members: board.members.map((member) =>
        member.location === 'outside' ? member : { ...member, location: 'outside', updatedAt: stamp },
      ),
    },
  }
}

export function membersIn(members: Member[], location: LocationId): Member[] {
  return members.filter((member) => member.location === location)
}

export const RESET_MESSAGE = '8:00 PM reset. Everyone is outside the building.'
