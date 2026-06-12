import type { KMSClient, SignCommand } from '@aws-sdk/client-kms'
import type * as CriMetricsModule from '@govuk-one-login/cri-metrics'

import { MessageType } from '@aws-sdk/client-kms'
import { MetricUnit } from '@govuk-one-login/cri-metrics'
import { createKmsSigner, type KmsSignerConfig } from '@src/issue-credential/client/kms-signer'
import { SigningError } from '@src/issue-credential/error'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as criMetrics from '@govuk-one-login/cri-metrics'

vi.mock('@govuk-one-login/cri-metrics', async (importOriginal) => ({
  ...(await importOriginal<typeof CriMetricsModule>()),
  captureMetricWithDimensions: vi.fn()
}))

const buildConfig = (): KmsSignerConfig => ({ keyID: 'test-key-id' })

const buildSignature = (): Buffer => Buffer.from('test-kms-sig-bytes')

const buildMockClient = (overrides: { send: ReturnType<typeof vi.fn> }): KMSClient =>
  overrides as unknown as KMSClient

describe('kms-signer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends a SHA-256 digest of the input with MessageType DIGEST and ECDSA_SHA_256', async () => {
    const send = vi.fn().mockResolvedValue({ Signature: buildSignature() })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))
    const input = Buffer.from('small payload', 'utf8')

    await signer.sign(input)

    const [command] = send.mock.calls[0] as [SignCommand]
    expect(command.input.KeyId).toBe('test-key-id')
    expect(command.input.SigningAlgorithm).toBe('ECDSA_SHA_256')
    expect(command.input.MessageType).toBe(MessageType.DIGEST)
    expect(command.input.Message).toEqual(createHash('sha256').update(input).digest())
  })

  it('returns the KMS signature as a Buffer', async () => {
    const signature = buildSignature()
    const send = vi.fn().mockResolvedValue({ Signature: signature })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    const result = await signer.sign(Buffer.from('payload', 'utf8'))

    expect(result).toEqual(signature)
  })

  it('throws SigningError when KMS returns no signature', async () => {
    const send = vi.fn().mockResolvedValue({ Signature: undefined })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    await expect(signer.sign(Buffer.from('payload', 'utf8'))).rejects.toThrow(SigningError)
  })

  it('propagates errors thrown by KMS', async () => {
    const send = vi.fn().mockRejectedValue(new Error('KMS service unavailable'))
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    await expect(signer.sign(Buffer.from('payload', 'utf8'))).rejects.toThrow(
      'KMS service unavailable'
    )
  })

  it('emits kms_sign_latency_ms with result=success on successful sign', async () => {
    const send = vi.fn().mockResolvedValue({ Signature: buildSignature() })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    await signer.sign(Buffer.from('payload', 'utf8'))

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
      'kms_sign_latency_ms',
      { result: 'success' },
      expect.any(Number),
      MetricUnit.Milliseconds
    )
  })

  it('emits kms_sign_latency_ms with result=error on failed sign', async () => {
    const send = vi.fn().mockResolvedValue({ Signature: undefined })
    const signer = createKmsSigner(buildConfig(), buildMockClient({ send }))

    await signer.sign(Buffer.from('payload', 'utf8')).catch(() => {
      /* swallow throw */
    })

    expect(criMetrics.captureMetricWithDimensions).toHaveBeenCalledWith(
      'kms_sign_latency_ms',
      { result: 'error' },
      expect.any(Number),
      MetricUnit.Milliseconds
    )
  })
})
