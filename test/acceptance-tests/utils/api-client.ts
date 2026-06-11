export interface ApiResponse {
  json: <T = unknown>() => T
  status: () => number
  text: () => string
}

const DEFAULT_TIMEOUT_MS = 10_000

export interface AuthenticatedClients {
  consents: ConsentsClient
  identityVerification: IdentityVerificationClient
  issueCredential: IssueCredentialClient
}

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

import type { TokenResponse } from '../../../src/types/token.js'

import { ConsentsClient } from '../clients/consents-client.js'
import { IdentityVerificationClient } from '../clients/identity-verification-client.js'
import { IssueCredentialClient } from '../clients/issue-credential-client.js'

export function createAuthenticatedClients(
  baseUrl: string,
  tokenResponse: TokenResponse
): AuthenticatedClients {
  const { access_token } = tokenResponse
  return {
    consents: new ConsentsClient(baseUrl, access_token),
    identityVerification: new IdentityVerificationClient(baseUrl, access_token),
    issueCredential: new IssueCredentialClient(baseUrl, access_token)
  }
}

export function getBaseUrl(): string {
  return process.env['API_BASE_URL'] ?? 'http://localhost:3000'
}

export function mergeHeaders(
  base: Record<string, string>,
  overrides?: RequestInit['headers']
): Record<string, string> {
  const merged = { ...base, ...(overrides as Record<string, string>) }
  return Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined))
}
