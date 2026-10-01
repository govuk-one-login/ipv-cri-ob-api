import { Sha256 } from '@aws-crypto/sha256-js'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { SignatureV4 } from '@smithy/signature-v4'

const REGION = process.env['AWS_REGION'] ?? 'eu-west-2'

const getTestHarnessExecuteUrl = (): string => {
  const url = process.env['TEST_HARNESS_URL']
  if (!url) throw new Error('TEST_HARNESS_URL is not set')
  return url
}

export interface TestHarnessOverrides {
  evidence_requested?: Record<string, unknown>
  shared_claims?: Record<string, unknown>
}

export const getJwt = async (
  overrides?: TestHarnessOverrides
): Promise<{ client_id: string; request: string }> => {
  const startFunctionUrl = new URL('start', getTestHarnessExecuteUrl())
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
      host: startFunctionUrl.hostname
    },
    hostname: startFunctionUrl.hostname,
    method: 'POST',
    path: startFunctionUrl.pathname,
    protocol: startFunctionUrl.protocol
  })

  console.log(`→ POST ${startFunctionUrl.toString()}`)
  const res = await fetch(startFunctionUrl.toString(), {
    body,
    headers: signed.headers as Record<string, string>,
    method: 'POST'
  })
  console.log(`← ${res.status} POST ${startFunctionUrl.toString()}`)

  if (!res.ok) throw new Error(`TestHarnessExecute /start failed: ${res.status}`)
  return res.json() as Promise<{ client_id: string; request: string }>
}
