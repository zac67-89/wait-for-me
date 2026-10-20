import { readBoard } from './lib/db'
import { HttpError, send, type ApiRequest, type ApiResponse } from './lib/http'

export default function handler(req: ApiRequest, res: ApiResponse) {
  return send(res, async () => {
    if (req.method !== 'GET') throw new HttpError('Use GET.', 405)
    return readBoard()
  })
}
