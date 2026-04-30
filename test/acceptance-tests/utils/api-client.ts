export interface ApiResponse {
  json: <T = unknown>() => Promise<T>
  status: () => number
  text: () => Promise<string>
}

export type RequestOptions = RequestInit

const DEFAULT_TIMEOUT_MS = 10_000

export async function apiFetch(url: string, init?: RequestInit): Promise<ApiResponse> {
  let res: Response
  const signal = init?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  try {
    res = await fetch(url, { ...init, signal })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Network error calling ${init?.method ?? 'GET'} ${url}: ${message}`, {
      cause: err
    })
  }

  const rawText = await res.text()

  return {
    json: <T>() => {
      try {
        return Promise.resolve(JSON.parse(rawText) as T)
      } catch {
        throw new Error(
          `Failed to parse JSON from ${init?.method ?? 'GET'} ${url} (status ${res.status}): ${rawText.slice(0, 200)}`
        )
      }
    },
    status: () => res.status,
    text: () => Promise.resolve(rawText)
  }
}

export function getBaseUrl(): string {
  return process.env['API_BASE_URL'] ?? 'http://localhost:3000'
}
