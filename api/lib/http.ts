export class HttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export type ApiRequest = {
  method?: string
  body?: unknown
  query?: Record<string, string | string[] | undefined>
}

export type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
}

export function queryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export async function send(res: ApiResponse, run: () => Promise<unknown>) {
  res.setHeader('cache-control', 'no-store')
  try {
    const body = await run()
    res.status(200).json(body)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Something went wrong.'
    res.status(status).json({ error: message })
  }
}
