export type LocationId = 'outside' | 'lobby' | '21' | '22' | '23'

export type Member = {
  id: string
  name: string
  phone: string
  photo: string | null
  location: LocationId
  createdAt: string
  updatedAt: string
}

export type Board = {
  members: Member[]
  resetKey: string
  meId: string | null
}

export type MemberDraft = {
  name: string
  phone: string
  photo: string | null
}
