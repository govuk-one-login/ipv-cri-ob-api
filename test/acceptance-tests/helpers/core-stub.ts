import { Sha256 } from '@aws-crypto/sha256-js'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { SignatureV4 } from '@smithy/signature-v4'

const REGION = process.env['AWS_REGION'] ?? 'eu-west-2'

const getCoreStubUrl = (): string => {
  const url = process.env['CORE_STUB_URL']
  if (!url) throw new Error('CORE_STUB_URL is not set')
  return url
}

export interface CoreStubOverrides {
  evidence_requested?: Record<string, unknown>
  shared_claims?: Record<string, unknown>
}

export const getJwt = async (
  overrides?: CoreStubOverrides
): Promise<{ client_id: string; request: string }> => {
  const url = new URL(`${getCoreStubUrl()}start`)
  const body = JSON.stringify(overrides ?? {})

  const signer = new SignatureV4({
    credentials: fromNodeProviderChain(),
    region: REGION,
    service: 'execute-api',
    sha256: Sha256
  })

  const signed = await signer.sign({
    body,
    headers: {
      'Content-Type': 'application/json',
      host: url.hostname
    },
    hostname: url.hostname,
    method: 'POST',
    path: url.pathname,
    protocol: url.protocol
  })

  const res = await fetch(url.toString(), {
    body,
    headers: signed.headers as Record<string, string>,
    method: 'POST'
  })

  if (!res.ok) throw new Error(`Headless stub /start failed: ${res.status}`)
  return res.json() as Promise<{ client_id: string; request: string }>
}
