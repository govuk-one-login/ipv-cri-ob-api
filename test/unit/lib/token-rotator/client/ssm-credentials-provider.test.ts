import { getParameters } from '@aws-lambda-powertools/parameters/ssm'
import { ssmCredentialsProvider } from '@lib/token-rotator/client/ssm-credentials-provider'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@aws-lambda-powertools/parameters/ssm', () => ({
  getParameters: vi.fn()
}))

const mockedGetParameters = vi.mocked(getParameters)

const PARAMETER_PATH = '/test/tokens/STUB'
const CREDENTIALS = { 'client-id': 'abc', 'client-secret': 'top-secret' } // pragma: allowlist secret

beforeEach(() => {
  mockedGetParameters.mockReset()
})

describe('ssm-credentials-provider', () => {
  describe('getCredentials', () => {
    it('requests parameters at given path with expected options', async () => {
      mockedGetParameters.mockResolvedValue(CREDENTIALS)

      await ssmCredentialsProvider.getCredentials(PARAMETER_PATH)

      expect(mockedGetParameters).toHaveBeenCalledWith(
        PARAMETER_PATH,
        expect.objectContaining({ decrypt: true, maxAge: 300, recursive: true })
      )
    })

    it('throws when no parameters are found at the path', async () => {
      mockedGetParameters.mockResolvedValue(undefined)

      await expect(ssmCredentialsProvider.getCredentials(PARAMETER_PATH)).rejects.toThrow(
        `No parameters found at path: ${PARAMETER_PATH}`
      )
    })

    it('throws when the parameter path resolves to an empty result', async () => {
      mockedGetParameters.mockResolvedValue({})

      await expect(ssmCredentialsProvider.getCredentials(PARAMETER_PATH)).rejects.toThrow(
        `No parameters found at path: ${PARAMETER_PATH}`
      )
    })
  })
})
