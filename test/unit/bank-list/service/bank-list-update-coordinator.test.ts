import type { BankListUpdateService } from '@src/bank-list/service/bank-list-update-service'
import type { MockInstance } from 'vitest'

import { EndpointProfile } from '@common/model/endpoint-profile'
import { logger } from '@govuk-one-login/cri-logger'
import { createBankListUpdateCoordinator } from '@src/bank-list/service/bank-list-update-coordinator'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('bank-list-update-coordinator', () => {
  let bankListUpdateService: BankListUpdateService
  let infoSpy: MockInstance<typeof logger.info>
  let errorSpy: MockInstance<typeof logger.error>

  beforeEach(() => {
    bankListUpdateService = vi.fn().mockResolvedValue({ updated: false })

    infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createCoordinator = (profiles: readonly EndpointProfile[]) =>
    createBankListUpdateCoordinator({ profiles }, { bankListUpdateService })

  it('updates every enabled profile', async () => {
    const coordinator = createCoordinator([
      EndpointProfile.STUB,
      EndpointProfile.UAT,
      EndpointProfile.LIVE
    ])

    await coordinator.updateAll()

    expect(bankListUpdateService).toHaveBeenCalledTimes(3)
    expect(bankListUpdateService).toHaveBeenNthCalledWith(1, EndpointProfile.STUB)
    expect(bankListUpdateService).toHaveBeenNthCalledWith(2, EndpointProfile.UAT)
    expect(bankListUpdateService).toHaveBeenNthCalledWith(3, EndpointProfile.LIVE)
  })

  it('logs the outcome of update checks', async () => {
    vi.mocked(bankListUpdateService)
      .mockResolvedValueOnce({ updated: true })
      .mockResolvedValueOnce({ updated: false })

    const coordinator = createCoordinator([EndpointProfile.STUB, EndpointProfile.UAT])

    await coordinator.updateAll()

    expect(infoSpy).toHaveBeenCalledWith('Bank list update completed', {
      profile: EndpointProfile.STUB,
      updated: true
    })
    expect(infoSpy).toHaveBeenCalledWith('Bank list update completed', {
      profile: EndpointProfile.UAT,
      updated: false
    })
  })

  it('completes successful updates and throws after attempting all profiles when any update fails', async () => {
    vi.mocked(bankListUpdateService)
      .mockRejectedValueOnce(new Error('STUB unavailable'))
      .mockResolvedValueOnce({ updated: true })

    const coordinator = createCoordinator([EndpointProfile.STUB, EndpointProfile.UAT])

    await expect(coordinator.updateAll()).rejects.toThrow('Bank list update(s) failed for: STUB')

    expect(bankListUpdateService).toHaveBeenCalledTimes(2)
    expect(bankListUpdateService).toHaveBeenNthCalledWith(1, EndpointProfile.STUB)
    expect(bankListUpdateService).toHaveBeenNthCalledWith(2, EndpointProfile.UAT)

    expect(errorSpy).toHaveBeenCalledWith('Bank list update failed', {
      profile: EndpointProfile.STUB,
      reason: 'STUB unavailable'
    })
    expect(infoSpy).toHaveBeenCalledWith('Bank list update completed', {
      profile: EndpointProfile.UAT,
      updated: true
    })
  })

  it('throws when every enabled profile fails', async () => {
    vi.mocked(bankListUpdateService)
      .mockRejectedValueOnce(new Error('STUB unavailable'))
      .mockRejectedValueOnce(new Error('UAT unavailable'))

    const coordinator = createCoordinator([EndpointProfile.STUB, EndpointProfile.UAT])

    await expect(coordinator.updateAll()).rejects.toThrow(
      'Bank list update(s) failed for: STUB, UAT'
    )
    expect(bankListUpdateService).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalledTimes(2)
  })
})
