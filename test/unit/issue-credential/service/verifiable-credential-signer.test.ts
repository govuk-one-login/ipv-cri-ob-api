import type { IdentityCheckCredentialJWTClass } from '@govuk-one-login/data-vocab/credentials'
import type { KmsSigner } from '@src/issue-credential/client/kms-signer'

import { SigningError } from '@src/issue-credential/error'
import {
  createVerifiableCredentialSigner,
  type VerifiableCredentialSignerConfig
} from '@src/issue-credential/service/verifiable-credential-signer'
import { joseToDer } from 'ecdsa-sig-formatter'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

const TEST_KEY_ID = 'test-key-id'

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

const buildVCSignerConfig = (): VerifiableCredentialSignerConfig => ({
  keyID: TEST_KEY_ID,
  vcDomain: 'ob-cri.example.test'
})

const buildDerSignature = (): Buffer =>
  joseToDer(Buffer.alloc(64, 0x01).toString('base64url'), 'ES256')

const buildKmsSigner = (sign: KmsSigner['sign']): KmsSigner => ({ sign })

describe('verifiable-credential-signer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('signs a JWT with three non-empty parts', async () => {
    const sign = vi.fn().mockResolvedValue(buildDerSignature())
    const signer = createVerifiableCredentialSigner(buildVCSignerConfig(), {
      kmsSigner: buildKmsSigner(sign)
    })

    const result = await signer.sign(buildClaimSet())

    const jwtParts = result.split('.')
    expect(jwtParts).toHaveLength(3)
    expect(jwtParts.every((part) => part.length > 0)).toBe(true)
  })

  it('formats the JWT kid header as did:web with a sha256 hex encoded key ID', async () => {
    const sign = vi.fn().mockResolvedValue(buildDerSignature())
    const signer = createVerifiableCredentialSigner(buildVCSignerConfig(), {
      kmsSigner: buildKmsSigner(sign)
    })

    const result = await signer.sign(buildClaimSet())

    const [encodedHeader] = result.split('.')
    const header = JSON.parse(Buffer.from(encodedHeader!, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >

    const expectedHashedKeyID = createHash('sha256').update(TEST_KEY_ID, 'utf8').digest('hex')
    expect(header['alg']).toBe('ES256')
    expect(header['typ']).toBe('JWT')
    expect(header['kid']).toBe(`did:web:ob-cri.example.test#${expectedHashedKeyID}`)
  })

  it('passes the JWS signing input (encoded header + payload) to the kms signer', async () => {
    const sign = vi.fn<KmsSigner['sign']>().mockResolvedValue(buildDerSignature())
    const verifiableCredentialSigner = createVerifiableCredentialSigner(buildVCSignerConfig(), {
      kmsSigner: buildKmsSigner(sign)
    })

    const result = await verifiableCredentialSigner.sign(buildClaimSet())

    const [header, payload, _signature] = result.split('.')
    const [signInput] = sign.mock.calls[0]!
    expect(signInput.toString('utf8')).toBe(`${header}.${payload}`)
  })

  it('propagates errors thrown by the kms signer', async () => {
    const sign = vi.fn().mockRejectedValue(new SigningError())
    const signer = createVerifiableCredentialSigner(buildVCSignerConfig(), {
      kmsSigner: buildKmsSigner(sign)
    })

    await expect(signer.sign(buildClaimSet())).rejects.toThrow(SigningError)
  })
})
