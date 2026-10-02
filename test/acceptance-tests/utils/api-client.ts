import type { TokenResponse } from '../clients/token-client'

import { IdentityVerificationClient } from '../clients/identity-verification-client'
import { IssueCredentialClient } from '../clients/issue-credential-client'

export interface ApiResponse {
  json: <T = unknown>() => T
  status: () => number
  text: () => string
}

export interface AuthenticatedClients {
  identityVerification: IdentityVerificationClient
  issueCredential: IssueCredentialClient
}

const DEFAULT_TIMEOUT_MS = 10_000

export async function apiFetch(url: string, init?: RequestInit): Promise<ApiResponse> {
  let res: Response
  const method = init?.method ?? 'GET'
  const signal = init?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  console.log(`→ ${method} ${url}`)
  try {
    res = await fetch(url, { ...init, signal })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`✗ ${method} ${url}: ${message}`)
    throw new Error(`Network error calling ${method} ${url}: ${message}`, {
      cause: err
    })
  }

  const rawText = await res.text()
  console.log(`← ${res.status} ${method} ${url}${res.status >= 400 ? ` | ${rawText}` : ''}`)

  return {
    json: <T>() => {
      try {
        return JSON.parse(rawText) as T
      } catch {
        throw new Error(
          `Failed to parse JSON from ${init?.method ?? 'GET'} ${url} (status ${res.status}): ${rawText.slice(0, 200)}`
        )
      }
    },
    status: () => res.status,
    text: () => rawText
  }
}

export function createAuthenticatedClients(
  baseUrl: string,
  tokenResponse: TokenResponse
): AuthenticatedClients {
  const { access_token } = tokenResponse
  return {
    identityVerification: new IdentityVerificationClient(baseUrl, access_token),
    issueCredential: new IssueCredentialClient(baseUrl, access_token)
  }
}

function resolveBaseUrl(name: 'PRIVATE_API_BASE_URL' | 'PUBLIC_API_BASE_URL'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

export const getPrivateBaseUrl = (): string => resolveBaseUrl('PRIVATE_API_BASE_URL')
export const getPublicBaseUrl = (): string => resolveBaseUrl('PUBLIC_API_BASE_URL')

export function mergeHeaders(
  base: Record<string, string>,
  overrides?: RequestInit['headers']
): Record<string, string> {
  const merged = { ...base, ...(overrides as Record<string, string>) }
  return Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined))
}
