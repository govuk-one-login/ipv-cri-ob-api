import type { IdentityCheckCredentialJWTClass } from '@govuk-one-login/data-vocab/credentials'

import { KMSClient, MessageType, SignCommand, SigningAlgorithmSpec } from '@aws-sdk/client-kms'
import { requireEnv } from '@common/util/env'
import { captureMetricWithDimensions, MetricUnit } from '@govuk-one-login/cri-metrics'
import { SigningError } from '@src/issue-credential/error'
import {
  KMS_SIGN_LATENCY_METRIC_NAME,
  KmsSignMetricDimensions,
  KmsSignResult,
  toMessageTypeDimension
} from '@src/issue-credential/model/metrics/kms-metrics'
import { derToJose } from 'ecdsa-sig-formatter'
import { createHash } from 'node:crypto'

const KMS_RAW_MESSAGE_BYTE_LIMIT = 4096

export interface KmsSigner {
  sign: (claimSet: IdentityCheckCredentialJWTClass) => Promise<string>
}

export interface KmsSignerConfig {
  keyID: string
  vcDomain: string
}

interface JwsHeader {
  alg: 'ES256'
  kid: string
  typ: 'JWT'
}

const base64url = (input: string): string => Buffer.from(input, 'utf8').toString('base64url')

const sha256 = (input: Buffer): Buffer => createHash('sha256').update(input).digest()

const buildDidKid = (keyId: string, domainName: string): string =>
  `did:web:${domainName}#${sha256(Buffer.from(keyId, 'utf8')).toString('hex')}`

const buildKmsMessage = (signingInput: Buffer) => {
  if (signingInput.length < KMS_RAW_MESSAGE_BYTE_LIMIT) {
    return { Message: signingInput, MessageType: MessageType.RAW }
  }
  return { Message: sha256(signingInput), MessageType: MessageType.DIGEST }
}

export const createKmsSigner = (config: KmsSignerConfig, client: KMSClient): KmsSigner => ({
  sign: async (claimSet) => {
    const jwsHeader: JwsHeader = {
      alg: 'ES256',
      kid: buildDidKid(config.keyID, config.vcDomain),
      typ: 'JWT'
    }

    const header = base64url(JSON.stringify(jwsHeader))
    const payload = base64url(JSON.stringify(claimSet))
    const signingInput = Buffer.from(`${header}.${payload}`, 'utf8')
    const kmsMessage = buildKmsMessage(signingInput)

    const start = performance.now()
    let result: KmsSignResult = KmsSignResult.ERROR
    try {
      const response = await client.send(
        new SignCommand({
          KeyId: config.keyID,
          SigningAlgorithm: SigningAlgorithmSpec.ECDSA_SHA_256,
          ...kmsMessage
        })
      )
      if (!response.Signature) throw new SigningError()

      const signature = derToJose(Buffer.from(response.Signature).toString('base64'), 'ES256')
      result = KmsSignResult.SUCCESS
      return `${header}.${payload}.${signature}`
    } finally {
      captureMetricWithDimensions(
        KMS_SIGN_LATENCY_METRIC_NAME,
        {
          [KmsSignMetricDimensions.MessageType]: toMessageTypeDimension(kmsMessage.MessageType),
          [KmsSignMetricDimensions.Result]: result
        },
        performance.now() - start,
        MetricUnit.Milliseconds
      )
    }
  }
})

export const kmsSigner = createKmsSigner(
  {
    keyID: requireEnv('KMS_SIGNING_KEY_ID'),
    vcDomain: requireEnv('VC_DOMAIN')
  },
  new KMSClient({})
)
