import { readBoard } from './lib/db.js'
import { HttpError, send, type ApiRequest, type ApiResponse } from './lib/http.js'

export default function handler(req: ApiRequest, res: ApiResponse) {
  return send(res, async () => {
    if (req.method !== 'GET') throw new HttpError('Use GET.', 405)
    return readBoard()
  })
}
