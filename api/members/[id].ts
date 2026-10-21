import { deleteMember, updateMember } from '../lib/db.js'
import { HttpError, queryValue, send, type ApiRequest, type ApiResponse } from '../lib/http.js'
import type { LocationId, MemberDraft } from '../../src/types'

export default function handler(req: ApiRequest, res: ApiResponse) {
  const id = queryValue(req.query?.id)
  return send(res, async () => {
    if (req.method === 'DELETE') {
      await deleteMember(id)
      return { ok: true }
    }
    if (req.method !== 'PATCH') throw new HttpError('Use PATCH or DELETE.', 405)
    if (typeof req.body !== 'object' || req.body === null) throw new HttpError('Missing changes.', 400)
    const body = req.body as Partial<MemberDraft> & { location?: LocationId }
    return updateMember(id, body)
  })
}
