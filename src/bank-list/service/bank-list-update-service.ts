import type { SSMConfigProvider } from '@common/client/ssm-config-provider'
import type { EndpointProfile } from '@common/model/endpoint-profile'
import type { TokenRetrievalService } from '@govuk-one-login/cri-token-rotator'
import type { BankListRepository } from '@src/bank-list/client/bank-list-repository'
import type { BankListProvider } from '@src/bank-list/model/bank-list-provider'

import { NoUsableTokenError } from '@common/error'
import { nowSeconds } from '@common/util/time'
import { describeZodIssues } from '@common/util/zod'
import { type BankListConfig, bankListConfigSchema } from '@src/bank-list/model/bank-list-config'
import {
  emitBankListSize,
  emitBankListUpdated
} from '@src/bank-list/model/metrics/bank-list-metrics'

export interface BankListUpdateResponse {
  updated: boolean
}

export type BankListUpdateService = (options: {
  force: boolean
  profile: EndpointProfile
}) => Promise<BankListUpdateResponse>

interface BankListUpdateCollaborators {
  bankListProvider: BankListProvider
  bankListRepository: BankListRepository
  externalConfigProvider: SSMConfigProvider
  tokenRetrievalService: TokenRetrievalService<EndpointProfile>
}

interface BankListUpdateConfig {
  bankListConfigPathPrefix: string
  refreshAfterSeconds: number
}

export const createBankListUpdateService = (
  config: BankListUpdateConfig,
  collaborators: BankListUpdateCollaborators
): BankListUpdateService => {
  return async (options) => {
    const existingList = await collaborators.bankListRepository.getList(options.profile)
    const now = nowSeconds()

    if (existingList && !options.force) {
      const ageSeconds = now - existingList.refreshedAtSeconds
      if (ageSeconds < config.refreshAfterSeconds) {
        emitBankListSize({ size: existingList.banks.length, profile: options.profile })
        return { updated: false }
      }
    }

    const rawConfig = await collaborators.externalConfigProvider.get(
      `${config.bankListConfigPathPrefix}/${options.profile}`
    )
    const parsedConfig = bankListConfigSchema.safeParse(rawConfig)
    if (!parsedConfig.success) {
      throw new Error(`Invalid bank list config: ${describeZodIssues(parsedConfig.error)}`)
    }
    const bankListConfig: BankListConfig = parsedConfig.data

    const accessToken = await collaborators.tokenRetrievalService.retrieveToken(options.profile)
    if (!accessToken) throw new NoUsableTokenError(options.profile)

    const banks = await collaborators.bankListProvider.getBanks({
      accessToken,
      profile: options.profile,
      ...bankListConfig
    })

    // Note: open question on if an empty list is a valid response to be saved or if we should reject this
    await collaborators.bankListRepository.replaceList({
      profile: options.profile,
      banks,
      refreshedAtSeconds: now
    })

    emitBankListSize({ size: banks.length, profile: options.profile })
    emitBankListUpdated({ profile: options.profile })
    return { updated: true }
  }
}
