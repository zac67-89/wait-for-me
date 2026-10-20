import { del, put } from '@vercel/blob'
import { HttpError } from './http'

function isBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

export async function removeStoredPhoto(url: string | null) {
  if (!url || !isBlobUrl(url) || !process.env.BLOB_READ_WRITE_TOKEN) return
  try {
    await del(url)
  } catch {
    // The row update still proceeds when an old file is already gone.
  }
}

export async function storePhoto(id: string, dataUrl: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new HttpError('Photo storage is not configured on the server.', 500)
  }
  const compact = dataUrl.replace(/\s/g, '')
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/]+={0,2})$/i.exec(compact)
  if (!match) throw new HttpError('Use a JPEG, PNG, or WebP photo.', 400)
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.length === 0 || bytes.length > 400_000) throw new HttpError('That photo is too large.', 400)
  const contentType = match[1].toLowerCase()
  const blob = await put(`avatars/${id}`, bytes, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })
  return blob.url
}

export async function resolvePhoto(
  id: string,
  photo: string | null,
  previous: string | null,
): Promise<string | null> {
  if (photo === previous) return previous
  if (!photo) {
    await removeStoredPhoto(previous)
    return null
  }
  if (photo.startsWith('data:image/')) {
    const url = await storePhoto(id, photo)
    await removeStoredPhoto(previous)
    return url
  }
  if (isBlobUrl(photo)) return photo
  throw new HttpError('Photo must be an image from this board.', 400)
}
