import type { SSMConfigProvider } from '@common/client/ssm-config-provider'
import type { BankListRepository } from '@src/bank-list/client/bank-list-repository'
import type { BankListEntity, StoredBank } from '@src/bank-list/model/bank-list'
import type { BankListProvider } from '@src/bank-list/model/bank-list-provider'

import { BanksEndpointProfile } from '@src/bank-list/model/bank-list'
import { createBankListUpdateService } from '@src/bank-list/service/bank-list-update-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW_EPOCH_SECONDS = 1_800_000_000
const REFRESH_AFTER_SECONDS = 55 * 60
const CONFIG_PATH_PREFIX = '/test/bank-list'
const ENDPOINT_URL = 'https://provider.test/banks'
const CUSTOM_LIST = 'stub-banks'

const rawRequestConfig = {
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
  profile: BanksEndpointProfile.STUB,
  ...overrides
})

describe('createBankListUpdateService', () => {
  let bankListProvider: BankListProvider
  let bankListRepository: BankListRepository
  let ssmConfigProvider: SSMConfigProvider

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

    ssmConfigProvider = {
      get: vi.fn().mockResolvedValue(rawRequestConfig)
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createService = () =>
    createBankListUpdateService(
      {
        banksRequestConfigPathPrefix: CONFIG_PATH_PREFIX,
        refreshAfterSeconds: REFRESH_AFTER_SECONDS
      },
      {
        bankListProvider,
        bankListRepository,
        ssmConfigProvider
      }
    )

  it('retrieves and stores a list when none exists', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(undefined)

    const result = await createService()(BanksEndpointProfile.STUB)

    expect(bankListRepository.getList).toHaveBeenCalledWith(BanksEndpointProfile.STUB)
    expect(ssmConfigProvider.get).toHaveBeenCalledWith(`${CONFIG_PATH_PREFIX}/STUB`)
    expect(bankListProvider.getBanks).toHaveBeenCalledWith(
      BanksEndpointProfile.STUB,
      rawRequestConfig
    )
    expect(bankListRepository.replaceList).toHaveBeenCalledWith({
      banks: oneBank,
      refreshedAtSeconds: NOW_EPOCH_SECONDS,
      profile: BanksEndpointProfile.STUB
    })
    expect(result).toEqual({ updated: true })
  })

  it('skips a list younger than the refresh threshold', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(
      buildBankListEntity({
        refreshedAtSeconds: NOW_EPOCH_SECONDS - REFRESH_AFTER_SECONDS + 1
      })
    )

    const result = await createService()(BanksEndpointProfile.STUB)

    expect(ssmConfigProvider.get).not.toHaveBeenCalled()
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

    const result = await createService()(BanksEndpointProfile.STUB)

    expect(bankListProvider.getBanks).toHaveBeenCalledWith(
      BanksEndpointProfile.STUB,
      rawRequestConfig
    )
    expect(bankListRepository.replaceList).toHaveBeenCalledWith({
      banks: oneBank,
      refreshedAtSeconds: NOW_EPOCH_SECONDS,
      profile: BanksEndpointProfile.STUB
    })
    expect(result).toEqual({ updated: true })
  })

  it('refreshes a list older than the refresh threshold', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(
      buildBankListEntity({
        refreshedAtSeconds: NOW_EPOCH_SECONDS - REFRESH_AFTER_SECONDS - 1
      })
    )

    const result = await createService()(BanksEndpointProfile.STUB)

    expect(bankListProvider.getBanks).toHaveBeenCalledWith(
      BanksEndpointProfile.STUB,
      rawRequestConfig
    )
    expect(bankListRepository.replaceList).toHaveBeenCalledWith({
      banks: oneBank,
      refreshedAtSeconds: NOW_EPOCH_SECONDS,
      profile: BanksEndpointProfile.STUB
    })
    expect(result).toEqual({ updated: true })
  })

  it('does not replace the list and preserves an exisitng list when retrieval fails', async () => {
    const existingList = buildBankListEntity({
      refreshedAtSeconds: NOW_EPOCH_SECONDS - REFRESH_AFTER_SECONDS
    })

    vi.mocked(bankListRepository.getList).mockResolvedValue(existingList)
    vi.mocked(bankListProvider.getBanks).mockRejectedValue(
      new Error('Unexpected banks response for STUB')
    )

    await expect(createService()(BanksEndpointProfile.STUB)).rejects.toThrow(
      'Unexpected banks response for STUB'
    )

    expect(bankListRepository.getList).toHaveBeenCalledWith(BanksEndpointProfile.STUB)
    expect(bankListRepository.replaceList).not.toHaveBeenCalled()
  })

  it('does not report success when replacing the list fails', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(undefined)
    vi.mocked(bankListRepository.replaceList).mockRejectedValue(
      new Error('Bank list replacement failed')
    )

    await expect(createService()(BanksEndpointProfile.STUB)).rejects.toThrow(
      'Bank list replacement failed'
    )
  })

  it('propagates ssm config provider failures', async () => {
    vi.mocked(bankListRepository.getList).mockResolvedValue(undefined)
    vi.mocked(ssmConfigProvider.get).mockRejectedValue(new Error('SSM unavailable'))

    await expect(createService()(BanksEndpointProfile.STUB)).rejects.toThrow('SSM unavailable')
    expect(bankListProvider.getBanks).not.toHaveBeenCalled()
    expect(bankListRepository.replaceList).not.toHaveBeenCalled()
  })
})
