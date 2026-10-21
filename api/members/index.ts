import { createMember } from '../lib/db.js'
import { HttpError, send, type ApiRequest, type ApiResponse } from '../lib/http.js'

export default function handler(req: ApiRequest, res: ApiResponse) {
  return send(res, async () => {
    if (req.method !== 'POST') throw new HttpError('Use POST.', 405)
    if (typeof req.body !== 'object' || req.body === null) {
      throw new HttpError('Enter a name and phone number.', 400)
    }
    const body = req.body as { name?: unknown; phone?: unknown; photo?: unknown }
    if (typeof body.name !== 'string' || typeof body.phone !== 'string') {
      throw new HttpError('Enter a name and phone number.', 400)
    }
    if (body.photo !== undefined && body.photo !== null && typeof body.photo !== 'string') {
      throw new HttpError('Photo must be an image.', 400)
    }
    return createMember({
      name: body.name,
      phone: body.phone,
      photo: typeof body.photo === 'string' ? body.photo : null,
    })
  })
}
