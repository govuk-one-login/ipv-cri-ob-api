import { getParameters } from '@aws-lambda-powertools/parameters/ssm'
import { ssmConfigProvider } from '@common/client/ssm-config-provider'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@aws-lambda-powertools/parameters/ssm', () => ({
  getParameters: vi.fn()
}))

const mockedGetParameters = vi.mocked(getParameters)

const PARAMETER_PATH = '/my/useful/parameters'
const PARAMETERS = { foo: 'bar', baz: 'qux' }

beforeEach(() => {
  mockedGetParameters.mockReset()
})

describe('ssm-config-provider', () => {
  describe('get', () => {
    it('requests parameters for the provided path', async () => {
      mockedGetParameters.mockResolvedValue(PARAMETERS)

      await ssmConfigProvider.get(PARAMETER_PATH)

      expect(mockedGetParameters).toHaveBeenCalledWith(
        PARAMETER_PATH,
        expect.objectContaining({ decrypt: true, maxAge: 300, recursive: true })
      )
    })

    it('returns the parameters returned by SSM', async () => {
      mockedGetParameters.mockResolvedValue(PARAMETERS)

      await expect(ssmConfigProvider.get(PARAMETER_PATH)).resolves.toEqual(PARAMETERS)
    })

    it('throws when no parameters are found', async () => {
      mockedGetParameters.mockResolvedValue(undefined)

      await expect(ssmConfigProvider.get(PARAMETER_PATH)).rejects.toThrow(
        `No parameters found at path: ${PARAMETER_PATH}`
      )
    })

    it('throws when the parameter path resolves to empty result', async () => {
      mockedGetParameters.mockResolvedValue({})

      await expect(ssmConfigProvider.get(PARAMETER_PATH)).rejects.toThrow(
        `No parameters found at path: ${PARAMETER_PATH}`
      )
    })

    it('propagates parameter store failures', async () => {
      mockedGetParameters.mockRejectedValue(new Error('SSM unavailable'))

      await expect(ssmConfigProvider.get(PARAMETER_PATH)).rejects.toThrow('SSM unavailable')
    })
  })
})
