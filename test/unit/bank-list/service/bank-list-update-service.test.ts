import type { SSMConfigProvider } from '@common/client/ssm-config-provider'
import type { TokenRetrievalService } from '@lib/token-rotator/service/token-retrieval-service'
import type { BankListRepository } from '@src/bank-list/client/bank-list-repository'
import type { BankListProvider, GetBanksParams } from '@src/bank-list/model/bank-list-provider'
import type { BankListEntity, StoredBank } from '@src/bank-list/model/database/bank-list-entity'

import { NoUsableTokenError } from '@common/error'
import { EndpointProfile } from '@common/model/endpoint-profile'
import { createBankListUpdateService } from '@src/bank-list/service/bank-list-update-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ACCESS_TOKEN = 'test-access-token'
const NOW_EPOCH_SECONDS = 1_800_000_000
const REFRESH_AFTER_SECONDS = 55 * 60
const CONFIG_PATH_PREFIX = '/test/bank-list'
const ENDPOINT_URL = 'https://provider.test/banks'
const CUSTOM_LIST = 'stub-banks'

const rawBankListConfig = {
  'custom-list': CUSTOM_LIST,
  'endpoint-url': ENDPOINT_URL
}

const oneBank: StoredBank[] = [
  {
    bankId: 'example-bank',
    friendlyName: 'Example Bank',
    serviceStatus: true
  }
]

const buildBankListEntity = (overrides: Partial<BankListEntity> = {}): BankListEntity => ({
  banks: oneBank,
  refreshedAtSeconds: NOW_EPOCH_SECONDS,
  profile: EndpointProfile.STUB,
  ...overrides
})

describe('createBankListUpdateService', () => {
  let bankListProvider: BankListProvider
  let bankListRepository: BankListRepository
  let externalConfigProvider: SSMConfigProvider
  let tokenRetrievalService: TokenRetrievalService<EndpointProfile>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW_EPOCH_SECONDS * 1000)

    bankListProvider = {
      getBanks: vi.fn().mockResolvedValue(oneBank)
    }

    bankListRepository = {
      getList: vi.fn(),
      replaceList: vi.fn().mockResolvedValue(undefined)
    }

    externalConfigProvider = {
      get: vi.fn().mockResolvedValue(rawBankListConfig)
    }

    tokenRetrievalService = {
      retrieveToken: vi.fn().mockResolvedValue(ACCESS_TOKEN)
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createService = () =>
    createBankListUpdateService(
      {
        bankListConfigPathPrefix: CONFIG_PATH_PREFIX,
        refreshAfterSeconds: REFRESH_AFTER_SECONDS
      },
      {
        bankListProvider,
        bankListRepository,
        externalConfigProvider,
        tokenRetrievalService
      }
    )

  it('retrieves and stores a list when none exists', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(undefined)

    const result = await createService()(EndpointProfile.STUB)

    expect(bankListRepository.getList).toHaveBeenCalledWith(EndpointProfile.STUB)
    expect(externalConfigProvider.get).toHaveBeenCalledWith(`${CONFIG_PATH_PREFIX}/STUB`)
    expect(bankListRepository.replaceList).toHaveBeenCalledWith({
      banks: oneBank,
      refreshedAtSeconds: NOW_EPOCH_SECONDS,
      profile: EndpointProfile.STUB
    })
    expect(result).toEqual({ updated: true })
  })

  it('resolves the profile, config and token before calling the provider', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(undefined)

    await createService()(EndpointProfile.STUB)

    expect(tokenRetrievalService.retrieveToken).toHaveBeenCalledWith(EndpointProfile.STUB)
    expect(bankListProvider.getBanks).toHaveBeenCalledWith({
      accessToken: ACCESS_TOKEN,
      customList: CUSTOM_LIST,
      endpointUrl: ENDPOINT_URL,
      profile: EndpointProfile.STUB
    } satisfies GetBanksParams)
  })

  it('omits the custom list when the config does not set one', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(undefined)
    vi.mocked(externalConfigProvider.get).mockResolvedValue({ 'endpoint-url': ENDPOINT_URL })

    await createService()(EndpointProfile.STUB)

    expect(bankListProvider.getBanks).toHaveBeenCalledWith({
      accessToken: ACCESS_TOKEN,
      endpointUrl: ENDPOINT_URL,
      profile: EndpointProfile.STUB
    } satisfies GetBanksParams)
  })

  it('skips a list younger than the refresh threshold', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(
      buildBankListEntity({
        refreshedAtSeconds: NOW_EPOCH_SECONDS - REFRESH_AFTER_SECONDS + 1
      })
    )

    const result = await createService()(EndpointProfile.STUB)

    expect(externalConfigProvider.get).not.toHaveBeenCalled()
    expect(bankListProvider.getBanks).not.toHaveBeenCalled()
    expect(bankListRepository.replaceList).not.toHaveBeenCalled()
    expect(result).toEqual({ updated: false })
  })

  it('refreshes a list exactly at the refresh threshold', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(
      buildBankListEntity({
        refreshedAtSeconds: NOW_EPOCH_SECONDS - REFRESH_AFTER_SECONDS
      })
    )

    const result = await createService()(EndpointProfile.STUB)

    expect(bankListRepository.replaceList).toHaveBeenCalledWith({
      banks: oneBank,
      refreshedAtSeconds: NOW_EPOCH_SECONDS,
      profile: EndpointProfile.STUB
    })
    expect(result).toEqual({ updated: true })
  })

  it('refreshes a list older than the refresh threshold', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(
      buildBankListEntity({
        refreshedAtSeconds: NOW_EPOCH_SECONDS - REFRESH_AFTER_SECONDS - 1
      })
    )

    const result = await createService()(EndpointProfile.STUB)

    expect(bankListRepository.replaceList).toHaveBeenCalledWith({
      banks: oneBank,
      refreshedAtSeconds: NOW_EPOCH_SECONDS,
      profile: EndpointProfile.STUB
    })
    expect(result).toEqual({ updated: true })
  })

  it('does not replace the list and preserves an existing list when retrieval fails', async () => {
    const existingList = buildBankListEntity({
      refreshedAtSeconds: NOW_EPOCH_SECONDS - REFRESH_AFTER_SECONDS
    })

    vi.mocked(bankListRepository.getList).mockResolvedValue(existingList)
    vi.mocked(bankListProvider.getBanks).mockRejectedValue(
      new Error('Unexpected ecospend bank list response body')
    )

    await expect(createService()(EndpointProfile.STUB)).rejects.toThrow(
      'Unexpected ecospend bank list response body'
    )

    expect(bankListRepository.getList).toHaveBeenCalledWith(EndpointProfile.STUB)
    expect(bankListRepository.replaceList).not.toHaveBeenCalled()
  })

  it('does not report success when replacing the list fails', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(undefined)
    vi.mocked(bankListRepository.replaceList).mockRejectedValue(
      new Error('Bank list replacement failed')
    )

    await expect(createService()(EndpointProfile.STUB)).rejects.toThrow(
      'Bank list replacement failed'
    )
  })

  it('propagates external config provider failures', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(undefined)
    vi.mocked(externalConfigProvider.get).mockRejectedValue(new Error('SSM unavailable'))

    await expect(createService()(EndpointProfile.STUB)).rejects.toThrow('SSM unavailable')
    expect(bankListProvider.getBanks).not.toHaveBeenCalled()
    expect(bankListRepository.replaceList).not.toHaveBeenCalled()
  })

  describe('rejects external config', () => {
    it.each([
      ['the endpoint URL is missing', { 'custom-list': CUSTOM_LIST }],
      ['the endpoint URL is empty', { 'endpoint-url': '' }],
      ['the endpoint URL is not a URL', { 'endpoint-url': 'provider.test/banks' }],
      ['the endpoint URL has no host', { 'endpoint-url': 'https://' }],
      ['the endpoint URL is not http or https', { 'endpoint-url': 'ftp://provider.test/banks' }]
    ])('when %s', async (_description, externalConfig) => {
      vi.mocked(bankListRepository.getList).mockResolvedValue(undefined)
      vi.mocked(externalConfigProvider.get).mockResolvedValue(externalConfig)

      await expect(createService()(EndpointProfile.STUB)).rejects.toThrow(
        'Invalid bank list config: endpoint-url'
      )

      expect(bankListProvider.getBanks).not.toHaveBeenCalled()
      expect(bankListRepository.replaceList).not.toHaveBeenCalled()
    })
  })

  it('rejects when no token is available for the profile', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(undefined)
    vi.mocked(tokenRetrievalService.retrieveToken).mockResolvedValue(undefined)

    await expect(createService()(EndpointProfile.STUB)).rejects.toThrow(NoUsableTokenError)

    expect(bankListProvider.getBanks).not.toHaveBeenCalled()
    expect(bankListRepository.replaceList).not.toHaveBeenCalled()
  })
})
