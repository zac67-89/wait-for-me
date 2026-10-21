import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { phoneError } from '../../src/lib/presence.js'
import { yangonResetOn } from '../../src/lib/time.js'
import type { LocationId, Member, MemberDraft } from '../../src/types'
import { HttpError } from './http.js'
import { removeStoredPhoto, resolvePhoto } from './photos.js'

type Sql = NeonQueryFunction<false, false>

type MemberRow = {
  id: string
  name: string
  phone: string
  photo_url: string | null
  location: string
  created_at: string | Date
  updated_at: string | Date
}

const PLACES = new Set<LocationId>(['outside', 'lobby', '21', '22', '23'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let database: Sql | null = null
let ready: Promise<void> | null = null

function db(): Sql {
  const url = process.env.DATABASE_URL
  if (!url) throw new HttpError('DATABASE_URL is not set on the server.', 500)
  database ??= neon(url)
  return database
}

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function asLocation(value: string): LocationId {
  return PLACES.has(value as LocationId) ? (value as LocationId) : 'outside'
}

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    photo: row.photo_url,
    location: asLocation(row.location),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

async function ensureSchema(sql: Sql) {
  await sql.query(`do $$ begin
    create type place as enum ('outside', 'lobby', '21', '22', '23');
  exception
    when duplicate_object then null;
  end $$`)
  await sql.query(`create table if not exists members (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(btrim(name)) between 1 and 40),
    phone text not null default '',
    photo_url text,
    location place not null default 'outside',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`)
  await sql.query(`create table if not exists board (
    id boolean primary key default true check (id),
    reset_on date not null,
    updated_at timestamptz not null default now()
  )`)
  await sql.query(
    `insert into board (id, reset_on)
     values (true, $1::date)
     on conflict (id) do nothing`,
    [yangonResetOn()],
  )
}

function prepare(): Promise<void> {
  ready ??= ensureSchema(db()).catch((error: unknown) => {
    ready = null
    throw error
  })
  return ready
}

export function assertId(id: string) {
  if (!UUID.test(id)) throw new HttpError('That person could not be found.', 404)
}

export function cleanDraft(input: MemberDraft): MemberDraft {
  const name = input.name.trim()
  if (!name || name.length > 40) throw new HttpError('Enter a name up to 40 characters.', 400)
  const phone = input.phone.trim()
  const phoneMessage = phoneError(phone)
  if (phoneMessage) throw new HttpError(phoneMessage, 400)
  if (input.photo !== null && typeof input.photo !== 'string') {
    throw new HttpError('Photo must be an image.', 400)
  }
  return { name, phone, photo: input.photo }
}

export function cleanLocation(value: unknown): LocationId {
  if (typeof value === 'string' && PLACES.has(value as LocationId)) return value as LocationId
  throw new HttpError('Choose outside, the lobby, or a floor.', 400)
}

async function rowsOf(id: string): Promise<MemberRow | null> {
  const sql = db()
  const rows = await sql.query(`select * from members where id = $1::uuid`, [id])
  return (rows[0] as MemberRow | undefined) ?? null
}

export async function readBoard(): Promise<{ members: Member[]; resetOn: string }> {
  await prepare()
  const sql = db()
  const due = yangonResetOn()
  const boardRows = await sql.query(`select reset_on::text as reset_on from board where id = true`)
  const current = String((boardRows[0] as { reset_on?: string } | undefined)?.reset_on ?? '')
  if (current !== due) {
    await sql.transaction([
      sql`update members set location = 'outside', updated_at = now() where location <> 'outside'::place`,
      sql`update board set reset_on = ${due}::date, updated_at = now() where id = true`,
    ])
  }
  const memberRows = (await sql.query(
    `select * from members order by created_at asc, name asc`,
  )) as MemberRow[]
  return { members: memberRows.map(toMember), resetOn: due }
}

export async function createMember(draft: MemberDraft): Promise<Member> {
  await prepare()
  const clean = cleanDraft(draft)
  const sql = db()
  const counted = await sql.query(`select count(*)::int as count from members`)
  if (Number((counted[0] as { count: number }).count) >= 60) {
    throw new HttpError('The board already has 60 people.', 400)
  }
  const id = crypto.randomUUID()
  const photo = await resolvePhoto(id, clean.photo, null)
  const rows = (await sql.query(
    `insert into members (id, name, phone, photo_url)
     values ($1::uuid, $2, $3, $4)
     returning *`,
    [id, clean.name, clean.phone, photo],
  )) as MemberRow[]
  return toMember(rows[0])
}

export async function updateMember(
  id: string,
  patch: Partial<MemberDraft> & { location?: LocationId },
): Promise<Member> {
  await prepare()
  assertId(id)
  const current = await rowsOf(id)
  if (!current) throw new HttpError('That person is no longer on the board.', 404)
  const sql = db()

  if (patch.location) {
    const location = cleanLocation(patch.location)
    const rows = (await sql.query(
      `update members
       set location = $2::place, updated_at = now()
       where id = $1::uuid
       returning *`,
      [id, location],
    )) as MemberRow[]
    return toMember(rows[0])
  }

  const clean = cleanDraft({
    name: patch.name ?? current.name,
    phone: patch.phone ?? current.phone,
    photo: patch.photo === undefined ? current.photo_url : patch.photo,
  })
  const photo = await resolvePhoto(id, clean.photo, current.photo_url)
  const rows = (await sql.query(
    `update members
     set name = $2, phone = $3, photo_url = $4
     where id = $1::uuid
     returning *`,
    [id, clean.name, clean.phone, photo],
  )) as MemberRow[]
  return toMember(rows[0])
}

export async function deleteMember(id: string): Promise<void> {
  await prepare()
  assertId(id)
  const current = await rowsOf(id)
  if (!current) throw new HttpError('That person is no longer on the board.', 404)
  await db().query(`delete from members where id = $1::uuid`, [id])
  await removeStoredPhoto(current.photo_url)
}
