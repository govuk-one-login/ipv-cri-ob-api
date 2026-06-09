import type { KMSClient, SignCommand } from '@aws-sdk/client-kms'
import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'
import type { IdentityCheckCredentialJWTClass } from '@govuk-one-login/data-vocab/credentials'

import { MessageType } from '@aws-sdk/client-kms'
import { MetricUnit } from '@govuk-one-login/cri-metrics'
import { createKmsSigner, type KmsSignerConfig } from '@src/issue-credential/client/kms-signer'
import { SigningError } from '@src/issue-credential/error'
import { joseToDer } from 'ecdsa-sig-formatter'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as criMetrics from '@govuk-one-login/cri-metrics'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetricsModule>()),
  captureMetricWithDimensions: vi.fn()
}))

const buildClaimSet = (): IdentityCheckCredentialJWTClass => ({
  exp: 1,
  iss: 'iss',
  jti: 'jti',
  nbf: 0,
  sub: 'subject-xyz',
  vc: {
    credentialSubject: {},
    evidence: [{ type: 'IdentityCheck' }],
    type: ['VerifiableCredential', 'IdentityCheckCredential']
  }
})

const buildConfig = (): KmsSignerConfig => ({
  keyID: 'test-key-id',
  vcDomain: 'ob-cri.example.test'
})

const buildDerSignature = (): Buffer =>
  joseToDer(Buffer.alloc(64, 0x01).toString('base64url'), 'ES256')

const buildMockClient = (overrides: { send: ReturnType<typeof vi.fn> }): KMSClient =>
  overrides as unknown as KMSClient

describe('kms-signer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('successfully signs a JWT', async () => {
    const send = vi.fn().mockResolvedValue({ Signature: buildDerSignature() })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    const result = await signer.sign(buildClaimSet())

    const jwtParts = result.split('.')
    expect(jwtParts).toHaveLength(3)
    expect(jwtParts.every((part) => part.length > 0)).toBe(true)
  })

  it('formats the JWT kid header as did:web with a sha256 hex encoded key ID', async () => {
    const send = vi.fn().mockResolvedValue({ Signature: buildDerSignature() })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    const result = await signer.sign(buildClaimSet())

    const [encodedHeader] = result.split('.')
    const header = JSON.parse(Buffer.from(encodedHeader!, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >

    const expectedHashedKid = createHash('sha256').update('test-key-id', 'utf8').digest('hex')
    expect(header['alg']).toBe('ES256')
    expect(header['typ']).toBe('JWT')
    expect(header['kid']).toBe(`did:web:ob-cri.example.test#${expectedHashedKid}`)
  })

  it('sends a signed JWT with MessageType RAW when the signing input is under 4096 bytes', async () => {
    const send = vi.fn().mockResolvedValue({ Signature: buildDerSignature() })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    await signer.sign(buildClaimSet())

    const [command] = send.mock.calls[0] as [SignCommand]
    expect(command.input.MessageType).toBe(MessageType.RAW)
    expect(command.input.KeyId).toBe('test-key-id')
    expect(command.input.SigningAlgorithm).toBe('ECDSA_SHA_256')
  })

  it('sends a signed JWT with MessageType DIGEST and a pre-hashed message when the signing input is 4096 bytes or larger', async () => {
    const send = vi.fn().mockResolvedValue({ Signature: buildDerSignature() })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    const largeClaimSet: IdentityCheckCredentialJWTClass = {
      ...buildClaimSet(),
      iss: 'x'.repeat(5000)
    }

    await signer.sign(largeClaimSet)

    const [command] = send.mock.calls[0] as [SignCommand]
    expect(command.input.MessageType).toBe(MessageType.DIGEST)
    expect(command.input.Message).toHaveLength(32) // sha256 digest length
  })

  it('throws when KMS sign returns no signature', async () => {
    const send = vi.fn().mockResolvedValue({ Signature: undefined })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    await expect(signer.sign(buildClaimSet())).rejects.toThrow(SigningError)
  })

  it('propagates errors thrown by KMS', async () => {
    const send = vi.fn().mockRejectedValue(new Error('KMS service unavailable'))
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    await expect(signer.sign(buildClaimSet())).rejects.toThrow('KMS service unavailable')
  })

  it('emits kms_sign_latency_ms with success result dimension when signing succeeds', async () => {
    const send = vi.fn().mockResolvedValue({ Signature: buildDerSignature() })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    await signer.sign(buildClaimSet())

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
      'kms_sign_latency_ms',
      {
        message_type: 'raw',
        result: 'success'
      },
      expect.any(Number),
      MetricUnit.Milliseconds
    )
  })

  it('emits kms_sign_latency_ms with error result when signing fails', async () => {
    const send = vi.fn().mockResolvedValue({ Signature: undefined })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))
    const largeClaimSet: IdentityCheckCredentialJWTClass = {
      ...buildClaimSet(),
      iss: 'x'.repeat(5000)
    }

    await signer.sign(largeClaimSet).catch(() => {
      /* swallow throw */
    })

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
      'kms_sign_latency_ms',
      {
        message_type: 'digest',
        result: 'error'
      },
      expect.any(Number),
      MetricUnit.Milliseconds
    )
  })
})
