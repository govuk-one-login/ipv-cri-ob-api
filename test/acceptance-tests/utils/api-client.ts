import { type APIRequestContext, request } from 'playwright'

let apiContext: APIRequestContext

export async function disposeApiContext(): Promise<void> {
  if (apiContext) {
    await apiContext.dispose()
  }
}

export async function getApiContext(): Promise<APIRequestContext> {
  if (!apiContext) {
    const baseURL = process.env['API_BASE_URL'] ?? 'http://localhost:3000'
    apiContext = await request.newContext({ baseURL })
  }
  return apiContext
}
