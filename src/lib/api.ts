import type { LocationId, Member, MemberDraft } from '../types'

export const POLL_MS = 4000

export type BoardSnapshot = {
  members: Member[]
  resetOn: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const text = await response.text()
  let body: { error?: string } = {}
  if (text) {
    try {
      body = JSON.parse(text) as { error?: string }
    } catch {
      throw new Error(
        response.status === 404
          ? 'The board API is not running.'
          : 'The board could not be reached.',
      )
    }
  }
  if (!response.ok) throw new Error(body.error || 'The board could not be reached.')
  return body as T
}

export function fetchBoard(): Promise<BoardSnapshot> {
  return request<BoardSnapshot>('/api/board')
}

export function createMember(draft: MemberDraft): Promise<Member> {
  return request<Member>('/api/members', { method: 'POST', body: JSON.stringify(draft) })
}

export function updateMember(
  id: string,
  patch: Partial<MemberDraft> & { location?: LocationId },
): Promise<Member> {
  return request<Member>(`/api/members/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export function deleteMember(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/api/members/${id}`, { method: 'DELETE' })
}
